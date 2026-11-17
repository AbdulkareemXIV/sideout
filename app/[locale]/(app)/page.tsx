import { redirect } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * Each role lands on its home: a player on their squad, everyone else on the
 * squads list, which is the academy overview until the dashboard exists.
 */
export default async function HomePage({ params }: Props) {
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

  if (profile?.role === "player") {
    const { data: squad } = await supabase
      .from("squads")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (squad) {
      return redirect({ href: `/squads/${squad.id}`, locale });
    }
  }

  return redirect({ href: "/squads", locale });
}
