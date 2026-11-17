import { getTranslations } from "next-intl/server";

import { SearchField } from "@/components/list-filters";
import { PageHeader } from "@/components/page-header";
import { Link, redirect } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

import { NewSquadForm } from "./new-squad-form";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function SquadsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q } = await searchParams;
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

  const { data: squads } = await supabase
    .from("squads")
    .select("id, name, age_group")
    .order("age_group");

  const { data: memberships } = await supabase
    .from("squad_memberships")
    .select("squad_id")
    .is("end_date", null);

  const counts = new Map<string, number>();

  for (const membership of memberships ?? []) {
    counts.set(membership.squad_id, (counts.get(membership.squad_id) ?? 0) + 1);
  }

  const query = (q ?? "").trim();
  const needle = query.toLowerCase();
  const matches = (squads ?? []).filter(
    (squad) =>
      !needle ||
      squad.name.toLowerCase().includes(needle) ||
      (squad.age_group ?? "").toLowerCase().includes(needle),
  );

  const t = await getTranslations("Squads");
  const hasSquads = Boolean(squads && squads.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {profile?.role === "director" ? <NewSquadForm /> : null}

      {hasSquads ? (
        <SearchField label={t("search")} placeholder={t("searchPlaceholder")} />
      ) : null}

      {matches.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {matches.map((squad) => (
            <li key={squad.id}>
              <Link
                href={`/squads/${squad.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-ring hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{squad.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {squad.age_group}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("players", { count: counts.get(squad.id) ?? 0 })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : hasSquads ? (
        <p className="text-sm text-muted-foreground">
          {t("noResults", { query })}
        </p>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            {profile?.role === "director" ? t("emptyDirector") : t("emptyCoach")}
          </p>
        </div>
      )}
    </div>
  );
}
