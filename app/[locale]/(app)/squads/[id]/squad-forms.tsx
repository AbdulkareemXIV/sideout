"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FieldError, RequiredMark } from "@/components/field";
import { TempPasswordDialog } from "@/components/temp-password-dialog";
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

const idleSquad: SquadActionState = { error: null, done: false, field: null };
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

export function AddPlayerForm({ squadId }: { squadId: string }) {
  const t = useTranslations("Squad");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    addPlayer.bind(null, locale),
    idleSquad,
  );

  useEffect(() => {
    if (state.done) {
      toast.success(t("playerAdded"));
    }
  }, [state, t]);

  const error = state.error ? t(state.error) : null;
  const fieldError = (name: string) => (state.field === name ? error : null);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
    >
      <input type="hidden" name="squadId" value={squadId} />
      <h3 className="font-medium">{t("addPlayer")}</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">
            {t("name")} <RequiredMark label={t("required")} />
          </Label>
          <Input
            id="fullName"
            name="fullName"
            required
            aria-invalid={state.field === "fullName" || undefined}
            aria-describedby={
              state.field === "fullName" ? "fullName-error" : undefined
            }
          />
          <FieldError id="fullName-error" message={fieldError("fullName")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="jerseyNumber">{t("jersey")}</Label>
          <Input
            id="jerseyNumber"
            name="jerseyNumber"
            type="number"
            min={0}
            max={99}
            aria-invalid={state.field === "jerseyNumber" || undefined}
            aria-describedby={
              state.field === "jerseyNumber" ? "jersey-error" : undefined
            }
          />
          <FieldError
            id="jersey-error"
            message={fieldError("jerseyNumber")}
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
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            aria-invalid={state.field === "dateOfBirth" || undefined}
            aria-describedby={
              state.field === "dateOfBirth" ? "dob-error" : undefined
            }
          />
          <FieldError id="dob-error" message={fieldError("dateOfBirth")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="heightCm">{t("height")}</Label>
          <Input
            id="heightCm"
            name="heightCm"
            type="number"
            min={100}
            max={230}
            aria-invalid={state.field === "heightCm" || undefined}
            aria-describedby={
              state.field === "heightCm" ? "height-error" : undefined
            }
          />
          <FieldError id="height-error" message={fieldError("heightCm")} />
        </div>
      </div>

      {error && !state.field ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("adding") : t("add")}
      </Button>
    </form>
  );
}

export function MovePlayerForm({
  playerId,
  playerName,
  squads,
}: {
  playerId: string;
  playerName: string;
  squads: { id: string; name: string }[];
}) {
  const t = useTranslations("Squad");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    movePlayer.bind(null, locale),
    idleSquad,
  );
  const [target, setTarget] = useState(squads[0]?.id ?? "");
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.done) {
      toast.success(t("playerMoved"));
    }
  }, [state, t]);

  const targetName = squads.find((squad) => squad.id === target)?.name ?? "";

  return (
    <>
      <form ref={formRef} action={formAction} className="flex items-end gap-2">
        <input type="hidden" name="playerId" value={playerId} />
        <Label htmlFor={`move-${playerId}`} className="sr-only">
          {t("move")}
        </Label>
        <select
          id={`move-${playerId}`}
          name="squadId"
          className={selectClassName}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          {squads.map((squad) => (
            <option key={squad.id} value={squad.id}>
              {squad.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(true)}
        >
          {pending ? t("moving") : t("moveSubmit")}
        </Button>
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {t(state.error)}
          </p>
        ) : null}
      </form>

      <ConfirmDialog
        open={confirming}
        title={t("moveConfirmTitle")}
        description={t("moveConfirm", {
          player: playerName,
          squad: targetName,
        })}
        confirmLabel={t("moveSubmit")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          setConfirming(false);
          formRef.current?.requestSubmit();
        }}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}

export function AccountControl({
  playerId,
  playerName,
  hasAccount,
}: {
  playerId: string;
  playerName: string;
  hasAccount: boolean;
}) {
  const t = useTranslations("Squad");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    hasAccount ? resetPasswordAction : createPlayerAccountAction,
    idleAccount,
  );
  const [confirming, setConfirming] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const password = state.temporaryPassword;

  useEffect(() => {
    if (password) {
      router.refresh();
    }
  }, [password, router]);

  const error = state.error ? t(state.error) : null;

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="playerId" value={playerId} />

        {hasAccount ? null : (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`username-${playerId}`}>
              {t("username")} <RequiredMark label={t("required")} />
            </Label>
            <Input
              id={`username-${playerId}`}
              name="username"
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={
                error ? `username-error-${playerId}` : undefined
              }
            />
            <FieldError
              id={`username-error-${playerId}`}
              message={error}
            />
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (hasAccount) {
              setConfirming(true);
            } else {
              formRef.current?.requestSubmit();
            }
          }}
        >
          {pending
            ? t(hasAccount ? "resetting" : "creatingAccount")
            : t(hasAccount ? "resetPassword" : "createAccount")}
        </Button>

        {hasAccount ? <FieldError id={`account-error-${playerId}`} message={error} /> : null}
      </form>

      <ConfirmDialog
        open={confirming}
        title={t("resetConfirmTitle")}
        description={t("resetConfirm", { player: playerName })}
        confirmLabel={t("resetPassword")}
        cancelLabel={t("cancel")}
        tone="destructive"
        onConfirm={() => {
          setConfirming(false);
          formRef.current?.requestSubmit();
        }}
        onClose={() => setConfirming(false)}
      />

      {password ? (
        <TempPasswordDialog
          open={dismissed !== password}
          title={
            hasAccount ? t("passwordResetTitle") : t("accountCreatedTitle")
          }
          usernameLabel={t("username")}
          username={state.username}
          password={password}
          note={t("temporaryPasswordNote")}
          copyLabel={t("copyPassword")}
          copiedLabel={t("passwordCopied")}
          closeLabel={t("close")}
          onClose={() => setDismissed(password)}
        />
      ) : null}
    </>
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

  useEffect(() => {
    if (state.done) {
      toast.success(t("coachAssigned"));
    }
  }, [state, t]);

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
        {pending ? t("assigning") : t("assign")}
      </Button>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(state.error)}
        </p>
      ) : null}
    </form>
  );
}

export function RemoveCoachForm({
  squadId,
  coachId,
  coachName,
}: {
  squadId: string;
  coachId: string;
  coachName: string;
}) {
  const t = useTranslations("Squad");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    unassignCoach.bind(null, locale),
    idleSquad,
  );
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.done) {
      toast.success(t("coachRemoved"));
    }
  }, [state, t]);

  return (
    <>
      <form ref={formRef} action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="squadId" value={squadId} />
        <input type="hidden" name="coachId" value={coachId} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(true)}
        >
          {t("remove")}
        </Button>
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {t(state.error)}
          </p>
        ) : null}
      </form>

      <ConfirmDialog
        open={confirming}
        title={t("removeCoachConfirmTitle")}
        description={t("removeCoachConfirm", { coach: coachName })}
        confirmLabel={t("remove")}
        cancelLabel={t("cancel")}
        tone="destructive"
        onConfirm={() => {
          setConfirming(false);
          formRef.current?.requestSubmit();
        }}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
