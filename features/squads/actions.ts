"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import {
  coachAssignmentSchema,
  movePlayerSchema,
  playerSchema,
  squadSchema,
} from "./schemas";

export type SquadState = {
  error: "forbidden" | "invalidInput" | "failed" | null;
  created: boolean;
};

export type SquadActionState = {
  error: "forbidden" | "invalidInput" | "failed" | "sameSquad" | null;
  done: boolean;
};

const FAILED: SquadActionState = { error: "failed", done: false };

async function signedInUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function createSquad(
  locale: string,
  _previous: SquadState,
  formData: FormData,
): Promise<SquadState> {
  const userId = await signedInUserId();

  if (!userId) {
    return { error: "forbidden", created: false };
  }

  const parsed = squadSchema.safeParse({
    name: formData.get("name"),
    ageGroup: formData.get("ageGroup"),
  });

  if (!parsed.success) {
    return { error: "invalidInput", created: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("squads")
    .insert({ name: parsed.data.name, age_group: parsed.data.ageGroup })
    .select("id");

  if (error) {
    return {
      error: error.code === "42501" ? "forbidden" : "failed",
      created: false,
    };
  }

  if (!data || data.length === 0) {
    return { error: "forbidden", created: false };
  }

  revalidatePath(`/${locale}/squads`);

  return { error: null, created: true };
}

export async function addPlayer(
  locale: string,
  _previous: SquadActionState,
  formData: FormData,
): Promise<SquadActionState> {
  const userId = await signedInUserId();

  if (!userId) {
    return { error: "forbidden", done: false };
  }

  const parsed = playerSchema.safeParse({
    squadId: formData.get("squadId"),
    fullName: formData.get("fullName"),
    jerseyNumber: formData.get("jerseyNumber") ?? "",
    position: formData.get("position"),
    dominantHand: formData.get("dominantHand") ?? "right",
    dateOfBirth: formData.get("dateOfBirth") ?? "",
    heightCm: formData.get("heightCm") ?? "",
  });

  if (!parsed.success) {
    return { error: "invalidInput", done: false };
  }

  const { squadId, ...player } = parsed.data;
  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("players")
    .insert({
      full_name: player.fullName,
      jersey_number: player.jerseyNumber,
      primary_position: player.position,
      dominant_hand: player.dominantHand,
      date_of_birth: player.dateOfBirth,
      height_cm: player.heightCm,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      error: error?.code === "42501" ? "forbidden" : "failed",
      done: false,
    };
  }

  const { error: membershipError } = await supabase
    .from("squad_memberships")
    .insert({ player_id: created.id, squad_id: squadId });

  if (membershipError) {
    await supabase.from("players").delete().eq("id", created.id);

    return {
      error: membershipError.code === "42501" ? "forbidden" : "failed",
      done: false,
    };
  }

  revalidatePath(`/${locale}/squads/${squadId}`);

  return { error: null, done: true };
}

export async function assignCoach(
  locale: string,
  _previous: SquadActionState,
  formData: FormData,
): Promise<SquadActionState> {
  const userId = await signedInUserId();

  if (!userId) {
    return { error: "forbidden", done: false };
  }

  const parsed = coachAssignmentSchema.safeParse({
    squadId: formData.get("squadId"),
    coachId: formData.get("coachId"),
  });

  if (!parsed.success) {
    return { error: "invalidInput", done: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("coach_assignments").insert({
    coach_id: parsed.data.coachId,
    squad_id: parsed.data.squadId,
  });

  if (error) {
    return {
      error: error.code === "42501" ? "forbidden" : "failed",
      done: false,
    };
  }

  revalidatePath(`/${locale}/squads/${parsed.data.squadId}`);

  return { error: null, done: true };
}

export async function unassignCoach(
  locale: string,
  _previous: SquadActionState,
  formData: FormData,
): Promise<SquadActionState> {
  const userId = await signedInUserId();

  if (!userId) {
    return { error: "forbidden", done: false };
  }

  const parsed = coachAssignmentSchema.safeParse({
    squadId: formData.get("squadId"),
    coachId: formData.get("coachId"),
  });

  if (!parsed.success) {
    return { error: "invalidInput", done: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("coach_assignments")
    .delete()
    .eq("squad_id", parsed.data.squadId)
    .eq("coach_id", parsed.data.coachId);

  if (error) {
    return {
      error: error.code === "42501" ? "forbidden" : "failed",
      done: false,
    };
  }

  revalidatePath(`/${locale}/squads/${parsed.data.squadId}`);

  return { error: null, done: true };
}

export async function movePlayer(
  locale: string,
  _previous: SquadActionState,
  formData: FormData,
): Promise<SquadActionState> {
  const userId = await signedInUserId();

  if (!userId) {
    return { error: "forbidden", done: false };
  }

  const parsed = movePlayerSchema.safeParse({
    playerId: formData.get("playerId"),
    squadId: formData.get("squadId"),
  });

  if (!parsed.success) {
    return { error: "invalidInput", done: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_player", {
    target_player_id: parsed.data.playerId,
    target_squad_id: parsed.data.squadId,
  });

  if (error) {
    if (error.code === "42501") {
      return { error: "forbidden", done: false };
    }

    if (error.code === "23505") {
      return { error: "sameSquad", done: false };
    }

    return FAILED;
  }

  revalidatePath(`/${locale}/squads`);
  revalidatePath(`/${locale}/squads/${parsed.data.squadId}`);

  return { error: null, done: true };
}
