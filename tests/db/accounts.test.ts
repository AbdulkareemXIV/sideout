import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCoachAccount,
  createPlayerAccount,
  resetPassword,
} from "@/lib/auth/accounts";

import { createWorld, destroyWorld, type World } from "./harness";

function signIn(username: string, password: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  return client.auth.signInWithPassword({
    email: `${username}@sideout.local`,
    password,
  });
}

describe("account management", () => {
  let world: World;
  let run: string;
  let playerInSquadA: string;
  let playerInSquadB: string;
  let playerAccountProfileId: string;
  const createdProfiles: string[] = [];

  beforeAll(async () => {
    world = await createWorld();
    run = Date.now().toString(36).toLowerCase();

    const { data: players, error } = await world.admin
      .from("players")
      .insert([
        { full_name: "Account Player A", primary_position: "setter" },
        { full_name: "Account Player B", primary_position: "libero" },
      ])
      .select("id, full_name");

    if (error || !players) {
      throw error ?? new Error("Could not create the account test players");
    }

    const inA = players.find((player) => player.full_name === "Account Player A")!;
    const inB = players.find((player) => player.full_name === "Account Player B")!;
    playerInSquadA = inA.id;
    playerInSquadB = inB.id;

    await world.admin.from("squad_memberships").insert([
      { player_id: inA.id, squad_id: world.squadA.id, start_date: "2026-01-01" },
      { player_id: inB.id, squad_id: world.squadB.id, start_date: "2026-01-01" },
    ]);
  });

  afterAll(async () => {
    await world.admin
      .from("squad_memberships")
      .delete()
      .in("player_id", [playerInSquadA, playerInSquadB]);
    await world.admin
      .from("players")
      .delete()
      .in("id", [playerInSquadA, playerInSquadB]);
    await world.admin.from("profiles").delete().in("id", createdProfiles);

    for (const id of createdProfiles) {
      await world.admin.auth.admin.deleteUser(id);
    }

    await destroyWorld(world);
  });

  it("lets the director create a coach account with a temporary password", async () => {
    const result = await createCoachAccount({
      actorId: world.director.id,
      username: `new.coach.${run}`,
      fullName: "New Coach",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    createdProfiles.push(result.value.profileId);

    const { data: profile } = await world.admin
      .from("profiles")
      .select("role, username, full_name, must_change_password")
      .eq("id", result.value.profileId)
      .single();

    expect(profile).toEqual({
      role: "coach",
      username: `new.coach.${run}`,
      full_name: "New Coach",
      must_change_password: true,
    });

    expect(result.value.temporaryPassword.length).toBeGreaterThanOrEqual(8);

    const login = await signIn(`new.coach.${run}`, result.value.temporaryPassword);
    expect(login.error).toBeNull();
    expect(login.data.user?.id).toBe(result.value.profileId);
  });

  it("refuses to let a coach create a coach account", async () => {
    const result = await createCoachAccount({
      actorId: world.coachA.id,
      username: `coach.by.coach.${run}`,
      fullName: "Not Allowed",
    });

    expect(result).toEqual({ ok: false, error: "forbidden" });

    const { data } = await world.admin
      .from("profiles")
      .select("id")
      .eq("username", `coach.by.coach.${run}`);

    expect(data).toEqual([]);
  });

  it("lets a coach create a player account for their own squad", async () => {
    const result = await createPlayerAccount({
      actorId: world.coachA.id,
      playerId: playerInSquadA,
      username: `player.a.acc.${run}`,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    playerAccountProfileId = result.value.profileId;
    createdProfiles.push(result.value.profileId);

    const { data: profile } = await world.admin
      .from("profiles")
      .select("role, full_name, must_change_password")
      .eq("id", result.value.profileId)
      .single();

    expect(profile).toEqual({
      role: "player",
      full_name: "Account Player A",
      must_change_password: true,
    });

    const { data: player } = await world.admin
      .from("players")
      .select("user_id")
      .eq("id", playerInSquadA)
      .single();

    expect(player?.user_id).toBe(result.value.profileId);
  });

  it("refuses to let a coach create a player account for another squad", async () => {
    const result = await createPlayerAccount({
      actorId: world.coachA.id,
      playerId: playerInSquadB,
      username: `player.b.acc.${run}`,
    });

    expect(result).toEqual({ ok: false, error: "forbidden" });

    const { data: player } = await world.admin
      .from("players")
      .select("user_id")
      .eq("id", playerInSquadB)
      .single();

    expect(player?.user_id).toBeNull();
  });

  it("refuses to let a player create any account", async () => {
    const result = await createPlayerAccount({
      actorId: world.playerA.id,
      playerId: playerInSquadB,
      username: `by.player.${run}`,
    });

    expect(result).toEqual({ ok: false, error: "forbidden" });
  });

  it("refuses a username that is already taken", async () => {
    const result = await createCoachAccount({
      actorId: world.director.id,
      username: world.coachA.username,
      fullName: "Duplicate",
    });

    expect(result).toEqual({ ok: false, error: "usernameTaken" });

    const { data } = await world.admin
      .from("profiles")
      .select("id")
      .eq("username", world.coachA.username);

    expect(data).toHaveLength(1);
  });

  it("lets the director reset a coach password", async () => {
    const result = await resetPassword({
      actorId: world.director.id,
      profileId: world.coachB.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const oldLogin = await signIn(world.coachB.username, world.coachB.password);
    const newLogin = await signIn(world.coachB.username, result.value.temporaryPassword);

    expect(oldLogin.error).not.toBeNull();
    expect(newLogin.error).toBeNull();

    const { data: profile } = await world.admin
      .from("profiles")
      .select("must_change_password")
      .eq("id", world.coachB.id)
      .single();

    expect(profile?.must_change_password).toBe(true);
  });

  it("lets a coach reset a password for a player in their own squad", async () => {
    const result = await resetPassword({
      actorId: world.coachA.id,
      profileId: playerAccountProfileId,
    });

    expect(result.ok).toBe(true);
  });

  it("refuses to let a coach reset a password for a player in another squad", async () => {
    const result = await resetPassword({
      actorId: world.coachB.id,
      profileId: playerAccountProfileId,
    });

    expect(result).toEqual({ ok: false, error: "forbidden" });
  });

  it("refuses to let a coach reset another coach's password", async () => {
    const result = await resetPassword({
      actorId: world.coachA.id,
      profileId: world.coachB.id,
    });

    expect(result).toEqual({ ok: false, error: "forbidden" });
  });
});
