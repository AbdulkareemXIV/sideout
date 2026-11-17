"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

const controlClassName =
  "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs";

type SearchFieldProps = {
  label: string;
  placeholder: string;
};

/** Filters the list it sits above, through the q search parameter. */
export function SearchField({ label, placeholder }: SearchFieldProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = useId();
  const [draft, setDraft] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const current = searchParams.get("q") ?? "";

    if (current === draft) {
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (draft) {
        params.set("q", draft);
      } else {
        params.delete("q");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [draft, searchParams, pathname, router]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={id}
          type="search"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          className={`${controlClassName} w-full ps-9`}
        />
      </div>
    </div>
  );
}

type FilterSelectProps = {
  param: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
};

/** A select that narrows the list through one search parameter. */
export function FilterSelect({
  param,
  label,
  allLabel,
  options,
}: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = useId();
  const value = searchParams.get(param) ?? "";

  function apply(next: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (next) {
      params.set(param, next);
    } else {
      params.delete(param);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => apply(event.target.value)}
        className={controlClassName}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
