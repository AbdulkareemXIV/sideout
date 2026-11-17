"use client";

import { useActionState, useEffect } from "react";

import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { FieldError, RequiredMark } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAcademy, type AcademyState } from "@/features/academy/actions";

const initialState: AcademyState = { error: null, saved: false };

type Props = {
  defaults: {
    name: string;
    seasonStart: string;
    seasonEnd: string;
  };
};

export function AcademyForm({ defaults }: Props) {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    updateAcademy.bind(null, locale),
    initialState,
  );

  useEffect(() => {
    if (state.saved) {
      toast.success(t("saved"));
    }
  }, [state, t]);

  const error = state.error ? t(state.error) : null;
  const fieldError = (name: string) => (state.field === name ? error : null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          {t("name")} <RequiredMark label={t("required")} />
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaults.name}
          required
          aria-invalid={state.field === "name" || undefined}
          aria-describedby={state.field === "name" ? "name-error" : undefined}
        />
        <FieldError id="name-error" message={fieldError("name")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="seasonStart">
            {t("seasonStart")} <RequiredMark label={t("required")} />
          </Label>
          <Input
            id="seasonStart"
            name="seasonStart"
            type="date"
            defaultValue={defaults.seasonStart}
            required
            aria-invalid={state.field === "seasonStart" || undefined}
            aria-describedby={
              state.field === "seasonStart" ? "season-start-error" : undefined
            }
          />
          <FieldError
            id="season-start-error"
            message={fieldError("seasonStart")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="seasonEnd">
            {t("seasonEnd")} <RequiredMark label={t("required")} />
          </Label>
          <Input
            id="seasonEnd"
            name="seasonEnd"
            type="date"
            defaultValue={defaults.seasonEnd}
            required
            aria-invalid={state.field === "seasonEnd" || undefined}
            aria-describedby={
              state.field === "seasonEnd" ? "season-end-error" : undefined
            }
          />
          <FieldError
            id="season-end-error"
            message={fieldError("seasonEnd")}
          />
        </div>
      </div>

      {error && !state.field ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
