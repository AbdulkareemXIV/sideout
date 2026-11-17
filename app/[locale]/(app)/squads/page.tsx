import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { redirect } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

import { NewSquadForm } from "./new-squad-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SquadsPage({ params }: Props) {
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

  const t = await getTranslations("Squads");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {profile?.role === "director" ? <NewSquadForm /> : null}

      {squads && squads.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {squads.map((squad) => (
            <li
              key={squad.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div className="flex flex-col">
                <span className="font-medium">{squad.name}</span>
                <span className="text-sm text-muted-foreground">
                  {squad.age_group}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {t("players", { count: counts.get(squad.id) ?? 0 })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </div>
  );
}
