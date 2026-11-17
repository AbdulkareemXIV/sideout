"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { validateLineup, type LineupProblem } from "./engine";
import { lineupSchema } from "./schemas";

export type SaveLineupState = {
  error:
    | "forbidden"
    | "invalidInput"
    | "duplicateName"
    | "failed"
    | null;
  problems?: LineupProblem[];
  saved: boolean;
};

export async function saveLineup(
  locale: string,
  input: unknown,
): Promise<SaveLineupState> {
  const parsed = lineupSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "invalidInput", saved: false };
  }

  const lineup = parsed.data;
  const problems = validateLineup({
    system: lineup.system,
    positions: lineup.positions,
    setterIds: lineup.setterIds,
    liberoId: lineup.liberoId,
  });

  if (problems.length > 0) {
    return { error: "invalidInput", problems, saved: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "forbidden", saved: false };
  }

  const row = {
    name: lineup.name,
    system: lineup.system,
    positions: lineup.positions,
    setter_ids: lineup.setterIds,
    libero_id: lineup.liberoId,
    receive_formations: lineup.receiveFormations,
    updated_at: new Date().toISOString(),
  };

  const { error } = lineup.lineupId
    ? await supabase.from("lineups").update(row).eq("id", lineup.lineupId)
    : await supabase
        .from("lineups")
        .insert({ ...row, squad_id: lineup.squadId, created_by: user.id });

  if (error) {
    if (error.code === "42501") {
      return { error: "forbidden", saved: false };
    }

    if (error.code === "23505") {
      return { error: "duplicateName", saved: false };
    }

    if (error.code === "23514") {
      return { error: "invalidInput", saved: false };
    }

    return { error: "failed", saved: false };
  }

  revalidatePath(`/${locale}/squads/${lineup.squadId}/lineups`);
  revalidatePath(`/${locale}/squads/${lineup.squadId}`);

  return { error: null, saved: true };
}

export async function deleteLineup(
  locale: string,
  squadId: string,
  lineupId: string,
): Promise<{ error: "forbidden" | "failed" | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "forbidden" };
  }

  const { error } = await supabase
    .from("lineups")
    .delete()
    .eq("id", lineupId)
    .eq("squad_id", squadId);

  if (error) {
    return { error: error.code === "42501" ? "forbidden" : "failed" };
  }

  revalidatePath(`/${locale}/squads/${squadId}/lineups`);
  revalidatePath(`/${locale}/squads/${squadId}`);

  return { error: null };
}
