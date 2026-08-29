create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists room_messages_room_created_idx on public.room_messages(room_id, created_at);
alter table public.room_messages enable row level security;
create policy "room_messages_read" on public.room_messages for select to authenticated using (
  exists (select 1 from public.rooms r where r.id = room_messages.room_id and r.kind = 'text' and private.is_community_member(r.community_id))
);
create policy "room_messages_insert" on public.room_messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.rooms r where r.id = room_messages.room_id and r.kind = 'text' and private.is_community_member(r.community_id))
);
create policy "room_messages_update_own" on public.room_messages for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());
create policy "room_messages_delete_own" on public.room_messages for delete to authenticated using (sender_id = auth.uid());
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_messages') then
    alter publication supabase_realtime add table public.room_messages;
  end if;
end $$;
