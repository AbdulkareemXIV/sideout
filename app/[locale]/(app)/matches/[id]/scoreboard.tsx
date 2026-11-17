"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { finishMatch, logMatchEvent, undoLastEvent } from "@/features/match/actions";
import type { StatAction, StatResult } from "@/features/match/engine";

export type OnCourtPlayer = {
  position: number;
  playerId: string;
  label: string;
};

export function Scoreboard({
  matchId,
  onCourt,
  serving,
  score,
  sets,
  setsWon,
  rotation,
  bench,
  totals,
  status,
  canUndo,
  opponentName,
  finished,
}: {
  bench: { id: string; label: string }[];
  totals: { label: string; stats: [string, number][] }[];
  status: string;
  matchId: string;
  onCourt: OnCourtPlayer[];
  serving: "us" | "them";
  score: { us: number; them: number };
  sets: { us: number; them: number }[];
  setsWon: { us: number; them: number };
  rotation: number;
  finished: boolean;
  canUndo: boolean;
  opponentName: string;
}) {
  const t = useTranslations("Matches");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const [benchPlayer, setBenchPlayer] = useState(bench[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(t("logFailed"));
      router.refresh();
    });
  }

  function log(action: StatAction, result: StatResult) {
    if (!selected) return;
    run(() =>
      logMatchEvent(matchId, {
        type: "stat",
        team: "us",
        playerId: selected,
        action,
        result,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {t("set")} {sets.length + 1} · {t("rotation")} {rotation + 1}
          </span>
          <span className="text-sm font-medium">
            {serving === "us" ? t("weServe") : t("theyServe")}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-center gap-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t("us")}</p>
            <p className="text-5xl font-semibold tabular-nums">{score.us}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{opponentName}</p>
            <p className="text-5xl font-semibold tabular-nums">{score.them}</p>
          </div>
        </div>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          {t("sets")}: {setsWon.us} – {setsWon.them}
          {sets.length > 0
            ? ` (${sets.map((set) => `${set.us}-${set.them}`).join(", ")})`
            : ""}
        </p>
      </div>

      {finished ? (
        <div className="flex flex-col gap-4">
          <p className="text-center text-lg font-semibold">
            {setsWon.us > setsWon.them ? t("won") : t("lost")}
          </p>

          {totals.length > 0 ? (
            <ul className="flex flex-col gap-1 rounded-xl border bg-card p-4 text-sm">
              {totals.map((player) => (
                <li key={player.label} className="flex justify-between gap-4">
                  <span>{player.label}</span>
                  <span className="text-muted-foreground">
                    {player.stats.map(([key, count]) => `${key} ${count}`).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {status !== "finished" ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => run(() => finishMatch(matchId))}
            >
              {t("finishMatch")}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {onCourt.map((player) => (
              <Button
                key={player.position}
                type="button"
                variant={selected === player.playerId ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSelected(player.playerId)}
              >
                {player.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || !selected}
              onClick={() => log("attack", "kill")}
            >
              {t("kill")}
            </Button>
            <Button
              type="button"
              disabled={pending || !selected}
              onClick={() => log("serve", "ace")}
            >
              {t("ace")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !selected}
              onClick={() => log("serve", "error")}
            >
              {t("serveError")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !selected}
              onClick={() => log("attack", "error")}
            >
              {t("attackError")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !selected}
              onClick={() => log("dig", "rated")}
            >
              {t("dig")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !selected}
              onClick={() => log("reception", "rated")}
            >
              {t("reception")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !selected}
              onClick={() => log("set", "assist")}
            >
              {t("setAssist")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => logMatchEvent(matchId, { type: "opponent_point" }))}
            >
              {t("opponentPoint")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || !canUndo}
              onClick={() => run(() => undoLastEvent(matchId))}
            >
              {t("undo")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => logMatchEvent(matchId, { type: "timeout", team: "us" }))}
            >
              {t("timeout")}
            </Button>

          {bench.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={t("substitute")}
                className="h-9 rounded-lg border bg-background px-2 text-sm"
                value={benchPlayer}
                onChange={(event) => setBenchPlayer(event.target.value)}
              >
                {bench.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={pending || !selected || !benchPlayer}
                onClick={() =>
                  run(() =>
                    logMatchEvent(matchId, {
                      type: "substitution",
                      team: "us",
                      outId: selected ?? "",
                      inId: benchPlayer,
                    }),
                  )
                }
              >
                {t("substitute")}
              </Button>
            </div>
          ) : null}
          </div>
        </>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
