-- Module 3: match mode. A match's state is an append-only log of events;
-- scores, rotations and serving are derived by replaying it.

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  -- Our side. The opponent is another squad in the academy (its lineup) or a
  -- team outside it, named by hand.
  squad_id uuid not null references public.squads (id) on delete cascade,
  lineup_id uuid not null references public.lineups (id) on delete restrict,
  opponent_squad_id uuid references public.squads (id) on delete set null,
  opponent_lineup_id uuid references public.lineups (id) on delete set null,
  opponent_name text,
  best_of smallint not null default 3 check (best_of in (3, 5)),
  set_points smallint not null default 25 check (set_points between 5 and 30),
  first_serve text not null default 'us' check (first_serve in ('us', 'them')),
  status text not null default 'live' check (status in ('live', 'finished')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint matches_opponent_named check (
    opponent_lineup_id is not null
    or opponent_squad_id is not null
    or char_length(btrim(coalesce(opponent_name, ''))) > 0
  )
);

create index matches_squad_id_idx on public.matches (squad_id);
create index matches_created_at_idx on public.matches (created_at desc);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  seq integer not null check (seq > 0),
  type text not null check (
    type in ('match_started', 'stat', 'opponent_point', 'substitution', 'timeout', 'undo')
  ),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint match_events_seq unique (match_id, seq)
);

create index match_events_match_seq_idx on public.match_events (match_id, seq);

create table public.match_player_totals (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  totals jsonb not null default '{}'::jsonb
    check (jsonb_typeof(totals) = 'object'),
  primary key (match_id, player_id)
);

alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.match_player_totals enable row level security;

-- The director sees every match, a coach their squads, a player their own squad.
create policy matches_select_scoped on public.matches
  for select to authenticated
  using (
    public.app_role() = 'director'
    or public.coaches_squad(squad_id)
    or squad_id = public.own_squad_id()
  );

create policy matches_insert_director_or_coach on public.matches
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.app_role() = 'director' or public.coaches_squad(squad_id))
  );

create policy matches_update_director_or_coach on public.matches
  for update to authenticated
  using (public.app_role() = 'director' or public.coaches_squad(squad_id))
  with check (public.app_role() = 'director' or public.coaches_squad(squad_id));

create policy matches_delete_director_or_coach on public.matches
  for delete to authenticated
  using (public.app_role() = 'director' or public.coaches_squad(squad_id));

create policy match_events_select_scoped on public.match_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_events.match_id
        and (
          public.app_role() = 'director'
          or public.coaches_squad(m.squad_id)
          or m.squad_id = public.own_squad_id()
        )
    )
  );

create policy match_events_insert_director_or_coach on public.match_events
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = match_events.match_id
        and (public.app_role() = 'director' or public.coaches_squad(m.squad_id))
    )
  );

create policy match_totals_select_scoped on public.match_player_totals
  for select to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_player_totals.match_id
        and (
          public.app_role() = 'director'
          or public.coaches_squad(m.squad_id)
          or m.squad_id = public.own_squad_id()
        )
    )
  );

create policy match_totals_write_director_or_coach on public.match_player_totals
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_player_totals.match_id
        and (public.app_role() = 'director' or public.coaches_squad(m.squad_id))
    )
  );

grant select, insert, update, delete on public.matches to authenticated;
grant select, insert on public.match_events to authenticated;
grant select, insert, update on public.match_player_totals to authenticated;
