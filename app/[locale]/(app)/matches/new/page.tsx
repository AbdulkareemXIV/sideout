import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

import { MatchSetupForm, type LineupOption } from "./match-setup-form";

export default async function NewMatchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Matches");
  const supabase = await createClient();

  const { data: lineups } = await supabase
    .from("lineups")
    .select("id, name, squads (name)")
    .order("created_at", { ascending: false });

  const options: LineupOption[] = (lineups ?? []).map((lineup) => ({
    id: lineup.id,
    name: lineup.name,
    squadName: lineup.squads?.name ?? "",
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("newTitle")}
        description={t("newDescription")}
        back={{ href: "/matches", label: t("back") }}
      />

      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("needLineup")}</p>
      ) : (
        <MatchSetupForm locale={locale} lineups={options} />
      )}
    </div>
  );
}
