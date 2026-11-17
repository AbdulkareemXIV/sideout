"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { startMatch } from "@/features/match/actions";

export type LineupOption = {
  id: string;
  name: string;
  squadName: string;
};

export function MatchSetupForm({
  locale,
  lineups,
}: {
  locale: string;
  lineups: LineupOption[];
}) {
  const t = useTranslations("Matches");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ourLineup, setOurLineup] = useState(lineups[0]?.id ?? "");
  const [opponentLineup, setOpponentLineup] = useState(lineups[1]?.id ?? "");
  const [bestOf, setBestOf] = useState<3 | 5>(3);
  const [setPoints, setSetPoints] = useState(25);
  const [firstServe, setFirstServe] = useState<"us" | "them">("us");

  const sameLineup = ourLineup === opponentLineup;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await startMatch({
        locale,
        lineupId: ourLineup,
        opponentLineupId: opponentLineup,
        bestOf,
        setPoints,
        firstServe,
      });

      if (result.error) setError(t("startFailed"));
    });
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("ourLineup")}</span>
        <select
          className="h-9 rounded-lg border bg-background px-2"
          value={ourLineup}
          onChange={(event) => setOurLineup(event.target.value)}
          required
        >
          {lineups.map((lineup) => (
            <option key={lineup.id} value={lineup.id}>
              {lineup.squadName} · {lineup.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("opponentLineup")}</span>
        <select
          className="h-9 rounded-lg border bg-background px-2"
          value={opponentLineup}
          onChange={(event) => setOpponentLineup(event.target.value)}
          required
        >
          {lineups.map((lineup) => (
            <option key={lineup.id} value={lineup.id}>
              {lineup.squadName} · {lineup.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("bestOf")}</span>
          <select
            className="h-9 rounded-lg border bg-background px-2"
            value={bestOf}
            onChange={(event) => setBestOf(Number(event.target.value) as 3 | 5)}
          >
            <option value={3}>{t("bestOfThree")}</option>
            <option value={5}>{t("bestOfFive")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("setPoints")}</span>
          <input
            type="number"
            min={5}
            max={30}
            className="h-9 w-24 rounded-lg border bg-background px-2"
            value={setPoints}
            onChange={(event) => setSetPoints(Number(event.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("firstServe")}</span>
          <select
            className="h-9 rounded-lg border bg-background px-2"
            value={firstServe}
            onChange={(event) => setFirstServe(event.target.value as "us" | "them")}
          >
            <option value="us">{t("us")}</option>
            <option value="them">{t("them")}</option>
          </select>
        </label>
      </div>

      {sameLineup ? (
        <p className="text-sm text-destructive">{t("sameLineup")}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending || sameLineup || lineups.length < 2}>
        {pending ? t("starting") : t("start")}
      </Button>
    </form>
  );
}
