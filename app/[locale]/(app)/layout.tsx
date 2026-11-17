import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AppNav, type NavItem } from "@/components/app-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { signOut } from "@/lib/auth/actions";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect(`/${locale}/sign-in`);
  }

  if (profile.must_change_password) {
    redirect(`/${locale}/change-password`);
  }

  const { data: academy } = await supabase
    .from("academy")
    .select("name")
    .single();

  const t = await getTranslations("Nav");
  const home = await getTranslations("Home");
  const roles = await getTranslations("Roles");

  const items: NavItem[] = [{ href: "/squads", label: t("squads") }];

  if (profile.role === "director") {
    items.push({ href: "/academy", label: t("academy") });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-2.5">
          <Link href="/" aria-label={t("home")}>
            <Wordmark />
          </Link>
          {academy?.name ? (
            <span className="text-sm text-muted-foreground">
              {academy.name}
            </span>
          ) : null}
          <AppNav items={items} label={t("label")} />
          <div className="ms-auto flex items-center gap-3">
            <span className="text-end text-xs leading-tight">
              <span className="block font-medium">{profile.full_name}</span>
              <span className="block text-muted-foreground">
                {roles(profile.role)}
              </span>
            </span>
            <LocaleSwitcher />
            <form action={signOut.bind(null, locale)}>
              <Button type="submit" variant="ghost" size="sm">
                {home("signOut")}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
