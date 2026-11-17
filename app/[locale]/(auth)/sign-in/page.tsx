import { getTranslations } from "next-intl/server";

import { Wordmark } from "@/components/wordmark";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const t = await getTranslations("SignIn");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 py-10">
      <div className="flex flex-col gap-6">
        <Wordmark />
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <SignInForm />
    </main>
  );
}
