import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";
import { routing } from "@/lib/i18n/routing";
import { supabaseEnv } from "@/lib/supabase/env";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes the session and writes the rotated cookies.
  await supabase.auth.getUser();

  const localized = handleI18nRouting(request);

  for (const cookie of response.cookies.getAll()) {
    localized.cookies.set(cookie);
  }

  return localized;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
