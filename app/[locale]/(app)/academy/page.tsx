import { getTranslations } from "next-intl/server";

import { redirect } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

import { AcademyForm } from "./academy-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AcademyPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect({ href: "/sign-in", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "director") {
    return redirect({ href: "/", locale });
  }

  const { data: academy } = await supabase
    .from("academy")
    .select("name, season_start, season_end, default_best_of, default_set_points")
    .single();

  const t = await getTranslations("Academy");

  if (!academy) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <p className="text-sm text-muted-foreground">{t("missing")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <AcademyForm
        defaults={{
          name: academy.name,
          seasonStart: academy.season_start,
          seasonEnd: academy.season_end,
          defaultBestOf: academy.default_best_of,
          defaultSetPoints: academy.default_set_points,
        }}
      />
    </main>
  );
}
