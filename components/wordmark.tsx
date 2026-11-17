import { cn } from "@/lib/utils";

/**
 * Sideout wordmark: a ball mark plus the name in Oswald, used in the app header
 * and on the sign-in page.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6 shrink-0"
        fill="none"
      >
        <circle cx="12" cy="12" r="10" className="fill-primary" />
        <path
          d="M11.1 7.1a16.55 16.55 0 0 1 10.9 4M12 12a12.6 12.6 0 0 1-8.7 5M16.8 13.6a16.55 16.55 0 0 1-9 7.5M20.7 17a12.8 12.8 0 0 0-8.7-5 13.3 13.3 0 0 1 0-10M6.3 3.8a16.55 16.55 0 0 0 1.9 11.5"
          className="stroke-foreground"
          strokeWidth="1.1"
        />
      </svg>
      <span className="font-heading text-lg font-semibold tracking-[0.1em] text-foreground uppercase">
        Sideout
      </span>
    </span>
  );
}
