"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { signInSchema } from "@/lib/auth/schemas";
import { usernameToEmail } from "@/lib/auth/username";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null };

export async function signIn(
  locale: string,
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const t = await getTranslations({ locale, namespace: "SignIn" });

  const parsed = signInSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: t("invalid") };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(parsed.data.username),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: t("invalid") };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language, must_change_password")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: t("invalid") };
  }

  const next = profile.must_change_password ? "/change-password" : "";

  redirect(`/${profile.preferred_language}${next}`);
}
