"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteLineup, saveLineup } from "@/features/lineups/actions";
import {
  BASE_POINTS,
  POSITIONS,
  checkOverlap,
  rotations,
  setterCount,
  setterForRotation,
  validateLineup,
  type Arrangement,
  type CourtPoint,
  type LineupProblem,
  type Position,
  type System,
  type Violation,
} from "@/features/lineups/engine";
import type { PlayerOption, SavedLineup } from "@/features/lineups/types";
import { useRouter } from "@/lib/i18n/navigation";

type Props = {
  squadId: string;
  lineup: SavedLineup | null;
  players: PlayerOption[];
  canManage: boolean;
};

type Problem = LineupProblem | { kind: "missingName" };

const SYSTEMS: System[] = ["5-1", "6-2", "4-2"];

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function LineupEditor({ squadId, lineup, players, canManage }: Props) {
  const t = useTranslations("Lineups");
  const tSquad = useTranslations("Squad");
  const locale = useLocale();
  const router = useRouter();

  const [name, setName] = useState(lineup?.name ?? "");
  const [system, setSystem] = useState<System>(lineup?.system ?? "5-1");
  const [positions, setPositions] = useState<
    Partial<Record<Position, string>>
  >(lineup?.positions ?? {});
  const [setterIds, setSetterIds] = useState<string[]>(lineup?.setterIds ?? []);
  const [liberoId, setLiberoId] = useState<string | null>(
    lineup?.liberoId ?? null,
  );
  const [rotation, setRotation] = useState(0);
  const [mode, setMode] = useState<"serve" | "receive">("serve");
  const [points, setPoints] = useState<Record<string, Record<string, CourtPoint>>>(
    lineup?.receiveFormations ?? {},
  );
  const [held, setHeld] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [dragging, setDragging] = useState<Position | null>(null);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const courtRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const complete = POSITIONS.every((position) => positions[position]);
  const allRotations = complete
    ? rotations(positions as Arrangement)
    : null;
  const current = allRotations
    ? allRotations[rotation]!
    : (positions as Partial<Record<Position, string>>);
  const setterNow = allRotations
    ? setterForRotation(system, setterIds, allRotations[rotation]!)
    : null;

  const receivePoints = useMemo(() => {
    const stored = points[String(rotation)] ?? {};
    return Object.fromEntries(
      POSITIONS.map((position) => [
        position,
        (stored[String(position)] as CourtPoint | undefined) ??
          BASE_POINTS[position],
      ]),
    ) as Record<Position, CourtPoint>;
  }, [points, rotation]);

  const violations: Violation[] =
    mode === "receive" && allRotations
      ? checkOverlap(receivePoints)
      : [];

  const flagged = new Set(violations.flatMap((violation) => violation.positions));

  const canEditCourt = canManage && rotation === 0 && mode === "serve";
  const canMoveTokens = canManage && mode === "receive";

  function nameOf(id: string | undefined | null) {
    if (!id) return null;
    const player = byId.get(id);
    return player ? player.fullName : null;
  }

  function label(id: string | undefined | null) {
    const player = id ? byId.get(id) : null;
    if (!player) return "";
    return player.jerseyNumber !== null
      ? `${player.jerseyNumber} ${player.fullName}`
      : player.fullName;
  }

  function placePlayer(position: Position, playerId: string) {
    const from = POSITIONS.find(
      (candidate) => positions[candidate] === playerId,
    );

    setPositions((previous) => {
      const next = { ...previous, [position]: playerId };

      if (from && from !== position) {
        const displaced = previous[position];
        if (displaced) {
          next[from] = displaced;
        } else {
          delete next[from];
        }
      }

      return next;
    });
    setHeld(null);
  }

  function onSlotClick(position: Position) {
    if (!canEditCourt) {
      return;
    }

    if (!held) {
      const standing = positions[position];
      if (standing) {
        setHeld(standing);
      }
      return;
    }

    if (held === positions[position]) {
      setHeld(null);
      return;
    }

    placePlayer(position, held);
  }

  function toggleSetter(playerId: string) {
    setSetterIds((previous) => {
      if (previous.includes(playerId)) {
        return previous.filter((id) => id !== playerId);
      }

      const next = [...previous, playerId];
      return next.slice(-setterCount(system));
    });
  }

  function changeSystem(next: System) {
    setSystem(next);
    setSetterIds((previous) => previous.slice(0, setterCount(next)));
  }

  function moveToken(position: Position, delta: { x: number; y: number }) {
    const point = receivePoints[position];
    setPoints((previous) => ({
      ...previous,
      [String(rotation)]: {
        ...(previous[String(rotation)] ?? {}),
        [String(position)]: {
          x: clamp(point.x + delta.x),
          y: clamp(point.y + delta.y),
        },
      },
    }));
  }

  function pointFromEvent(clientX: number, clientY: number): CourtPoint {
    const rect = courtRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };

    return {
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height),
    };
  }

  function save() {
    const found = validateLineup({ system, positions, setterIds });
    const missingName = name.trim().length === 0;

    if (missingName || found.length > 0) {
      setProblems(
        missingName
          ? [{ kind: "missingName" }, ...found]
          : found,
      );
      return;
    }

    setProblems([]);

    startSaving(async () => {
      const result = await saveLineup(locale, {
        lineupId: lineup?.id ?? null,
        squadId,
        name,
        system,
        positions: Object.fromEntries(
          POSITIONS.map((position) => [String(position), positions[position]]),
        ),
        setterIds,
        liberoId,
        receiveFormations: points,
      });

      if (result.saved) {
        toast.success(t("saved"));
        router.push(`/squads/${squadId}/lineups`);
        return;
      }

      if (result.problems) {
        setProblems(result.problems);
      }

      toast.error(t(result.error ?? "failed"));
    });
  }

  function remove() {
    if (!lineup) return;

    startDeleting(async () => {
      const result = await deleteLineup(locale, squadId, lineup.id);

      if (result.error) {
        toast.error(t(result.error));
        return;
      }

      toast.success(t("deleted"));
      router.push(`/squads/${squadId}/lineups`);
    });
  }

  const tokenPoints = mode === "receive" ? receivePoints : BASE_POINTS;

  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lineup-name">
                {t("name")} <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="lineup-name"
                value={name}
                maxLength={60}
                required
                onChange={(event) => setName(event.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="lineup-system">{t("system")}</Label>
              <select
                id="lineup-system"
                value={system}
                onChange={(event) => changeSystem(event.target.value as System)}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
              >
                {SYSTEMS.map((option) => (
                  <option key={option} value={option}>
                    {t(`systems.${option}`)}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                {t(`systemHints.${system}`)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          {t("viewOnly")}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1" role="group" aria-label={t("rotations")}>
              {POSITIONS.map((_, index) => (
                <Button
                  key={index}
                  type="button"
                  size="sm"
                  variant={rotation === index ? "default" : "outline"}
                  aria-pressed={rotation === index}
                  onClick={() => setRotation(index)}
                >
                  {t("rotation", { number: index + 1 })}
                </Button>
              ))}
            </div>

            <div className="flex gap-1" role="group" aria-label={t("formation")}>
              <Button
                type="button"
                size="sm"
                variant={mode === "serve" ? "default" : "outline"}
                aria-pressed={mode === "serve"}
                onClick={() => setMode("serve")}
              >
                {t("serve")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "receive" ? "default" : "outline"}
                aria-pressed={mode === "receive"}
                onClick={() => setMode("receive")}
              >
                {t("receive")}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {mode === "serve" ? t("serveHint") : t("receiveHint")}
          </p>

          <div
            ref={courtRef}
            aria-label={t("court")}
            className="relative aspect-4/3 w-full overflow-hidden rounded-xl border-2 border-primary/60 bg-secondary"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-accent" />
            <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-primary/30" />

            {POSITIONS.map((position) => {
              const point = tokenPoints[position];
              const playerId = current[position];
              const player = playerId ? byId.get(playerId) : null;
              const isSetter = Boolean(playerId) && playerId === setterNow;
              const isFlagged = flagged.has(position);
              const isHeld = Boolean(playerId) && playerId === held;

              return (
                <button
                  key={position}
                  type="button"
                  draggable={canEditCourt && Boolean(playerId)}
                  onDragStart={(event) => {
                    if (playerId) event.dataTransfer.setData("text/plain", playerId);
                  }}
                  onDragOver={(event) => {
                    if (canEditCourt) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (!canEditCourt) return;
                    event.preventDefault();
                    const dropped = event.dataTransfer.getData("text/plain");
                    if (dropped) placePlayer(position, dropped);
                  }}
                  onClick={() => onSlotClick(position)}
                  onPointerDown={(event) => {
                    if (!canMoveTokens) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging(position);
                  }}
                  onPointerMove={(event) => {
                    if (dragging !== position) return;
                    const point2 = pointFromEvent(event.clientX, event.clientY);
                    setPoints((previous) => ({
                      ...previous,
                      [String(rotation)]: {
                        ...(previous[String(rotation)] ?? {}),
                        [String(position)]: point2,
                      },
                    }));
                  }}
                  onPointerUp={() => setDragging(null)}
                  onKeyDown={(event) => {
                    if (!canMoveTokens) return;
                    const step = event.shiftKey ? 0.02 : 0.05;
                    const moves: Record<string, { x: number; y: number }> = {
                      ArrowLeft: { x: -step, y: 0 },
                      ArrowRight: { x: step, y: 0 },
                      ArrowUp: { x: 0, y: -step },
                      ArrowDown: { x: 0, y: step },
                    };

                    const move = moves[event.key];
                    if (move) {
                      event.preventDefault();
                      moveToken(position, move);
                    }

                    if (event.key === "Home") {
                      event.preventDefault();
                      setPoints((previous) => ({
                        ...previous,
                        [String(rotation)]: {
                          ...(previous[String(rotation)] ?? {}),
                          [String(position)]: BASE_POINTS[position],
                        },
                      }));
                    }
                  }}
                  style={{
                    left: `${point.x * 100}%`,
                    top: `${point.y * 100}%`,
                  }}
                  aria-pressed={isHeld}
                  aria-label={t("slot", {
                    position,
                    player: player ? label(playerId) : t("empty"),
                  })}
                  className={[
                    "absolute flex size-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full border-2 text-xs shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    player
                      ? "border-primary bg-card text-card-foreground"
                      : "border-dashed border-primary/40 bg-card/60 text-muted-foreground",
                    isSetter ? "border-accent" : "",
                    isFlagged ? "border-destructive text-destructive" : "",
                    isHeld ? "ring-2 ring-accent ring-offset-2" : "",
                    canMoveTokens ? "cursor-grab" : canEditCourt ? "cursor-pointer" : "cursor-default",
                  ].join(" ")}
                >
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide">
                    {t("positionShort", { position })}
                  </span>
                  <span className="max-w-12 truncate px-1 text-[0.65rem]">
                    {player ? (player.jerseyNumber ?? player.fullName.split(" ")[0]) : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {violations.length > 0 ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/5 p-4"
            >
              <h3 className="font-medium text-destructive">{t("violationsTitle")}</h3>
              <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-sm">
                {violations.map((violation) => (
                  <li key={`${violation.positions.join("-")}-${violation.relation}`}>
                    {violation.relation === "frontBack"
                      ? t("violations.frontBack", {
                          back: violation.positions[0],
                          front: violation.positions[1],
                        })
                      : t("violations.leftToRight", {
                          left: violation.positions[0],
                          right: violation.positions[1],
                        })}
                  </li>
                ))}
              </ul>
            </div>
          ) : mode === "receive" && allRotations ? (
            <p className="text-sm text-muted-foreground">{t("noViolations")}</p>
          ) : null}

          {setterNow ? (
            <p className="text-sm text-muted-foreground">
              {t("settingNow", { player: nameOf(setterNow) ?? "" })}
            </p>
          ) : null}
        </section>

        <aside className="flex flex-col gap-4">
          {canManage ? (
            <>
              <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
                <h2 className="font-medium">{t("roster")}</h2>
                {players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("emptyRoster")}</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {players.map((player) => {
                      const onCourt = POSITIONS.some(
                        (position) => positions[position] === player.id,
                      );
                      const isSetter = setterIds.includes(player.id);
                      const isLibero = liberoId === player.id;

                      return (
                        <li
                          key={player.id}
                          className="flex items-center gap-2 rounded-md border p-2"
                        >
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) =>
                              event.dataTransfer.setData("text/plain", player.id)
                            }
                            onClick={() => setHeld(held === player.id ? null : player.id)}
                            aria-pressed={held === player.id}
                            className={[
                              "flex min-h-9 flex-1 items-center gap-2 rounded-md px-2 text-start text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                              held === player.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/40",
                            ].join(" ")}
                          >
                            <span className="w-6 text-end text-muted-foreground">
                              {player.jerseyNumber ?? "–"}
                            </span>
                            <span className="flex-1 truncate">{player.fullName}</span>
                            {onCourt ? (
                              <span className="text-xs text-muted-foreground">
                                {t("onCourt")}
                              </span>
                            ) : null}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleSetter(player.id)}
                            aria-pressed={isSetter}
                            title={tSquad("positions.setter")}
                            className={[
                              "size-7 rounded-md border text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                              isSetter
                                ? "border-accent bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent/40",
                            ].join(" ")}
                          >
                            S
                          </button>

                          {isLibero ? (
                            <span
                              title={t("libero")}
                              className="text-xs font-semibold text-accent"
                            >
                              L
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <p className="text-sm text-muted-foreground">
                  {t("setterHint", { count: setterCount(system) })}
                </p>
              </section>

              <section className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                <Label htmlFor="lineup-libero">{t("libero")}</Label>
                <select
                  id="lineup-libero"
                  value={liberoId ?? ""}
                  onChange={(event) => setLiberoId(event.target.value || null)}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
                >
                  <option value="">{t("noLibero")}</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {label(player.id)}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">{t("liberoHint")}</p>
              </section>
            </>
          ) : null}

          {problems.length > 0 ? (
            <div role="alert" className="rounded-lg border border-destructive/50 p-4">
              <h2 className="font-medium text-destructive">{t("cannotSave")}</h2>
              <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-sm">
                {problems.map((problem, index) => (
                  <li key={`${problem.kind}-${index}`}>
                    {problem.kind === "missingPositions"
                      ? t("problems.missingPositions", {
                          positions: problem.positions.join(", "),
                        })
                      : problem.kind === "duplicatePlayers"
                        ? t("problems.duplicatePlayers")
                        : problem.kind === "setterCount"
                          ? t("problems.setterCount", { expected: problem.expected })
                          : problem.kind === "setterNotOnCourt"
                            ? t("problems.setterNotOnCourt")
                            : t("problems.missingName")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {canManage ? (
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={save} disabled={saving}>
                {saving ? t("saving") : lineup ? t("saveChanges") : t("save")}
              </Button>

              {lineup ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={deleting}
                >
                  {deleting ? t("deleting") : t("delete")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: lineup?.name ?? "" })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        tone="destructive"
        onConfirm={() => {
          setConfirmingDelete(false);
          remove();
        }}
        onClose={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
