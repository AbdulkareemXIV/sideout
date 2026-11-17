import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createWorld, destroyWorld, type Account, type World } from "./harness";

const NEW_PASSWORD = "Changed123!";

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

describe("sign in and password change", () => {
  let world: World;

  beforeAll(async () => {
    world = await createWorld();
  });

  afterAll(async () => {
    await destroyWorld(world);
  });

  it("signs a user in with their username as the email", async () => {
    const { data, error } = await signIn(world.coachA.username, world.coachA.password);

    expect(error).toBeNull();
    expect(data.user?.id).toBe(world.coachA.id);
  });

  it("rejects the wrong password", async () => {
    const { data, error } = await signIn(world.coachA.username, "NotThePassword1!");

    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });

  it("rejects a username that has no account", async () => {
    const { data, error } = await signIn("nobody.here", "Test1234!");

    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });

  it("shows a signed-in user their own profile", async () => {
    const as = await world.as(world.coachA);
    const { data } = await as
      .from("profiles")
      .select("id, username, role, must_change_password")
      .eq("id", world.coachA.id)
      .single();

    expect(data).toEqual({
      id: world.coachA.id,
      username: world.coachA.username,
      role: "coach",
      must_change_password: false,
    });
  });

  it("lets a user change their own preferred language", async () => {
    const as = await world.as(world.playerA);
    const { error } = await as
      .from("profiles")
      .update({ preferred_language: "ar" })
      .eq("id", world.playerA.id);

    expect(error).toBeNull();

    const { data } = await world.admin
      .from("profiles")
      .select("preferred_language")
      .eq("id", world.playerA.id)
      .single();

    expect(data?.preferred_language).toBe("ar");
  });

  it("refuses to let a user give themselves a different role", async () => {
    const as = await world.as(world.playerA);
    await as.from("profiles").update({ role: "director" }).eq("id", world.playerA.id);

    const { data } = await world.admin
      .from("profiles")
      .select("role")
      .eq("id", world.playerA.id)
      .single();

    expect(data?.role).toBe("player");
  });

  it("refuses to let a user change another account", async () => {
    const as = await world.as(world.playerA);
    const { data } = await as
      .from("profiles")
      .update({ preferred_language: "ar" })
      .eq("id", world.coachB.id)
      .select("id");

    expect(data).toEqual([]);
  });

  it("changes the password, and the old one stops working", async () => {
    const account: Account = world.coachB;
    const as = await world.as(account);
    const { error } = await as.auth.updateUser({ password: NEW_PASSWORD });

    expect(error).toBeNull();

    const old = await signIn(account.username, account.password);
    const fresh = await signIn(account.username, NEW_PASSWORD);

    expect(old.error).not.toBeNull();
    expect(fresh.error).toBeNull();
    expect(fresh.data.user?.id).toBe(account.id);
  });
});
