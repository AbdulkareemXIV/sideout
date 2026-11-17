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
  type MatchState,
} from "./engine";

type Client = Awaited<ReturnType<typeof createClient>>;

/** PostgREST reports a missing table as PGRST205; Postgres as 42P01. */
function failureCode(error: { code?: string }): "forbidden" | "notReady" | "failed" {
  if (error.code === "PGRST205" || error.code === "42P01") return "notReady";
  if (error.code === "42501") return "forbidden";
  return "failed";
}

export type MatchActionResult = {
  error: "forbidden" | "invalidInput" | "notReady" | "failed" | null;
};

const startSchema = z
  .object({
    locale: z.string(),
    lineupId: z.uuid(),
    opponentLineupId: z.uuid().optional(),
    opponentName: z.string().trim().min(1).max(80).optional(),
    bestOf: z.union([z.literal(3), z.literal(5)]),
    setPoints: z.number().int().min(5).max(30),
    firstServe: z.enum(["us", "them"]),
  })
  .refine((input) => Boolean(input.opponentLineupId) !== Boolean(input.opponentName), {
    message: "The opponent is either another lineup or a name.",
  });

/**
 * Starts a match from one of the coach's lineups against another lineup in the
 * academy, or against an outside team named by hand.
 */
export async function startMatch(input: unknown): Promise<MatchActionResult & { matchId?: string }> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { error: "invalidInput" };

  const { locale, lineupId, opponentLineupId, opponentName } = parsed.data;
  if (opponentLineupId === lineupId) return { error: "invalidInput" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "forbidden" };

  const { data: lineups } = await supabase
    .from("lineups")
    .select("id, squad_id")
    .in("id", opponentLineupId ? [lineupId, opponentLineupId] : [lineupId]);

  const ours = lineups?.find((row) => row.id === lineupId);
  if (!ours) return { error: "forbidden" };

  const theirs = opponentLineupId
    ? lineups?.find((row) => row.id === opponentLineupId)
    : undefined;
  if (opponentLineupId && !theirs) return { error: "forbidden" };

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      squad_id: ours.squad_id,
      lineup_id: ours.id,
      opponent_squad_id: theirs?.squad_id ?? null,
      opponent_lineup_id: theirs?.id ?? null,
      opponent_name: theirs ? null : opponentName,
      best_of: parsed.data.bestOf,
      set_points: parsed.data.setPoints,
      first_serve: parsed.data.firstServe,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !match) {
    if (error) console.error("startMatch: the match could not be created", error);

    return { error: failureCode(error ?? {}) };
  }

  const { error: eventError } = await supabase.from("match_events").insert({
    match_id: match.id,
    seq: 1,
    type: "match_started",
    payload: {
      type: "match_started",
      bestOf: parsed.data.bestOf,
      setPoints: parsed.data.setPoints,
      firstServe: parsed.data.firstServe,
      lineupId: ours.id,
      ...(theirs ? { opponentLineupId: theirs.id } : {}),
    },
    created_by: user.id,
  });

  if (eventError) {
    console.error("startMatch: the start event could not be written", eventError);

    return { error: failureCode(eventError) };
  }

  revalidatePath(`/${locale}/matches`);
  redirect(`/${locale}/matches/${match.id}`);
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

  if (error) {
    console.error("logMatchEvent: the event could not be written", error);

    return { error: failureCode(error) };
  }

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

  const undone = await append(matchId, { type: "undo", target: target.id });
  if (undone.error) return undone;

  // A closed match's totals are a summary of its log, so correcting the log
  // has to rewrite them.
  const { data: match } = await supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();

  if (match?.status !== "finished") return { error: null };

  return recalculateMatchTotals(matchId);
}

/** Replays a match's log against the format and lineup stored on its row. */
async function replayMatch(
  supabase: Client,
  matchId: string,
): Promise<MatchState | null> {
  const { data: match } = await supabase
    .from("matches")
    .select("best_of, set_points, first_serve, lineup_id")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return null;

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

  return matchState(events, {
    bestOf: match.best_of as 3 | 5,
    setPoints: match.set_points,
    firstServe: match.first_serve as "us" | "them",
    lineups: { us: starters },
  });
}

/** Replaces a match's per-player totals with the ones the log now produces. */
async function writeTotals(
  supabase: Client,
  matchId: string,
  state: MatchState,
): Promise<MatchActionResult> {
  const totals = Object.entries(state.totals).map(([playerId, counts]) => ({
    match_id: matchId,
    player_id: playerId,
    totals: counts,
  }));

  if (totals.length > 0) {
    const { error } = await supabase
      .from("match_player_totals")
      .upsert(totals, { onConflict: "match_id,player_id" });

    if (error) {
      console.error("writeTotals: the player totals could not be written", error);

      return { error: failureCode(error) };
    }
  }

  // A correction can take every stat away from a player, so the rows the log no
  // longer produces have to go.
  const playerIds = totals.map((row) => row.player_id);
  const { error: staleError } =
    playerIds.length > 0
      ? await supabase
          .from("match_player_totals")
          .delete()
          .eq("match_id", matchId)
          .not("player_id", "in", `(${playerIds.join(",")})`)
      : await supabase
          .from("match_player_totals")
          .delete()
          .eq("match_id", matchId);

  if (staleError) {
    console.error("writeTotals: the stale totals could not be removed", staleError);

    return { error: failureCode(staleError) };
  }

  return { error: null };
}

/** Closes a finished match and writes each player's totals. */
export async function finishMatch(matchId: string): Promise<MatchActionResult> {
  const supabase = await createClient();

  const state = await replayMatch(supabase, matchId);
  if (!state) return { error: "invalidInput" };

  const { error } = await supabase
    .from("matches")
    .update({ status: "finished", ended_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) {
    console.error("finishMatch: the match could not be closed", error);

    return { error: failureCode(error) };
  }

  const written = await writeTotals(supabase, matchId, state);
  if (written.error) return written;

  revalidatePath(`/en/matches/${matchId}`);
  revalidatePath(`/ar/matches/${matchId}`);

  return { error: null };
}

/**
 * Rewrites a finished match's totals from its log, and reopens the match when
 * the corrected log no longer ends it.
 */
export async function recalculateMatchTotals(
  matchId: string,
): Promise<MatchActionResult> {
  const supabase = await createClient();

  const state = await replayMatch(supabase, matchId);
  if (!state) return { error: "invalidInput" };

  const written = await writeTotals(supabase, matchId, state);
  if (written.error) return written;

  const { error } = await supabase
    .from("matches")
    .update(
      state.finished
        ? { status: "finished" }
        : { status: "live", ended_at: null },
    )
    .eq("id", matchId);

  if (error) {
    console.error("recalculateMatchTotals: the status could not be updated", error);

    return { error: failureCode(error) };
  }

  revalidatePath(`/en/matches/${matchId}`);
  revalidatePath(`/ar/matches/${matchId}`);

  return { error: null };
}
