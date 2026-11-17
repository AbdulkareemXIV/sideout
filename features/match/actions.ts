"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  matchState,
  undoableEvent,
  type MatchEvent,
  type MatchEventInput,
} from "./engine";

export type MatchActionResult = { error: "forbidden" | "invalidInput" | "failed" | null };

const startSchema = z.object({
  locale: z.string(),
  lineupId: z.uuid(),
  opponentLineupId: z.uuid(),
  bestOf: z.union([z.literal(3), z.literal(5)]),
  setPoints: z.number().int().min(5).max(30),
  firstServe: z.enum(["us", "them"]),
});

/** Starts a match from two of the coach's own lineups. */
export async function startMatch(input: unknown): Promise<MatchActionResult & { matchId?: string }> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { error: "invalidInput" };
  if (parsed.data.lineupId === parsed.data.opponentLineupId) return { error: "invalidInput" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "forbidden" };

  const { data: lineups } = await supabase
    .from("lineups")
    .select("id, squad_id")
    .in("id", [parsed.data.lineupId, parsed.data.opponentLineupId]);

  const ours = lineups?.find((row) => row.id === parsed.data.lineupId);
  const theirs = lineups?.find((row) => row.id === parsed.data.opponentLineupId);
  if (!ours || !theirs) return { error: "forbidden" };

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      squad_id: ours.squad_id,
      lineup_id: ours.id,
      opponent_squad_id: theirs.squad_id,
      opponent_lineup_id: theirs.id,
      best_of: parsed.data.bestOf,
      set_points: parsed.data.setPoints,
      first_serve: parsed.data.firstServe,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !match) {
    return { error: error?.code === "42501" ? "forbidden" : "failed" };
  }

  const { error: eventError } = await supabase.from("match_events").insert({
    match_id: match.id,
    seq: 1,
    type: "match_started",
    payload: {
      bestOf: parsed.data.bestOf,
      setPoints: parsed.data.setPoints,
      firstServe: parsed.data.firstServe,
      lineupId: ours.id,
      opponentLineupId: theirs.id,
    },
    created_by: user.id,
  });

  if (eventError) return { error: "failed" };

  revalidatePath(`/${parsed.data.locale}/matches`);
  redirect(`/${parsed.data.locale}/matches/${match.id}`);
}

async function append(
  matchId: string,
  event: MatchEventInput,
): Promise<MatchActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "forbidden" };

  const { data: last } = await supabase
    .from("match_events")
    .select("seq")
    .eq("match_id", matchId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("match_events").insert({
    match_id: matchId,
    seq: (last?.seq ?? 0) + 1,
    type: event.type,
    payload: event,
    created_by: user.id,
  });

  if (error) return { error: error.code === "42501" ? "forbidden" : "failed" };

  revalidatePath(`/en/matches/${matchId}`);
  revalidatePath(`/ar/matches/${matchId}`);

  return { error: null };
}

export async function logMatchEvent(
  matchId: string,
  event: MatchEventInput,
): Promise<MatchActionResult> {
  return append(matchId, event);
}

/** Undo is itself an event: it names the event it cancels. */
export async function undoLastEvent(matchId: string): Promise<MatchActionResult> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_events")
    .select("id, payload")
    .eq("match_id", matchId)
    .order("seq");

  const events: MatchEvent[] = (data ?? []).map((row) => ({
    id: row.id,
    event: row.payload as MatchEventInput,
  }));

  const target = undoableEvent(events);
  if (!target) return { error: "invalidInput" };

  return append(matchId, { type: "undo", target: target.id });
}

/** Closes a finished match and writes each player's totals once. */
export async function finishMatch(matchId: string): Promise<MatchActionResult> {
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("best_of, set_points, first_serve, lineup_id")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return { error: "invalidInput" };

  const { data: lineup } = match.lineup_id
    ? await supabase
        .from("lineups")
        .select("positions")
        .eq("id", match.lineup_id)
        .maybeSingle()
    : { data: null };

  const starters = lineup
    ? Object.values(lineup.positions as Record<string, string>)
    : [];

  const { data: rows } = await supabase
    .from("match_events")
    .select("id, payload")
    .eq("match_id", matchId)
    .order("seq");

  const events: MatchEvent[] = (rows ?? []).map((row) => ({
    id: row.id,
    event: row.payload as MatchEventInput,
  }));

  const state = matchState(events, {
    bestOf: match.best_of as 3 | 5,
    setPoints: match.set_points,
    firstServe: match.first_serve as "us" | "them",
    lineups: { us: starters },
  });

  const { error } = await supabase
    .from("matches")
    .update({ status: "finished", ended_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) return { error: error.code === "42501" ? "forbidden" : "failed" };

  const totals = Object.entries(state.totals).map(([playerId, counts]) => ({
    match_id: matchId,
    player_id: playerId,
    totals: counts,
  }));

  if (totals.length > 0) {
    const { error: totalsError } = await supabase
      .from("match_player_totals")
      .upsert(totals, { onConflict: "match_id,player_id" });

    if (totalsError) return { error: "failed" };
  }

  revalidatePath(`/en/matches/${matchId}`);
  revalidatePath(`/ar/matches/${matchId}`);

  return { error: null };
}
