-- Module 2: saved lineups for the rotation planner.

create type public.lineup_system as enum ('5-1', '6-2', '4-2');

create table public.lineups (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  system public.lineup_system not null,
  -- Position number ("1" to "6") to player id, six entries, no repeats.
  positions jsonb not null check (jsonb_typeof(positions) = 'object'),
  -- One setter in 5-1, two in 6-2 and 4-2.
  setter_ids uuid[] not null
    check (cardinality(setter_ids) = case when system = '5-1' then 1 else 2 end),
  libero_id uuid references public.players (id) on delete set null,
  -- Rotation number to six { x, y } court points, for the custom receive shapes.
  receive_formations jsonb not null default '{}'::jsonb
    check (jsonb_typeof(receive_formations) = 'object'),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lineups_name_per_squad unique (squad_id, name)
);

create index lineups_squad_id_idx on public.lineups (squad_id);

alter table public.lineups enable row level security;

-- The director sees every lineup, a coach their squads, a player their own squad.
create policy lineups_select_scoped on public.lineups
  for select to authenticated
  using (
    public.app_role() = 'director'
    or public.coaches_squad(squad_id)
    or squad_id = public.own_squad_id()
  );

create policy lineups_insert_director_or_coach on public.lineups
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.app_role() = 'director' or public.coaches_squad(squad_id))
  );

create policy lineups_update_director_or_coach on public.lineups
  for update to authenticated
  using (public.app_role() = 'director' or public.coaches_squad(squad_id))
  with check (public.app_role() = 'director' or public.coaches_squad(squad_id));

create policy lineups_delete_director_or_coach on public.lineups
  for delete to authenticated
  using (public.app_role() = 'director' or public.coaches_squad(squad_id));

grant select, insert, update, delete on public.lineups to authenticated;
