import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Oswald, Public_Sans } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { getDirection } from "@/lib/i18n/direction";
import { routing } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

import "../globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-arabic",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      className={cn(
        oswald.variable,
        publicSans.variable,
        plexArabic.variable,
      )}
    >
      <body>
        <NextIntlClientProvider>
          <header className="flex justify-end border-b px-4 py-2">
            <LocaleSwitcher />
          </header>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
