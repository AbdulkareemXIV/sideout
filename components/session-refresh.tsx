"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * A page restored from the back-forward cache is shown from memory without asking
 * the server. Refreshing on restore makes the server check the session again, so a
 * signed-out user lands on the sign-in page instead of the stale screen.
 */
export function SessionRefresh() {
  const router = useRouter();

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        router.refresh();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);

  return null;
}
