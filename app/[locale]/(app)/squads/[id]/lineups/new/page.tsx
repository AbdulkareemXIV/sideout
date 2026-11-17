import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { redirect } from "@/lib/i18n/navigation";

import { loadSquadForLineups } from "../load";
import { LineupEditor } from "../lineup-editor";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function NewLineupPage({ params }: Props) {
  const { locale, id } = await params;
  const { squad, players, canManage } = await loadSquadForLineups(id);

  if (!canManage) {
    return redirect({ href: `/squads/${id}/lineups`, locale });
  }

  const t = await getTranslations("Lineups");
  const tSquads = await getTranslations("Squads");
  const common = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("new")}
        description={t("subtitle", { squad: squad.name })}
        back={{ href: `/squads/${squad.id}/lineups`, label: t("backToList") }}
        breadcrumbsLabel={common("breadcrumbs")}
        breadcrumbs={[
          { label: tSquads("title"), href: "/squads" },
          { label: squad.name, href: `/squads/${squad.id}` },
          { label: t("title"), href: `/squads/${squad.id}/lineups` },
          { label: t("new") },
        ]}
      />
      <LineupEditor
        squadId={squad.id}
        lineup={null}
        players={players}
        canManage={canManage}
      />
    </div>
  );
}
