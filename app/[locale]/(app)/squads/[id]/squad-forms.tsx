"use client";

import { useActionState, useEffect } from "react";

import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addPlayer,
  assignCoach,
  movePlayer,
  unassignCoach,
  type SquadActionState,
} from "@/features/squads/actions";
import {
  createPlayerAccountAction,
  resetPasswordAction,
  type AccountActionState,
} from "@/lib/auth/account-actions";
import { useRouter } from "@/lib/i18n/navigation";

const idleSquad: SquadActionState = { error: null, done: false };
const idleAccount: AccountActionState = {
  error: null,
  username: null,
  temporaryPassword: null,
};

const selectClassName =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

const positions = [
  "outside_hitter",
  "opposite",
  "setter",
  "middle_blocker",
  "libero",
  "defensive_specialist",
] as const;

const hands = ["right", "left", "both"] as const;

function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function AddPlayerForm({ squadId }: { squadId: string }) {
  const t = useTranslations("Squad");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    addPlayer.bind(null, locale),
    idleSquad,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <input type="hidden" name="squadId" value={squadId} />
      <h3 className="font-medium">{t("addPlayer")}</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">{t("name")}</Label>
          <Input id="fullName" name="fullName" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="jerseyNumber">{t("jersey")}</Label>
          <Input
            id="jerseyNumber"
            name="jerseyNumber"
            type="number"
            min={0}
            max={99}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="position">{t("position")}</Label>
          <select
            id="position"
            name="position"
            className={selectClassName}
            defaultValue="outside_hitter"
          >
            {positions.map((position) => (
              <option key={position} value={position}>
                {t(`positions.${position}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dominantHand">{t("hand")}</Label>
          <select
            id="dominantHand"
            name="dominantHand"
            className={selectClassName}
            defaultValue="right"
          >
            {hands.map((hand) => (
              <option key={hand} value={hand}>
                {t(`hands.${hand}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dateOfBirth">{t("dateOfBirth")}</Label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="heightCm">{t("height")}</Label>
          <Input id="heightCm" name="heightCm" type="number" min={100} max={230} />
        </div>
      </div>

      <FormError message={state.error ? t(state.error) : null} />

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("adding") : t("add")}
      </Button>
    </form>
  );
}

export function MovePlayerForm({
  playerId,
  squads,
}: {
  playerId: string;
  squads: { id: string; name: string }[];
}) {
  const t = useTranslations("Squad");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    movePlayer.bind(null, locale),
    idleSquad,
  );

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="playerId" value={playerId} />
      <Label htmlFor={`move-${playerId}`} className="sr-only">
        {t("move")}
      </Label>
      <select
        id={`move-${playerId}`}
        name="squadId"
        className={selectClassName}
        defaultValue={squads[0]?.id}
      >
        {squads.map((squad) => (
          <option key={squad.id} value={squad.id}>
            {squad.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? t("moving") : t("moveSubmit")}
      </Button>
      <FormError message={state.error ? t(state.error) : null} />
    </form>
  );
}

export function AccountControl({
  playerId,
  hasAccount,
}: {
  playerId: string;
  hasAccount: boolean;
}) {
  const t = useTranslations("Squad");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    hasAccount ? resetPasswordAction : createPlayerAccountAction,
    idleAccount,
  );

  useEffect(() => {
    if (state.temporaryPassword) {
      router.refresh();
    }
  }, [state.temporaryPassword, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="playerId" value={playerId} />

      {hasAccount ? null : (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`username-${playerId}`}>{t("username")}</Label>
          <Input id={`username-${playerId}`} name="username" required />
        </div>
      )}

      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending
          ? t(hasAccount ? "resetting" : "creatingAccount")
          : t(hasAccount ? "resetPassword" : "createAccount")}
      </Button>

      <FormError message={state.error ? t(state.error) : null} />

      {state.temporaryPassword ? (
        <p role="status" className="text-sm">
          {t("temporaryPassword", { password: state.temporaryPassword })}
          {" — "}
          {t("temporaryPasswordNote")}
        </p>
      ) : null}
    </form>
  );
}

export function AssignCoachForm({
  squadId,
  coaches,
}: {
  squadId: string;
  coaches: { id: string; full_name: string }[];
}) {
  const t = useTranslations("Squad");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    assignCoach.bind(null, locale),
    idleSquad,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="squadId" value={squadId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="coachId">{t("assignCoach")}</Label>
        <select
          id="coachId"
          name="coachId"
          className={selectClassName}
          defaultValue={coaches[0]?.id}
        >
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.full_name}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {t("assign")}
      </Button>

      <FormError message={state.error ? t(state.error) : null} />
    </form>
  );
}

export function RemoveCoachForm({
  squadId,
  coachId,
}: {
  squadId: string;
  coachId: string;
}) {
  const t = useTranslations("Squad");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    unassignCoach.bind(null, locale),
    idleSquad,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="squadId" value={squadId} />
      <input type="hidden" name="coachId" value={coachId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {t("remove")}
      </Button>
      <FormError message={state.error ? t(state.error) : null} />
    </form>
  );
}
