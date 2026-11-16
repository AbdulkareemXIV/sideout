import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">{t("heading")}</h1>
      <p className="mt-3 text-muted-foreground">{t("intro")}</p>
    </main>
  );
}
