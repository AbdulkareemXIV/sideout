import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { matchState, type MatchEvent, type MatchEventInput } from "@/features/match/engine";
import { statLabel } from "@/features/match/stat-labels";
import { createClient } from "@/lib/supabase/server";

export default async function MatchReportPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("Matches");
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, lineup_id, opponent_lineup_id, opponent_name, best_of, set_points, first_serve, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (!match) notFound();

  const { data: lineups } = await supabase
    .from("lineups")
    .select("id, name, positions, squads (name)")
    .in(
      "id",
      [match.lineup_id, match.opponent_lineup_id].filter(
        (lineupId): lineupId is string => Boolean(lineupId),
      ),
    );

  const ours = lineups?.find((lineup) => lineup.id === match.lineup_id);
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

  const starters = ours ? Object.values(ours.positions as Record<string, string>) : [];

  const state = matchState(events, {
    bestOf: match.best_of as 3 | 5,
    setPoints: match.set_points,
    firstServe: match.first_serve as "us" | "them",
    lineups: { us: starters },
  });

  const playerIds = Array.from(
    new Set([...starters, ...state.court.us, ...Object.keys(state.totals)]),
  );
  const { data: players } = await supabase
    .from("players")
    .select("id, full_name, jersey_number")
    .in("id", playerIds.length > 0 ? playerIds : ["00000000-0000-0000-0000-000000000000"]);
  const byId = new Map((players ?? []).map((player) => [player.id, player]));

  const label = (playerId: string) => {
    const player = byId.get(playerId);
    return player
      ? `${player.jersey_number ?? ""} ${player.full_name}`.trim()
      : t("unknownPlayer");
  };

  const totals = Object.entries(state.totals).map(([playerId, counts]) => ({
    label: label(playerId),
    stats: Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  }));

  const teamTotals = Object.entries(
    Object.values(state.totals).reduce<Record<string, number>>((acc, counts) => {
      for (const [stat, count] of Object.entries(counts)) {
        acc[stat] = (acc[stat] ?? 0) + count;
      }
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  const won = state.setsWon.us > state.setsWon.them;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${ours?.squads?.name ?? ""} vs ${opponentName}`}
        description={
          state.finished
            ? won
              ? t("reportWon", { us: state.setsWon.us, them: state.setsWon.them })
              : t("reportLost", { us: state.setsWon.us, them: state.setsWon.them })
            : t("reportInProgress")
        }
        back={{ href: `/matches/${match.id}`, label: t("backToLive") }}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("teamTotals")}</h2>
        {teamTotals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noStats")}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {teamTotals.map(([stat, count]) => `${statLabel(stat, t)} ${count}`).join(" · ")}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("sets")}</h2>
        {state.sets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSets")}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {state.sets.map((set, index) => (
              <li key={index} className="flex gap-3">
                <span className="text-muted-foreground">
                  {t("set")} {index + 1}
                </span>
                <span className="font-medium">
                  {set.us} – {set.them}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("playerTotals")}</h2>
        {totals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noStats")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {totals.map((row) => (
              <li key={row.label} className="rounded-xl border bg-card p-4">
                <p className="font-medium">{row.label}</p>
                <p className="text-sm text-muted-foreground">
                  {row.stats
                    .map(([stat, count]) => `${statLabel(stat, t)} ${count}`)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("substitutions")}</h2>
        {state.exchanges.us.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSubstitutions")}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {state.exchanges.us.map((exchange, index) => (
              <li key={index}>
                {label(exchange.out)} → {label(exchange.in)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`/${locale}/matches/${match.id}`}
        className="text-sm font-medium underline-offset-4 hover:underline"
      >
        {t("backToLive")}
      </Link>
    </div>
  );
}
