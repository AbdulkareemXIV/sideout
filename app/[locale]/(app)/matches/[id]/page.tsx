import Link from "next/link";
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
    .select("id, squad_id, name, system, positions, libero_id, squads (name)")
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

  const arrangement = ours.positions as Arrangement;
  const positions = (Object.keys(arrangement) as unknown as Position[]).sort(
    (a, b) => Number(a) - Number(b),
  );
  const starters = positions.map((position) => arrangement[position]);

  const config = {
    bestOf: match.best_of as 3 | 5,
    setPoints: match.set_points,
    firstServe: match.first_serve as "us" | "them",
    lineups: { us: starters },
  };

  const state = matchState(events, config);

  const current = rotations(arrangement)[state.rotation.us] ?? arrangement;
  const playerIds = Array.from(new Set([...starters, ...state.court.us]));
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

  const court = state.court.us.length === 6 ? state.court.us : positions.map((position) => current[position]);

  const onCourt: OnCourtPlayer[] = positions.map((position, index) => ({
    position: Number(position),
    playerId: court[index]!,
    label: label(court[index]!),
  }));

  const libero =
    ours.libero_id && !playerIds.includes(ours.libero_id)
      ? { id: ours.libero_id, label: label(ours.libero_id) }
      : null;

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
        starters={starters}
        court={state.court.us}
        exchanges={state.exchanges.us}
        subsUsed={state.substitutions.us}
        libero={libero}
        totals={totals}
        status={match.status}
        serverId={state.court.us[0] ?? null}
        serverLabel={state.court.us[0] ? label(state.court.us[0]) : null}
        opponentName={opponentName}
        canUndo={canUndo(events)}
      />

      <Link
        href={`/matches/${match.id}/report`}
        className="text-sm font-medium underline-offset-4 hover:underline"
      >
        {t("report")}
      </Link>
    </div>
  );
}
