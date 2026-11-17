import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MatchesPage() {
  const t = await getTranslations("Matches");
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, status, best_of, set_points, created_at, squads!matches_squad_id_fkey (name), lineups!matches_lineup_id_fkey (name)",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href="/matches/new" className={buttonVariants()}>
            {t("newMatch")}
          </Link>
        }
      />

      {(matches ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(matches ?? []).map((match) => (
            <li key={match.id}>
              <Link
                href={`/matches/${match.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 hover:border-primary"
              >
                <span className="font-medium">
                  {match.squads?.name ?? ""} · {match.lineups?.name ?? ""}
                </span>
                <span className="text-sm text-muted-foreground">
                  {match.status === "finished" ? t("finished") : t("live")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
