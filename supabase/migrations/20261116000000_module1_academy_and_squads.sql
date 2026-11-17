-- Module 1: the academy, the people in it, and the squads they belong to.
-- Row-level security is enabled and policy-tested in this same migration.

create type public.user_role as enum ('director', 'coach', 'player');

create type public.player_position as enum (
  'outside_hitter',
  'opposite',
  'setter',
  'middle_blocker',
  'libero',
  'defensive_specialist'
);

create type public.dominant_hand as enum ('right', 'left', 'both');

-- One academy per deployment.
create table public.academy (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  logo_url text check (logo_url is null or logo_url ~ '^https?://'),
  season_start date not null,
  season_end date not null,
  default_best_of smallint not null default 5 check (default_best_of in (3, 5)),
  default_set_points smallint not null default 25
    check (default_set_points between 1 and 99),
  created_at timestamptz not null default now(),
  constraint academy_season_order check (season_end > season_start)
);

create unique index academy_single_row on public.academy ((true));

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  username text not null unique,
  full_name text not null check (length(trim(full_name)) > 0),
  must_change_password boolean not null default true,
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'ar')),
  created_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$')
);

create table public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  age_group text not null check (length(trim(age_group)) > 0),
  created_at timestamptz not null default now()
);

create table public.coach_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  squad_id uuid not null references public.squads (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, squad_id)
);

create index coach_assignments_squad_id_idx
  on public.coach_assignments (squad_id);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null check (length(trim(full_name)) > 0),
  date_of_birth date,
  jersey_number smallint check (jersey_number between 0 and 99),
  primary_position public.player_position not null,
  secondary_position public.player_position,
  dominant_hand public.dominant_hand not null default 'right',
  height_cm smallint check (height_cm between 100 and 250),
  created_at timestamptz not null default now()
);

-- Membership is history: end_date is null while the player is in the squad.
create table public.squad_memberships (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  squad_id uuid not null references public.squads (id) on delete cascade,
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  constraint squad_memberships_date_order
    check (end_date is null or end_date > start_date)
);

create index squad_memberships_squad_id_idx
  on public.squad_memberships (squad_id);

create unique index squad_memberships_one_current
  on public.squad_memberships (player_id)
  where end_date is null;

-- Helpers. Security definer so a policy can read another table without
-- re-entering that table's policies (which would recurse).

create function public.app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.coaches_squad(target_squad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.coach_assignments ca
    where ca.squad_id = target_squad_id
      and ca.coach_id = auth.uid()
  );
$$;

create function public.own_player_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id from public.players p where p.user_id = auth.uid();
$$;

create function public.own_squad_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.squad_id
  from public.squad_memberships m
  where m.player_id = public.own_player_id()
    and m.end_date is null;
$$;

create function public.coaches_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.players p
    join public.squad_memberships m
      on m.player_id = p.id and m.end_date is null
    where p.id = target_player_id
      and public.coaches_squad(m.squad_id)
  );
$$;

create function public.coaches_player_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.players p
    where p.user_id = target_profile_id
      and public.coaches_player(p.id)
  );
$$;

alter table public.academy enable row level security;
alter table public.profiles enable row level security;
alter table public.squads enable row level security;
alter table public.coach_assignments enable row level security;
alter table public.players enable row level security;
alter table public.squad_memberships enable row level security;

-- academy: every signed-in user reads the academy; only the director edits it.
create policy academy_select_authenticated on public.academy
  for select to authenticated
  using (true);

create policy academy_update_director on public.academy
  for update to authenticated
  using (public.app_role() = 'director')
  with check (public.app_role() = 'director');

-- profiles: own row, the whole academy for the director, own-squad players for
-- a coach. Nobody inserts or deletes through the API: accounts are created by
-- the server-only account action.
create policy profiles_select_self_director_coach on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.app_role() = 'director'
    or (public.app_role() = 'coach' and public.coaches_player_profile(id))
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- The browser may only change these two columns on its own row; role, username
-- and full_name stay server-controlled.
revoke update on public.profiles from authenticated;
grant update (must_change_password, preferred_language)
  on public.profiles to authenticated;

-- squads: director sees all, a coach their assigned squads, a player their own.
create policy squads_select_scoped on public.squads
  for select to authenticated
  using (
    public.app_role() = 'director'
    or public.coaches_squad(id)
    or id = public.own_squad_id()
  );

create policy squads_insert_director on public.squads
  for insert to authenticated
  with check (public.app_role() = 'director');

create policy squads_update_director on public.squads
  for update to authenticated
  using (public.app_role() = 'director')
  with check (public.app_role() = 'director');

create policy squads_delete_director on public.squads
  for delete to authenticated
  using (public.app_role() = 'director');

-- coach_assignments: the director assigns coaches; a coach sees their own.
create policy coach_assignments_select_director_or_self
  on public.coach_assignments
  for select to authenticated
  using (public.app_role() = 'director' or coach_id = auth.uid());

create policy coach_assignments_insert_director on public.coach_assignments
  for insert to authenticated
  with check (public.app_role() = 'director');

create policy coach_assignments_delete_director on public.coach_assignments
  for delete to authenticated
  using (public.app_role() = 'director');

-- players: the director manages every player, a coach the players of their own
-- squads, a player only their own record.
create policy players_select_scoped on public.players
  for select to authenticated
  using (
    public.app_role() = 'director'
    or public.coaches_player(id)
    or user_id = auth.uid()
  );

create policy players_insert_director_or_coach on public.players
  for insert to authenticated
  with check (public.app_role() in ('director', 'coach'));

create policy players_update_director_or_coach on public.players
  for update to authenticated
  using (
    public.app_role() = 'director' or public.coaches_player(id)
  )
  with check (
    public.app_role() = 'director' or public.coaches_player(id)
  );

-- squad_memberships: coaches add players to their own squads, only the
-- director closes a membership (that is what moving a player means).
create policy squad_memberships_select_scoped on public.squad_memberships
  for select to authenticated
  using (
    public.app_role() = 'director'
    or public.coaches_squad(squad_id)
    or player_id = public.own_player_id()
  );

create policy squad_memberships_insert_director_or_coach
  on public.squad_memberships
  for insert to authenticated
  with check (
    public.app_role() = 'director' or public.coaches_squad(squad_id)
  );

create policy squad_memberships_update_director on public.squad_memberships
  for update to authenticated
  using (public.app_role() = 'director')
  with check (public.app_role() = 'director');
