"use server";

import { createClient } from "@/lib/supabase/server";

import {
  createCoachAccount,
  createPlayerAccount,
  resetPassword,
  type AccountError,
} from "./accounts";
import {
  createCoachAccountSchema,
  createPlayerAccountSchema,
  resetPasswordSchema,
} from "./schemas";

export type AccountActionState = {
  error: AccountError | "invalidInput" | null;
  username: string | null;
  temporaryPassword: string | null;
};

const EMPTY: AccountActionState = {
  error: null,
  username: null,
  temporaryPassword: null,
};

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return data.user?.id ?? null;
}

export async function createCoachAccountAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const actorId = await currentUserId();

  if (!actorId) {
    return { ...EMPTY, error: "forbidden" };
  }

  const parsed = createCoachAccountSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { ...EMPTY, error: "invalidInput" };
  }

  const result = await createCoachAccount({ actorId, ...parsed.data });

  return result.ok
    ? {
        error: null,
        username: result.value.username,
        temporaryPassword: result.value.temporaryPassword,
      }
    : { ...EMPTY, error: result.error };
}

export async function createPlayerAccountAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const actorId = await currentUserId();

  if (!actorId) {
    return { ...EMPTY, error: "forbidden" };
  }

  const parsed = createPlayerAccountSchema.safeParse({
    username: formData.get("username"),
    playerId: formData.get("playerId"),
  });

  if (!parsed.success) {
    return { ...EMPTY, error: "invalidInput" };
  }

  const result = await createPlayerAccount({ actorId, ...parsed.data });

  return result.ok
    ? {
        error: null,
        username: result.value.username,
        temporaryPassword: result.value.temporaryPassword,
      }
    : { ...EMPTY, error: result.error };
}

export async function resetPasswordAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const actorId = await currentUserId();

  if (!actorId) {
    return { ...EMPTY, error: "forbidden" };
  }

  const parsed = resetPasswordSchema.safeParse({
    profileId: formData.get("profileId"),
  });

  if (!parsed.success) {
    return { ...EMPTY, error: "invalidInput" };
  }

  const result = await resetPassword({ actorId, ...parsed.data });

  return result.ok
    ? {
        error: null,
        username: null,
        temporaryPassword: result.value.temporaryPassword,
      }
    : { ...EMPTY, error: result.error };
}
