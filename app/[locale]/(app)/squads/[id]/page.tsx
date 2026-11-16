import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link, redirect } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

import {
  AccountControl,
  AddPlayerForm,
  AssignCoachForm,
  MovePlayerForm,
  RemoveCoachForm,
} from "./squad-forms";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function SquadPage({ params }: Props) {
  const { locale, id } = await params;
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

  const { data: memberships } = await supabase
    .from("squad_memberships")
    .select("player_id")
    .eq("squad_id", squad.id)
    .is("end_date", null);

  const playerIds = (memberships ?? []).map((row) => row.player_id);

  const { data: players } =
    playerIds.length > 0
      ? await supabase
          .from("players")
          .select(
            "id, full_name, jersey_number, primary_position, dominant_hand, user_id",
          )
          .in("id", playerIds)
          .order("jersey_number")
      : { data: [] };

  const { data: assignments } = await supabase
    .from("coach_assignments")
    .select("coach_id")
    .eq("squad_id", squad.id);

  const coachIds = (assignments ?? []).map((row) => row.coach_id);

  const { data: coaches } =
    coachIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", coachIds)
          .order("full_name")
      : { data: [] };

  const isDirector = profile?.role === "director";
  const canManage = isDirector || profile?.role === "coach";

  const { data: assignable } = isDirector
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "coach")
        .order("full_name")
    : { data: [] };

  const { data: otherSquads } = isDirector
    ? await supabase
        .from("squads")
        .select("id, name")
        .neq("id", squad.id)
        .order("age_group")
    : { data: [] };

  const t = await getTranslations("Squad");
  const tSquads = await getTranslations("Squads");

  const unassigned = (assignable ?? []).filter(
    (candidate) => !coachIds.includes(candidate.id),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-1">
        <Link href="/squads" className="text-sm text-muted-foreground">
          {t("back")}
        </Link>
        <h1 className="text-3xl font-semibold">{squad.name}</h1>
        <p className="text-muted-foreground">
          {squad.age_group} ·{" "}
          {tSquads("players", { count: playerIds.length })}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("roster")}</h2>

        {players && players.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {players.map((player) => (
              <li key={player.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {player.jersey_number !== null
                        ? `${player.jersey_number} · ${player.full_name}`
                        : player.full_name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t(`positions.${player.primary_position}`)} ·{" "}
                      {t(`hands.${player.dominant_hand}`)}
                    </span>
                  </div>

                  {isDirector && otherSquads && otherSquads.length > 0 ? (
                    <MovePlayerForm
                      playerId={player.id}
                      squads={otherSquads}
                    />
                  ) : null}
                </div>

                {canManage ? (
                  <div className="mt-3 border-t pt-3">
                    <AccountControl
                      playerId={player.id}
                      hasAccount={Boolean(player.user_id)}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("emptyRoster")}</p>
        )}

        {canManage ? <AddPlayerForm squadId={squad.id} /> : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("coaches")}</h2>

        {coaches && coaches.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {coaches.map((coach) => (
              <li
                key={coach.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <span>
                  {coach.full_name}{" "}
                  <span className="text-sm text-muted-foreground">
                    {coach.username}
                  </span>
                </span>
                {isDirector ? (
                  <RemoveCoachForm squadId={squad.id} coachId={coach.id} />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noCoaches")}</p>
        )}

        {isDirector && unassigned.length > 0 ? (
          <AssignCoachForm squadId={squad.id} coaches={unassigned} />
        ) : null}
      </section>
    </main>
  );
}
