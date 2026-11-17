import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
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
    .select("name, season_start, season_end")
    .single();

  const t = await getTranslations("Academy");

  if (!academy) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <p className="text-sm text-muted-foreground">{t("missing")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <AcademyForm
        defaults={{
          name: academy.name,
          seasonStart: academy.season_start,
          seasonEnd: academy.season_end,
        }}
      />
    </div>
  );
}
