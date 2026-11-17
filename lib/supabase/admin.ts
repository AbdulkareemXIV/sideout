import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

import { supabaseSecretKey, supabaseEnv } from "./env";

// The service-role key bypasses every policy. Only the account-management
// server action may call this, and never from a browser bundle.
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("The service-role client cannot run in the browser.");
  }

  const { url } = supabaseEnv();

  return createClient<Database>(url, supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
