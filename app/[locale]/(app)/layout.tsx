import { redirect } from "next/navigation";

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
    .select("must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect(`/${locale}/sign-in`);
  }

  if (profile.must_change_password) {
    redirect(`/${locale}/change-password`);
  }

  return <>{children}</>;
}
