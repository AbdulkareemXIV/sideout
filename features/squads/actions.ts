"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { squadSchema } from "./schemas";

export type SquadState = {
  error: "forbidden" | "invalidInput" | "failed" | null;
  created: boolean;
};

export async function createSquad(
  locale: string,
  _previous: SquadState,
  formData: FormData,
): Promise<SquadState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "forbidden", created: false };
  }

  const parsed = squadSchema.safeParse({
    name: formData.get("name"),
    ageGroup: formData.get("ageGroup"),
  });

  if (!parsed.success) {
    return { error: "invalidInput", created: false };
  }

  const { data, error } = await supabase
    .from("squads")
    .insert({ name: parsed.data.name, age_group: parsed.data.ageGroup })
    .select("id");

  if (error) {
    return {
      error: error.code === "42501" ? "forbidden" : "failed",
      created: false,
    };
  }

  if (!data || data.length === 0) {
    return { error: "forbidden", created: false };
  }

  revalidatePath(`/${locale}/squads`);

  return { error: null, created: true };
}
