-- Resonance Phase C/D: unified LiveKit transport + durable direct-call signalling.
-- Apply after 20260830000100_realtime_channels_and_rls_hardening.sql.

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  room_name text not null unique,
  status text not null default 'ringing'
    check (status in ('ringing','accepted','connected','ended','declined','missed','cancelled','failed')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  connected_at timestamptz,
  ended_at timestamptz,
  constraint direct_call_not_self check (caller_id <> callee_id)
);

create index if not exists call_sessions_caller_created_idx
  on public.call_sessions(caller_id, created_at desc);
create index if not exists call_sessions_callee_created_idx
  on public.call_sessions(callee_id, created_at desc);
create index if not exists call_sessions_status_created_idx
  on public.call_sessions(status, created_at desc);

alter table public.call_sessions enable row level security;

create or replace function private.is_friend(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.sender_id = p_user_a and fr.receiver_id = p_user_b)
        or (fr.sender_id = p_user_b and fr.receiver_id = p_user_a)
      )
  );
$$;

create or replace function private.is_call_participant(p_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.call_sessions cs
    where cs.id = p_call_id
      and (select auth.uid()) in (cs.caller_id, cs.callee_id)
  );
$$;

revoke all on function private.is_friend(uuid, uuid) from public;
revoke all on function private.is_call_participant(uuid) from public;
grant execute on function private.is_friend(uuid, uuid) to authenticated;
grant execute on function private.is_call_participant(uuid) to authenticated;

drop policy if exists "call_sessions_read" on public.call_sessions;
create policy "call_sessions_read"
on public.call_sessions
for select
to authenticated
using ((select auth.uid()) in (caller_id, callee_id));

-- Mutations are intentionally RPC-only. This keeps the state machine and
-- friendship checks on the database side instead of trusting the browser.

create or replace function public.start_direct_call(p_friend_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_call_id uuid := gen_random_uuid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_friend_id is null or p_friend_id = v_user_id then raise exception 'Invalid call recipient'; end if;
  if not private.is_friend(v_user_id, p_friend_id) then raise exception 'Direct calls are limited to friends'; end if;

  -- Avoid accidentally creating multiple ringing calls to the same friend.
  if exists (
    select 1 from public.call_sessions cs
    where cs.status in ('ringing','accepted','connected')
      and (
        (cs.caller_id = v_user_id and cs.callee_id = p_friend_id)
        or (cs.caller_id = p_friend_id and cs.callee_id = v_user_id)
      )
      and cs.created_at > now() - interval '2 minutes'
  ) then
    raise exception 'A call with this friend is already active';
  end if;

  insert into public.call_sessions (id, caller_id, callee_id, room_name, status)
  values (v_call_id, v_user_id, p_friend_id, 'direct-' || v_call_id::text, 'ringing');

  return v_call_id;
end;
$$;

revoke all on function public.start_direct_call(uuid) from public;
grant execute on function public.start_direct_call(uuid) to authenticated;

create or replace function public.respond_to_direct_call(
  p_call_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_call public.call_sessions%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_call
  from public.call_sessions
  where id = p_call_id
  for update;

  if v_call.id is null then raise exception 'Call not found'; end if;
  if v_call.callee_id <> v_user_id then raise exception 'Only the recipient can respond to this call'; end if;
  if v_call.status <> 'ringing' then raise exception 'Call is no longer ringing'; end if;

  if p_accept then
    update public.call_sessions
    set status = 'accepted', accepted_at = now()
    where id = p_call_id;
  else
    update public.call_sessions
    set status = 'declined', ended_at = now()
    where id = p_call_id;
  end if;
end;
$$;

revoke all on function public.respond_to_direct_call(uuid, boolean) from public;
grant execute on function public.respond_to_direct_call(uuid, boolean) to authenticated;

create or replace function public.mark_direct_call_connected(p_call_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not private.is_call_participant(p_call_id) then raise exception 'Not a participant in this call'; end if;

  update public.call_sessions
  set status = 'connected',
      connected_at = coalesce(connected_at, now())
  where id = p_call_id
    and status in ('accepted','connected');
end;
$$;

revoke all on function public.mark_direct_call_connected(uuid) from public;
grant execute on function public.mark_direct_call_connected(uuid) to authenticated;

create or replace function public.finish_direct_call(
  p_call_id uuid,
  p_status text default 'ended'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not private.is_call_participant(p_call_id) then raise exception 'Not a participant in this call'; end if;
  if p_status not in ('ended','missed','cancelled','failed') then raise exception 'Invalid final call state'; end if;

  update public.call_sessions
  set status = p_status,
      ended_at = coalesce(ended_at, now())
  where id = p_call_id
    and status not in ('ended','declined','missed','cancelled','failed');
end;
$$;

revoke all on function public.finish_direct_call(uuid, text) from public;
grant execute on function public.finish_direct_call(uuid, text) to authenticated;

-- Realtime signalling for incoming calls and call-state transitions.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'call_sessions'
  ) then
    alter publication supabase_realtime add table public.call_sessions;
  end if;
end
$$;
