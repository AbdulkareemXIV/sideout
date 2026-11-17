import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createWorld, destroyWorld, type World } from "./harness";

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

describe("module 1 schema", () => {
  let world: World;

  beforeAll(async () => {
    world = await createWorld();
  });

  afterAll(async () => {
    await destroyWorld(world);
  });

  it("allows exactly one academy row", async () => {
    const { error } = await world.admin.from("academy").insert({
      name: "A second academy",
      season_start: "2026-09-01",
      season_end: "2027-06-30",
    });

    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  it("rejects a season that ends before it starts", async () => {
    const { error } = await world.admin
      .from("academy")
      .update({ season_end: "2020-01-01" })
      .eq("id", world.academyId);

    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("rejects a malformed username", async () => {
    const { error } = await world.admin
      .from("profiles")
      .update({ username: "Not A Username" })
      .eq("id", world.coachA.id);

    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("rejects a duplicate username", async () => {
    const { error } = await world.admin
      .from("profiles")
      .update({ username: world.coachB.username })
      .eq("id", world.coachA.id);

    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  it("rejects a duplicate squad name", async () => {
    const { error } = await world.admin
      .from("squads")
      .insert({ name: world.squadA.name, age_group: "U16" });

    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  it("allows only one open membership per player", async () => {
    const { error } = await world.admin.from("squad_memberships").insert({
      player_id: world.playerInA.id,
      squad_id: world.squadB.id,
      start_date: "2026-02-01",
    });

    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  it("rejects a membership that ends before it starts", async () => {
    const { error } = await world.admin
      .from("squad_memberships")
      .update({ end_date: "2025-12-01" })
      .eq("id", world.membershipInA);

    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("rejects an out-of-range jersey number", async () => {
    const { error } = await world.admin.from("players").insert({
      full_name: "Test Player C",
      primary_position: "setter",
      jersey_number: 100,
    });

    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("rejects two player records sharing one account", async () => {
    const { error } = await world.admin.from("players").insert({
      user_id: world.playerA.id,
      full_name: "Test Player D",
      primary_position: "libero",
    });

    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });
});
