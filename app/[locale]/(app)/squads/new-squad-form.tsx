"use client";

import { useActionState, useEffect } from "react";

import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { FieldError, RequiredMark } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSquad, type SquadState } from "@/features/squads/actions";

const initialState: SquadState = { error: null, created: false };

export function NewSquadForm() {
  const t = useTranslations("Squads");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    createSquad.bind(null, locale),
    initialState,
  );

  useEffect(() => {
    if (state.created) {
      toast.success(t("squadCreated"));
    }
  }, [state, t]);

  const error = state.error ? t(state.error) : null;
  const fieldError = (name: string) => (state.field === name ? error : null);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border bg-card p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            {t("name")} <RequiredMark label={t("required")} />
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="U16"
            required
            aria-invalid={state.field === "name" || undefined}
            aria-describedby={
              state.field === "name" ? "squad-name-error" : undefined
            }
          />
          <FieldError id="squad-name-error" message={fieldError("name")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ageGroup">
            {t("ageGroup")} <RequiredMark label={t("required")} />
          </Label>
          <Input
            id="ageGroup"
            name="ageGroup"
            placeholder="U16"
            required
            aria-invalid={state.field === "ageGroup" || undefined}
            aria-describedby={
              state.field === "ageGroup" ? "age-group-error" : undefined
            }
          />
          <FieldError id="age-group-error" message={fieldError("ageGroup")} />
        </div>
      </div>

      {error && !state.field ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("creating") : t("create")}
      </Button>
    </form>
  );
}
