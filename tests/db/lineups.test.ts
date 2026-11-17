import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createWorld, destroyWorld, type World } from "./harness";

/** Six made-up players: the table stores ids without asking who they are. */
const six = ["a", "b", "c", "d", "e", "f"].map(() => crypto.randomUUID());

const positions = Object.fromEntries(
  six.map((id, index) => [String(index + 1), id]),
);

const base = {
  system: "5-1" as const,
  positions,
  setter_ids: [six[0]!],
  receive_formations: {},
};

describe("saved lineups", () => {
  let world: World;

  beforeAll(async () => {
    world = await createWorld();
  });

  afterAll(async () => {
    await destroyWorld(world);
  });

  it("lets the director save a lineup in any squad", async () => {
    const as = await world.as(world.director);

    const { data, error } = await as
      .from("lineups")
      .insert({
        ...base,
        squad_id: world.squadA.id,
        name: "Starting lineup vs Falcons",
        created_by: world.director.id,
      })
      .select("id, name");

    expect(error).toBeNull();
    expect(data?.[0]?.name).toBe("Starting lineup vs Falcons");
  });

  it("lets a coach save a lineup in their own squad", async () => {
    const as = await world.as(world.coachA);

    const { error } = await as.from("lineups").insert({
      ...base,
      squad_id: world.squadA.id,
      name: "Coach A rotation",
      created_by: world.coachA.id,
    });

    expect(error).toBeNull();
  });

  it("refuses a coach of another squad", async () => {
    const as = await world.as(world.coachB);

    const { error } = await as.from("lineups").insert({
      ...base,
      squad_id: world.squadA.id,
      name: "Not mine",
      created_by: world.coachB.id,
    });

    expect(error?.code).toBe("42501");
  });

  it("shows a player their own squad's lineups but no way to write one", async () => {
    const as = await world.as(world.playerA);

    const { data } = await as
      .from("lineups")
      .select("name")
      .eq("squad_id", world.squadA.id);

    expect(data?.length).toBeGreaterThan(0);

    const { error } = await as.from("lineups").insert({
      ...base,
      squad_id: world.squadA.id,
      name: "Player made this",
      created_by: world.playerA.id,
    });

    expect(error?.code).toBe("42501");
  });

  it("keeps lineup names unique within a squad", async () => {
    const as = await world.as(world.coachA);

    const { error } = await as.from("lineups").insert({
      ...base,
      squad_id: world.squadA.id,
      name: "Coach A rotation",
      created_by: world.coachA.id,
    });

    expect(error?.code).toBe("23505");
  });

  it("wants one setter in 5-1 and two in the other systems", async () => {
    const as = await world.as(world.coachA);

    const oneSetterInSixTwo = await as.from("lineups").insert({
      ...base,
      system: "6-2",
      squad_id: world.squadA.id,
      name: "Wrong setter count",
      created_by: world.coachA.id,
    });

    expect(oneSetterInSixTwo.error?.code).toBe("23514");

    const twoSettersInFourTwo = await as.from("lineups").insert({
      ...base,
      system: "4-2",
      setter_ids: [six[0]!, six[1]!],
      squad_id: world.squadA.id,
      name: "Four two rotation",
      created_by: world.coachA.id,
    });

    expect(twoSettersInFourTwo.error).toBeNull();
  });

  it("deletes a lineup for the squad's coach only", async () => {
    const as = await world.as(world.coachA);
    const other = await world.as(world.coachB);

    const { data } = await as
      .from("lineups")
      .select("id")
      .eq("name", "Four two rotation")
      .single();

    await other.from("lineups").delete().eq("id", data!.id);

    const { count } = await as
      .from("lineups")
      .select("id", { count: "exact", head: true })
      .eq("id", data!.id);

    expect(count).toBe(1);

    await as.from("lineups").delete().eq("id", data!.id);

    const { count: after } = await as
      .from("lineups")
      .select("id", { count: "exact", head: true })
      .eq("id", data!.id);

    expect(after).toBe(0);
  });
});
