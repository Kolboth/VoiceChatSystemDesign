-- profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  presence text not null default 'online'
    check (presence in ('online','away','dnd','offline')),
  audio_setup_complete boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- friend_requests
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles on delete cascade,
  receiver_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','cancelled','blocked')),
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id)
);
alter table public.friend_requests enable row level security;
create policy "fr_read"   on public.friend_requests for select to authenticated using (auth.uid() in (sender_id, receiver_id));
create policy "fr_insert" on public.friend_requests for insert to authenticated with check (auth.uid() = sender_id);
create policy "fr_update" on public.friend_requests for update to authenticated using (auth.uid() in (sender_id, receiver_id));
create policy "fr_delete" on public.friend_requests for delete to authenticated using (auth.uid() in (sender_id, receiver_id));

-- direct_conversations
create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.direct_conversations enable row level security;
create policy "conv_read" on public.direct_conversations for select to authenticated
  using (exists (
    select 1 from public.conversation_members
    where conversation_id = id and user_id = auth.uid()
  ));
create policy "conv_insert" on public.direct_conversations for insert to authenticated with check (true);

-- conversation_members
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.direct_conversations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  primary key (conversation_id, user_id)
);
alter table public.conversation_members enable row level security;
create policy "cm_read" on public.conversation_members for select to authenticated
  using (conversation_id in (
    select conversation_id from public.conversation_members where user_id = auth.uid()
  ));
create policy "cm_insert" on public.conversation_members for insert to authenticated with check (true);

-- direct_messages
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
alter table public.direct_messages enable row level security;
create policy "dm_read" on public.direct_messages for select to authenticated
  using (exists (
    select 1 from public.conversation_members
    where conversation_id = direct_messages.conversation_id and user_id = auth.uid()
  ));
create policy "dm_insert" on public.direct_messages for insert to authenticated
  with check (auth.uid() = sender_id and exists (
    select 1 from public.conversation_members
    where conversation_id = direct_messages.conversation_id and user_id = auth.uid()
  ));
create policy "dm_update" on public.direct_messages for update to authenticated using (auth.uid() = sender_id);
create policy "dm_delete" on public.direct_messages for delete to authenticated using (auth.uid() = sender_id);

alter publication supabase_realtime add table public.direct_messages;
