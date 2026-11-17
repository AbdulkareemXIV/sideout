"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { academySchema } from "./schemas";

export type AcademyState = {
  error: "forbidden" | "invalidInput" | "failed" | null;
  saved: boolean;
  field?: string | null;
};

export async function updateAcademy(
  locale: string,
  _previous: AcademyState,
  formData: FormData,
): Promise<AcademyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "forbidden", saved: false };
  }

  const parsed = academySchema.safeParse({
    name: formData.get("name"),
    seasonStart: formData.get("seasonStart"),
    seasonEnd: formData.get("seasonEnd"),
    defaultBestOf: formData.get("defaultBestOf"),
    defaultSetPoints: formData.get("defaultSetPoints"),
  });

  if (!parsed.success) {
    return {
      error: "invalidInput",
      saved: false,
      field: parsed.error.issues[0]?.path.join(".") ?? null,
    };
  }

  const { data: academy } = await supabase.from("academy").select("id").single();

  if (!academy) {
    return { error: "failed", saved: false };
  }

  const { data, error } = await supabase
    .from("academy")
    .update({
      name: parsed.data.name,
      season_start: parsed.data.seasonStart,
      season_end: parsed.data.seasonEnd,
      default_best_of: parsed.data.defaultBestOf,
      default_set_points: parsed.data.defaultSetPoints,
    })
    .eq("id", academy.id)
    .select("id");

  if (error) {
    return { error: "failed", saved: false };
  }

  if (!data || data.length === 0) {
    return { error: "forbidden", saved: false };
  }

  revalidatePath(`/${locale}/academy`);
  revalidatePath(`/${locale}`);

  return { error: null, saved: true };
}
