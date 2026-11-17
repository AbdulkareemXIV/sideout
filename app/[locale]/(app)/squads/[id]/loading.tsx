import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";

export default async function SquadLoading() {
  const t = await getTranslations("Common");

  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">{t("loading")}</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24" />
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
