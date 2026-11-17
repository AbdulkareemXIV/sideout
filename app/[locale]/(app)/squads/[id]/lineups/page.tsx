import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Link, redirect } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

import { toSavedLineup } from "@/features/lineups/types";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function LineupsPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
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

  const { data: squad } = await supabase
    .from("squads")
    .select("id, name, age_group")
    .eq("id", id)
    .maybeSingle();

  if (!squad) {
    notFound();
  }

  const { data: rows } = await supabase
    .from("lineups")
    .select("id, name, system, positions, setter_ids, libero_id, receive_formations")
    .eq("squad_id", squad.id)
    .order("updated_at", { ascending: false });

  const canManage = profile?.role === "director" || profile?.role === "coach";
  const query = (q ?? "").trim().toLowerCase();
  const lineups = (rows ?? []).map(toSavedLineup).filter(
    (lineup) => !query || lineup.name.toLowerCase().includes(query),
  );

  const t = await getTranslations("Lineups");
  const tSquad = await getTranslations("Squad");
  const tSquads = await getTranslations("Squads");
  const common = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle", { squad: squad.name })}
        back={{ href: `/squads/${squad.id}`, label: t("back") }}
        breadcrumbsLabel={common("breadcrumbs")}
        breadcrumbs={[
          { label: tSquads("title"), href: "/squads" },
          { label: squad.name, href: `/squads/${squad.id}` },
          { label: t("title") },
        ]}
        actions={
          canManage ? (
            <Link
              href={`/squads/${squad.id}/lineups/new`}
              className={buttonVariants()}
            >
              {t("new")}
            </Link>
          ) : null
        }
      />

      {(rows ?? []).length > 0 ? (
        <form className="flex flex-wrap items-end gap-3" role="search">
          <div className="flex min-w-64 flex-1 flex-col gap-2">
            <label htmlFor="lineup-search" className="text-sm font-medium">
              {t("search")}
            </label>
            <input
              id="lineup-search"
              name="q"
              defaultValue={q ?? ""}
              placeholder={t("searchPlaceholder")}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
            />
          </div>
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            {t("searchSubmit")}
          </button>
        </form>
      ) : null}

      {lineups.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {lineups.map((lineup) => (
            <li key={lineup.id} className="rounded-lg border bg-card">
              <Link
                href={`/squads/${squad.id}/lineups/${lineup.id}`}
                className="flex min-h-16 flex-col justify-center gap-1 p-4 hover:bg-accent/40"
              >
                <span className="font-medium">{lineup.name}</span>
                <span className="text-sm text-muted-foreground">
                  {t(`systems.${lineup.system}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (rows ?? []).length > 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
          {canManage ? (
            <Link
              href={`/squads/${squad.id}/lineups/new`}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("new")}
            </Link>
          ) : null}
        </div>
      )}

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          {tSquad("players", { count: 0 }).length > 0 ? t("viewOnly") : null}
        </p>
      ) : null}
    </div>
  );
}
