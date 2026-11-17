"use client";

import { useTranslations } from "next-intl";

import { Wordmark } from "@/components/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <Wordmark />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <Link href="/" className={buttonVariants({ variant: "default" })}>
        {t("home")}
      </Link>
    </main>
  );
}
