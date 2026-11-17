"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

type Props = {
  items: NavItem[];
  labels: { label: string; menu: string };
};

const linkClass =
  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground";

/**
 * Role-filtered navigation: inline on desktop, behind a menu button on phones.
 */
export function AppNav({ items, labels }: Props) {
  const pathname = usePathname();
  // Opening is tied to the page it was opened on, so navigating closes the menu
  // without an effect that resets state.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenAt(null);
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const links = items.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={linkClass}
    >
      {item.label}
    </Link>
  ));
  return (
    <>
      <nav
        aria-label={labels.label}
        className="hidden md:order-3 md:flex md:items-center md:gap-1"
      >
        {links}
      </nav>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="app-nav"
        onClick={() => setOpenAt(open ? null : pathname)}
        className="order-4 inline-flex size-11 items-center justify-center rounded-md text-foreground hover:bg-accent md:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
        <span className="sr-only">{labels.menu}</span>
      </button>
      <nav
        id="app-nav"
        aria-label={labels.label}
        className={cn(
          "order-5 w-full flex-col gap-1 pb-2 md:hidden",
          open ? "flex" : "hidden",
        )}
      >
        {links}
      </nav>
    </>
  );
}
