"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";

export type NavItem = { href: string; label: string };

type Props = {
  items: NavItem[];
  label: string;
};

/**
 * Role-filtered navigation, with the current section marked.
 */
export function AppNav({ items, label }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label={label} className="flex items-center gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
