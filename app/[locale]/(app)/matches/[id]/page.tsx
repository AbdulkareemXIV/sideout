import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { canUndo, matchState, type MatchEvent, type MatchEventInput } from "@/features/match/engine";
import { rotations, type Arrangement, type Position } from "@/features/lineups/engine";
import { createClient } from "@/lib/supabase/server";

import { Scoreboard, type OnCourtPlayer } from "./scoreboard";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Matches");
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, squad_id, lineup_id, opponent_lineup_id, opponent_name, best_of, set_points, first_serve, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (!match) notFound();

  const { data: lineups } = await supabase
    .from("lineups")
    .select("id, squad_id, name, system, positions, squads (name)")
    .in(
      "id",
      [match.lineup_id, match.opponent_lineup_id].filter(
        (lineupId): lineupId is string => Boolean(lineupId),
      ),
    );

  const ours = lineups?.find((lineup) => lineup.id === match.lineup_id);
  if (!ours) notFound();

  const theirs = lineups?.find((lineup) => lineup.id === match.opponent_lineup_id);
  const opponentName = theirs
    ? `${theirs.squads?.name ?? ""} ${theirs.name}`.trim()
    : (match.opponent_name ?? t("opponent"));

  const { data: rows } = await supabase
    .from("match_events")
    .select("id, payload")
    .eq("match_id", match.id)
    .order("seq");

  const events: MatchEvent[] = (rows ?? []).map((row) => ({
    id: row.id,
    event: row.payload as MatchEventInput,
  }));

  const config = {
    bestOf: match.best_of as 3 | 5,
    setPoints: match.set_points,
    firstServe: match.first_serve as "us" | "them",
  };

  const state = matchState(events, config);

  const arrangement = ours.positions as Arrangement;
  const current = rotations(arrangement)[state.rotation.us] ?? arrangement;
  const playerIds = Object.values(current);

  const { data: players } = await supabase
    .from("players")
    .select("id, full_name, jersey_number")
    .in("id", playerIds);
  const byId = new Map((players ?? []).map((player) => [player.id, player]));

  const { data: members } = await supabase
    .from("squad_memberships")
    .select("players (id, full_name, jersey_number)")
    .eq("squad_id", ours.squad_id)
    .is("end_date", null);

  const squadPlayers = (members ?? [])
    .map((member) => member.players)
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  const label = (playerId: string) => {
    const player =
      squadPlayers.find((row) => row.id === playerId) ?? byId.get(playerId);
    return player
      ? `${player.jersey_number ?? ""} ${player.full_name}`.trim()
      : t("unknownPlayer");
  };

  const bench = squadPlayers
    .filter((player) => !playerIds.includes(player.id))
    .map((player) => ({ id: player.id, label: label(player.id) }));

  const totals = Object.entries(state.totals).map(([playerId, counts]) => ({
    label: label(playerId),
    stats: Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  }));

  const onCourt: OnCourtPlayer[] = (Object.keys(current) as unknown as Position[])
    .sort((a, b) => Number(a) - Number(b))
    .map((position) => {
      const player = byId.get(current[position]);
      return {
        position: Number(position),
        playerId: current[position],
        label: player
          ? `${player.jersey_number ?? ""} ${player.full_name}`.trim()
          : t("unknownPlayer"),
      };
    });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${ours.squads?.name ?? ""} vs ${opponentName}`}
        description={`${t("bestOfShort", { count: config.bestOf })} · ${t("toPoints", {
          points: config.setPoints,
        })}`}
        back={{ href: "/matches", label: t("back") }}
      />

      <Scoreboard
        matchId={match.id}
        onCourt={onCourt}
        serving={state.serving}
        score={state.score}
        finished={state.finished}
        sets={state.sets}
        setsWon={state.setsWon}
        rotation={state.rotation.us}
        bench={bench}
        totals={totals}
        status={match.status}
        canUndo={canUndo(events)}
        opponentName={opponentName}
      />
    </div>
  );
}
