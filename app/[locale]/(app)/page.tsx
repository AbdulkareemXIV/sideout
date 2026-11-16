import { getTranslations } from "next-intl/server";

import { Button, buttonVariants } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("Home");
  const nav = await getTranslations("Nav");
  const roles = await getTranslations("Roles");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const { data: academy } = await supabase
    .from("academy")
    .select("name")
    .single();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{academy?.name}</h1>
        {profile ? (
          <p className="text-muted-foreground">
            {t("signedInAs", { name: profile.full_name })}
            {" · "}
            {roles(profile.role)}
          </p>
        ) : null}
      </div>

      <nav className="flex flex-wrap gap-2">
        <Link href="/squads" className={buttonVariants({ variant: "outline" })}>
          {nav("squads")}
        </Link>
        {profile?.role === "director" ? (
          <Link
            href="/academy"
            className={buttonVariants({ variant: "outline" })}
          >
            {nav("academy")}
          </Link>
        ) : null}
      </nav>
      <form action={signOut.bind(null, locale)}>
        <Button type="submit" variant="outline">
          {t("signOut")}
        </Button>
      </form>
    </main>
  );
}
