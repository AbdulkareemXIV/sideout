import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  toSavedLineup,
  type PlayerOption,
  type SavedLineup,
} from "@/features/lineups/types";

export type SquadForLineups = {
  squad: { id: string; name: string };
  players: PlayerOption[];
  canManage: boolean;
};

/** The squad, its current roster and what the signed-in user may do here. */
export async function loadSquadForLineups(
  squadId: string,
): Promise<SquadForLineups> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: squad } = await supabase
    .from("squads")
    .select("id, name")
    .eq("id", squadId)
    .maybeSingle();

  if (!squad) {
    notFound();
  }

  const { data: memberships } = await supabase
    .from("squad_memberships")
    .select("player_id")
    .eq("squad_id", squad.id)
    .is("end_date", null);

  const ids = (memberships ?? []).map((row) => row.player_id);

  const { data: players } =
    ids.length > 0
      ? await supabase
          .from("players")
          .select("id, full_name, jersey_number, primary_position")
          .in("id", ids)
          .order("jersey_number")
      : { data: [] };

  return {
    squad,
    players: (players ?? []).map((player) => ({
      id: player.id,
      fullName: player.full_name,
      jerseyNumber: player.jersey_number,
      primaryPosition: player.primary_position,
    })),
    canManage: profile?.role === "director" || profile?.role === "coach",
  };
}

export async function loadLineup(
  squadId: string,
  lineupId: string,
): Promise<SavedLineup> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lineups")
    .select("id, name, system, positions, setter_ids, libero_id, receive_formations")
    .eq("id", lineupId)
    .eq("squad_id", squadId)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  return toSavedLineup(data);
}
