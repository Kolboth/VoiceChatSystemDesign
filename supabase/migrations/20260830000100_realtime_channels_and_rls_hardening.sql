-- Resonance production hardening + real community/voice-channel domain.
-- Safe to run after 20240101000000_initial_schema.sql.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Repair/complete the baseline schema first. This makes the migration safe for
-- projects where an earlier one-time SQL run stopped halfway through.
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  presence text not null default 'online' check (presence in ('online','away','dnd','offline')),
  audio_setup_complete boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles on delete cascade,
  receiver_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','blocked')),
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id)
);
alter table public.friend_requests enable row level security;

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.direct_conversations enable row level security;

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.direct_conversations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  primary key (conversation_id, user_id)
);
alter table public.conversation_members enable row level security;

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
alter table public.direct_messages enable row level security;

-- -----------------------------------------------------------------------------
-- Profiles: authenticated users can discover public profile fields; users may
-- only create/update their own profile row.
-- -----------------------------------------------------------------------------

drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_read"
on public.profiles for select to authenticated
using (true);

create policy "profiles_insert"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- -----------------------------------------------------------------------------
-- Shared authorization helpers (SECURITY DEFINER avoids recursive RLS lookups)
-- -----------------------------------------------------------------------------

create or replace function private.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_conversation_member(uuid) from public;
grant execute on function private.is_conversation_member(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Harden friend-request transitions
-- -----------------------------------------------------------------------------

drop policy if exists "fr_read" on public.friend_requests;
drop policy if exists "fr_insert" on public.friend_requests;
drop policy if exists "fr_update" on public.friend_requests;
drop policy if exists "fr_delete" on public.friend_requests;
drop policy if exists "fr_receiver_update" on public.friend_requests;
drop policy if exists "fr_sender_update" on public.friend_requests;

create policy "fr_read"
on public.friend_requests
for select
to authenticated
using ((select auth.uid()) in (sender_id, receiver_id));

create policy "fr_insert"
on public.friend_requests
for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and sender_id <> receiver_id
  and status in ('pending', 'blocked')
);

-- Only the receiver may accept/decline a pending request.
create policy "fr_receiver_update"
on public.friend_requests
for update
to authenticated
using (
  (select auth.uid()) = receiver_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = receiver_id
  and status in ('accepted', 'declined')
);

-- Only the sender may cancel a pending request.
create policy "fr_sender_update"
on public.friend_requests
for update
to authenticated
using (
  (select auth.uid()) = sender_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = sender_id
  and status = 'cancelled'
);

-- Sender may cancel/delete a pending request or unblock someone they blocked.
-- Either participant may remove an accepted friendship row.
create policy "fr_delete"
on public.friend_requests
for delete
to authenticated
using (
  (status = 'accepted' and (select auth.uid()) in (sender_id, receiver_id))
  or (status = 'pending' and (select auth.uid()) = sender_id)
  or (status = 'blocked' and (select auth.uid()) = sender_id)
  or (status in ('declined', 'cancelled') and (select auth.uid()) in (sender_id, receiver_id))
);

-- -----------------------------------------------------------------------------
-- Harden conversations/messages
-- -----------------------------------------------------------------------------

drop policy if exists "conv_read" on public.direct_conversations;
drop policy if exists "conv_insert" on public.direct_conversations;
drop policy if exists "cm_read" on public.conversation_members;
drop policy if exists "cm_insert" on public.conversation_members;
drop policy if exists "dm_read" on public.direct_messages;
drop policy if exists "dm_insert" on public.direct_messages;
drop policy if exists "dm_update" on public.direct_messages;
drop policy if exists "dm_delete" on public.direct_messages;

create policy "conv_read"
on public.direct_conversations
for select
to authenticated
using (private.is_conversation_member(id));

create policy "cm_read"
on public.conversation_members
for select
to authenticated
using (private.is_conversation_member(conversation_id));

create policy "dm_read"
on public.direct_messages
for select
to authenticated
using (private.is_conversation_member(conversation_id));

create policy "dm_insert"
on public.direct_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and private.is_conversation_member(conversation_id)
  and char_length(body) between 1 and 10000
);

create policy "dm_update"
on public.direct_messages
for update
to authenticated
using (sender_id = (select auth.uid()))
with check (
  sender_id = (select auth.uid())
  and private.is_conversation_member(conversation_id)
  and char_length(body) between 1 and 10000
);

create policy "dm_delete"
on public.direct_messages
for delete
to authenticated
using (sender_id = (select auth.uid()));

create or replace function public.create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_other_user_id is null or p_other_user_id = v_user_id then
    raise exception 'Invalid conversation participant';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_other_user_id) then
    raise exception 'User not found';
  end if;

  if not exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.sender_id = v_user_id and fr.receiver_id = p_other_user_id)
        or (fr.sender_id = p_other_user_id and fr.receiver_id = v_user_id)
      )
  ) then
    raise exception 'Users must be friends';
  end if;

  select cm.conversation_id
    into v_conversation_id
  from public.conversation_members cm
  where cm.user_id = v_user_id
    and exists (
      select 1 from public.conversation_members other
      where other.conversation_id = cm.conversation_id
        and other.user_id = p_other_user_id
    )
    and (
      select count(*)
      from public.conversation_members members
      where members.conversation_id = cm.conversation_id
    ) = 2
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.direct_conversations default values
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_conversation_id, v_user_id),
    (v_conversation_id, p_other_user_id);

  return v_conversation_id;
end;
$$;

revoke all on function public.create_direct_conversation(uuid) from public;
grant execute on function public.create_direct_conversation(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Communities + persistent voice channels
-- -----------------------------------------------------------------------------

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  icon_url text,
  icon_color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  topic text,
  kind text not null default 'voice' check (kind in ('voice', 'text', 'instant')),
  privacy text not null default 'community' check (privacy in ('public', 'community', 'invite')),
  participant_limit integer check (participant_limit is null or participant_limit between 2 and 250),
  category text not null default 'Voice rooms',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists community_members_user_idx on public.community_members(user_id);
create index if not exists rooms_community_sort_idx on public.rooms(community_id, sort_order, created_at);
create index if not exists room_members_user_idx on public.room_members(user_id);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

create or replace function private.is_community_member(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_members cm
    where cm.community_id = p_community_id
      and cm.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_manage_community(p_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_members cm
    where cm.community_id = p_community_id
      and cm.user_id = (select auth.uid())
      and cm.role in ('owner', 'admin')
  );
$$;

create or replace function private.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = p_room_id
      and rm.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_community_member(uuid) from public;
revoke all on function private.can_manage_community(uuid) from public;
revoke all on function private.is_room_member(uuid) from public;
grant execute on function private.is_community_member(uuid) to authenticated;
grant execute on function private.can_manage_community(uuid) to authenticated;
grant execute on function private.is_room_member(uuid) to authenticated;

drop policy if exists "communities_read" on public.communities;
drop policy if exists "community_members_read" on public.community_members;
drop policy if exists "rooms_read" on public.rooms;
drop policy if exists "room_members_read" on public.room_members;

create policy "communities_read"
on public.communities
for select
to authenticated
using (private.is_community_member(id));

create policy "community_members_read"
on public.community_members
for select
to authenticated
using (private.is_community_member(community_id));

create policy "rooms_read"
on public.rooms
for select
to authenticated
using (
  private.is_community_member(community_id)
  and (privacy <> 'invite' or private.is_room_member(id) or created_by = (select auth.uid()))
);

create policy "room_members_read"
on public.room_members
for select
to authenticated
using (
  exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and private.is_community_member(r.community_id)
  )
);

-- All mutations happen through audited RPCs below. No broad client insert/update
-- policy is intentionally granted for community/channel tables.

create or replace function public.create_community(
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_community_id uuid;
  v_room_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Community name is required'; end if;

  insert into public.communities (name, description, owner_id)
  values (btrim(p_name), nullif(btrim(p_description), ''), v_user_id)
  returning id into v_community_id;

  insert into public.community_members (community_id, user_id, role)
  values (v_community_id, v_user_id, 'owner');

  insert into public.rooms (community_id, created_by, name, kind, privacy, category, sort_order)
  values (v_community_id, v_user_id, 'General', 'voice', 'community', 'Voice rooms', 0)
  returning id into v_room_id;

  insert into public.room_members (room_id, user_id, added_by)
  values (v_room_id, v_user_id, v_user_id);

  return v_community_id;
end;
$$;

revoke all on function public.create_community(text, text) from public;
grant execute on function public.create_community(text, text) to authenticated;

create or replace function public.create_voice_room(
  p_community_id uuid,
  p_name text,
  p_topic text default null,
  p_privacy text default 'community',
  p_participant_limit integer default null,
  p_category text default 'Voice rooms',
  p_friend_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_friend_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not private.can_manage_community(p_community_id) then raise exception 'Not allowed to create rooms'; end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Room name is required'; end if;
  if p_privacy not in ('public', 'community', 'invite') then raise exception 'Invalid room privacy'; end if;

  insert into public.rooms (
    community_id, created_by, name, topic, kind, privacy, participant_limit, category
  ) values (
    p_community_id,
    v_user_id,
    btrim(p_name),
    nullif(btrim(p_topic), ''),
    'voice',
    p_privacy,
    p_participant_limit,
    coalesce(nullif(btrim(p_category), ''), 'Voice rooms')
  ) returning id into v_room_id;

  insert into public.room_members (room_id, user_id, added_by)
  values (v_room_id, v_user_id, v_user_id)
  on conflict do nothing;

  foreach v_friend_id in array coalesce(p_friend_ids, array[]::uuid[]) loop
    if exists (
      select 1 from public.friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.sender_id = v_user_id and fr.receiver_id = v_friend_id)
          or (fr.sender_id = v_friend_id and fr.receiver_id = v_user_id)
        )
    ) then
      insert into public.community_members (community_id, user_id, role)
      values (p_community_id, v_friend_id, 'member')
      on conflict (community_id, user_id) do nothing;

      insert into public.room_members (room_id, user_id, added_by)
      values (v_room_id, v_friend_id, v_user_id)
      on conflict (room_id, user_id) do nothing;
    end if;
  end loop;

  return v_room_id;
end;
$$;

revoke all on function public.create_voice_room(uuid, text, text, text, integer, text, uuid[]) from public;
grant execute on function public.create_voice_room(uuid, text, text, text, integer, text, uuid[]) to authenticated;

create or replace function public.invite_friends_to_room(
  p_room_id uuid,
  p_friend_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_community_id uuid;
  v_friend_id uuid;
  v_added integer := 0;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select r.community_id into v_community_id
  from public.rooms r
  where r.id = p_room_id;

  if v_community_id is null then raise exception 'Room not found'; end if;
  if not private.can_manage_community(v_community_id) then raise exception 'Not allowed to invite to this room'; end if;

  foreach v_friend_id in array coalesce(p_friend_ids, array[]::uuid[]) loop
    if exists (
      select 1 from public.friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.sender_id = v_user_id and fr.receiver_id = v_friend_id)
          or (fr.sender_id = v_friend_id and fr.receiver_id = v_user_id)
        )
    ) then
      insert into public.community_members (community_id, user_id, role)
      values (v_community_id, v_friend_id, 'member')
      on conflict (community_id, user_id) do nothing;

      insert into public.room_members (room_id, user_id, added_by)
      values (p_room_id, v_friend_id, v_user_id)
      on conflict (room_id, user_id) do nothing;

      v_added := v_added + 1;
    end if;
  end loop;

  return v_added;
end;
$$;

revoke all on function public.invite_friends_to_room(uuid, uuid[]) from public;
grant execute on function public.invite_friends_to_room(uuid, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime publication (idempotent)
-- -----------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'friend_requests',
    'direct_messages',
    'communities',
    'community_members',
    'rooms',
    'room_members'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end
$$;
