import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";

import { loadLineup, loadSquadForLineups } from "../load";
import { LineupEditor } from "../lineup-editor";

type Props = {
  params: Promise<{ locale: string; id: string; lineupId: string }>;
};

export default async function LineupPage({ params }: Props) {
  const { id, lineupId } = await params;
  const { squad, players, canManage } = await loadSquadForLineups(id);
  const lineup = await loadLineup(squad.id, lineupId);

  const t = await getTranslations("Lineups");
  const tSquads = await getTranslations("Squads");
  const common = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={lineup.name}
        description={`${squad.name} · ${t(`systems.${lineup.system}`)}`}
        back={{ href: `/squads/${squad.id}/lineups`, label: t("backToList") }}
        breadcrumbsLabel={common("breadcrumbs")}
        breadcrumbs={[
          { label: tSquads("title"), href: "/squads" },
          { label: squad.name, href: `/squads/${squad.id}` },
          { label: t("title"), href: `/squads/${squad.id}/lineups` },
          { label: lineup.name },
        ]}
      />
      <LineupEditor
        squadId={squad.id}
        lineup={lineup}
        players={players}
        canManage={canManage}
      />
    </div>
  );
}
