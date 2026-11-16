"use client";

import { useActionState } from "react";

import { useLocale, useTranslations } from "next-intl";

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

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" placeholder="U16" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ageGroup">{t("ageGroup")}</Label>
          <Input
            id="ageGroup"
            name="ageGroup"
            placeholder="U16"
            required
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(state.error)}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("creating") : t("create")}
      </Button>
    </form>
  );
}
