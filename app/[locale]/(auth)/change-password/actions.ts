"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { changePasswordSchema } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";

export type ChangePasswordState = { error: string | null };

export async function changePassword(
  locale: string,
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const t = await getTranslations({ locale, namespace: "ChangePassword" });

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    return { error: password !== confirmation ? t("mismatch") : t("tooShort") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: t("failed") };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  if (profileError) {
    return { error: t("failed") };
  }

  redirect(`/${locale}`);
}
