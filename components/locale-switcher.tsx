"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="flex items-center gap-1">
      {routing.locales.map((target) => (
        <Link
          key={target}
          href={pathname}
          locale={target}
          hrefLang={target}
          aria-current={target === locale ? "true" : undefined}
          className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground aria-[current=true]:font-semibold aria-[current=true]:text-foreground"
        >
          {t(target)}
        </Link>
      ))}
    </nav>
  );
}
