import { randomInt } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

import { normalizeUsername, USERNAME_PATTERN, usernameToEmail } from "./username";

export type AccountError =
  | "forbidden"
  | "invalidUsername"
  | "usernameTaken"
  | "notFound"
  | "alreadyHasAccount"
  | "failed";

export type AccountResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AccountError };

export type CreatedAccount = {
  profileId: string;
  username: string;
  temporaryPassword: string;
};

type Admin = ReturnType<typeof createAdminClient>;

// No 0/O or 1/l: the password is read out loud and written on paper.
const PASSWORD_ALPHABET =
  "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_LENGTH = 12;

export function temporaryPassword(): string {
  let password = "";

  for (let index = 0; index < PASSWORD_LENGTH; index += 1) {
    password += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }

  return password;
}

async function loadActor(admin: Admin, actorId: string) {
  const { data } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", actorId)
    .maybeSingle();

  return data;
}

async function currentSquadOf(admin: Admin, playerId: string) {
  const { data } = await admin
    .from("squad_memberships")
    .select("squad_id")
    .eq("player_id", playerId)
    .is("end_date", null)
    .maybeSingle();

  return data?.squad_id ?? null;
}

async function coachesSquad(admin: Admin, coachId: string, squadId: string) {
  const { data } = await admin
    .from("coach_assignments")
    .select("id")
    .eq("coach_id", coachId)
    .eq("squad_id", squadId)
    .maybeSingle();

  return Boolean(data);
}

async function coachesPlayersSquad(
  admin: Admin,
  coachId: string,
  playerId: string,
) {
  const squadId = await currentSquadOf(admin, playerId);

  if (!squadId) {
    return false;
  }

  return coachesSquad(admin, coachId, squadId);
}

async function createAccount(
  role: "coach" | "player",
  username: string,
  fullName: string,
): Promise<AccountResult<CreatedAccount>> {
  const admin = createAdminClient();
  const handle = normalizeUsername(username);

  if (!USERNAME_PATTERN.test(handle)) {
    return { ok: false, error: "invalidUsername" };
  }

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("username", handle)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "usernameTaken" };
  }

  const password = temporaryPassword();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: usernameToEmail(handle),
    password,
    email_confirm: true,
  });

  if (authError || !created.user) {
    return {
      ok: false,
      error: authError?.code === "email_exists" ? "usernameTaken" : "failed",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    role,
    username: handle,
    full_name: fullName.trim(),
    must_change_password: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);

    return {
      ok: false,
      error: profileError.code === "23505" ? "usernameTaken" : "failed",
    };
  }

  return {
    ok: true,
    value: {
      profileId: created.user.id,
      username: handle,
      temporaryPassword: password,
    },
  };
}

export async function createCoachAccount(input: {
  actorId: string;
  username: string;
  fullName: string;
}): Promise<AccountResult<CreatedAccount>> {
  const admin = createAdminClient();
  const actor = await loadActor(admin, input.actorId);

  if (actor?.role !== "director") {
    return { ok: false, error: "forbidden" };
  }

  return createAccount("coach", input.username, input.fullName);
}

export async function createPlayerAccount(input: {
  actorId: string;
  playerId: string;
  username: string;
}): Promise<AccountResult<CreatedAccount>> {
  const admin = createAdminClient();
  const actor = await loadActor(admin, input.actorId);

  if (!actor || actor.role === "player") {
    return { ok: false, error: "forbidden" };
  }

  const { data: player } = await admin
    .from("players")
    .select("id, full_name, user_id")
    .eq("id", input.playerId)
    .maybeSingle();

  if (!player) {
    return { ok: false, error: "notFound" };
  }

  if (player.user_id) {
    return { ok: false, error: "alreadyHasAccount" };
  }

  if (actor.role === "coach" && !(await coachesPlayersSquad(admin, actor.id, player.id))) {
    return { ok: false, error: "forbidden" };
  }

  const created = await createAccount("player", input.username, player.full_name);

  if (!created.ok) {
    return created;
  }

  const { error } = await admin
    .from("players")
    .update({ user_id: created.value.profileId })
    .eq("id", player.id);

  if (error) {
    await admin.from("profiles").delete().eq("id", created.value.profileId);
    await admin.auth.admin.deleteUser(created.value.profileId);

    return { ok: false, error: "failed" };
  }

  return created;
}

export async function resetPassword(input: {
  actorId: string;
  profileId: string;
}): Promise<AccountResult<{ temporaryPassword: string }>> {
  const admin = createAdminClient();
  const actor = await loadActor(admin, input.actorId);

  if (!actor || actor.role === "player" || actor.id === input.profileId) {
    return { ok: false, error: "forbidden" };
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", input.profileId)
    .maybeSingle();

  if (!target) {
    return { ok: false, error: "notFound" };
  }

  if (actor.role === "coach") {
    if (target.role !== "player") {
      return { ok: false, error: "forbidden" };
    }

    const { data: player } = await admin
      .from("players")
      .select("id")
      .eq("user_id", target.id)
      .maybeSingle();

    if (!player || !(await coachesPlayersSquad(admin, actor.id, player.id))) {
      return { ok: false, error: "forbidden" };
    }
  }

  const password = temporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(target.id, { password });

  if (error) {
    return { ok: false, error: "failed" };
  }

  const { error: flagError } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", target.id);

  if (flagError) {
    return { ok: false, error: "failed" };
  }

  return { ok: true, value: { temporaryPassword: password } };
}
