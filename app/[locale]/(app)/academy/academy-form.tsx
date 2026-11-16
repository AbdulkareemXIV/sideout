"use client";

import { useActionState } from "react";

import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAcademy, type AcademyState } from "@/features/academy/actions";

const initialState: AcademyState = { error: null, saved: false };

const selectClassName =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

type Props = {
  defaults: {
    name: string;
    seasonStart: string;
    seasonEnd: string;
    defaultBestOf: number;
    defaultSetPoints: number;
  };
};

export function AcademyForm({ defaults }: Props) {
  const t = useTranslations("Academy");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    updateAcademy.bind(null, locale),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="seasonStart">{t("seasonStart")}</Label>
          <Input
            id="seasonStart"
            name="seasonStart"
            type="date"
            defaultValue={defaults.seasonStart}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="seasonEnd">{t("seasonEnd")}</Label>
          <Input
            id="seasonEnd"
            name="seasonEnd"
            type="date"
            defaultValue={defaults.seasonEnd}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="defaultBestOf">{t("defaultBestOf")}</Label>
          <select
            id="defaultBestOf"
            name="defaultBestOf"
            className={selectClassName}
            defaultValue={defaults.defaultBestOf}
          >
            <option value="3">{t("bestOf3")}</option>
            <option value="5">{t("bestOf5")}</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="defaultSetPoints">{t("defaultSetPoints")}</Label>
          <select
            id="defaultSetPoints"
            name="defaultSetPoints"
            className={selectClassName}
            defaultValue={defaults.defaultSetPoints}
          >
            <option value="15">{t("points15")}</option>
            <option value="21">{t("points21")}</option>
            <option value="25">{t("points25")}</option>
          </select>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(state.error)}
        </p>
      ) : null}

      {state.saved && !state.error ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("saved")}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
