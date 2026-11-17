"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const signInPath = (locale: string) => `/${locale}/sign-in`;

/** The sign-in page is closed to anyone already signed in. */
export async function redirectIfSignedIn(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${locale}`);
  }
}

export async function signOut(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Signed-in pages are rendered per request and never cached, so the back
  // button has nothing stale to show after the cookies are gone.
  revalidatePath("/", "layout");

  redirect(signInPath(locale));
}
