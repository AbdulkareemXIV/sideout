import { getTranslations } from "next-intl/server";

import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const t = await getTranslations("SignIn");

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <SignInForm />
    </main>
  );
}
