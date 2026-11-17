import { ChevronLeft, ChevronRight } from "lucide-react";

import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  description?: string;
  back?: { href: string; label: string };
  breadcrumbs?: Crumb[];
  breadcrumbsLabel?: string;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Page title, optional breadcrumbs and back link, and an actions slot.
 */
export function PageHeader({
  title,
  description,
  back,
  breadcrumbs,
  breadcrumbsLabel,
  actions,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {back ? (
        <Link
          href={back.href}
          className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {back.label}
        </Link>
      ) : null}

      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label={breadcrumbsLabel}>
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? (
                  <ChevronRight
                    aria-hidden="true"
                    className="size-3.5 rtl:rotate-180"
                  />
                ) : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-foreground">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
    </div>
  );
}
