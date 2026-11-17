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
          d="M12 2c3.2 2.6 4.6 6 4.6 10S15.2 19.4 12 22M12 2C8.8 4.6 7.4 8 7.4 12s1.4 7.4 4.6 10M2.4 9.2c4.6 1.2 14.6 1.2 19.2 0M2.4 14.8c4.6-1.2 14.6-1.2 19.2 0"
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
