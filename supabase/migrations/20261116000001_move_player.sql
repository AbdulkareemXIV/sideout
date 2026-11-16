-- Moving a player is one operation: the open membership is closed and the new one
-- starts in the same transaction, so a failure cannot leave a player squadless.
-- Security invoker, so the row-level policies still decide who may do it.

create function public.move_player(target_player_id uuid, target_squad_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_membership public.squad_memberships;
begin
  if public.app_role() is distinct from 'director' then
    raise exception 'only the director moves players'
      using errcode = '42501';
  end if;

  select *
  into current_membership
  from public.squad_memberships
  where player_id = target_player_id
    and end_date is null;

  if current_membership.squad_id = target_squad_id then
    raise exception 'the player is already in that squad'
      using errcode = '23505';
  end if;

  if current_membership.id is not null then
    update public.squad_memberships
    set end_date = greatest(
      current_date,
      current_membership.start_date + 1
    )
    where id = current_membership.id;
  end if;

  insert into public.squad_memberships (player_id, squad_id, start_date)
  values (target_player_id, target_squad_id, current_date);
end;
$$;

grant execute on function public.move_player(uuid, uuid) to authenticated;
