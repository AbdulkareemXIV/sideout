-- Correcting a finished match recalculates its totals, so the summary rows have
-- to be replaced as well as written.

create policy match_totals_update_director_or_coach on public.match_player_totals
  for update to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_player_totals.match_id
        and (public.app_role() = 'director' or public.coaches_squad(m.squad_id))
    )
  )
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_player_totals.match_id
        and (public.app_role() = 'director' or public.coaches_squad(m.squad_id))
    )
  );

create policy match_totals_delete_director_or_coach on public.match_player_totals
  for delete to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_player_totals.match_id
        and (public.app_role() = 'director' or public.coaches_squad(m.squad_id))
    )
  );

grant delete on public.match_player_totals to authenticated;
