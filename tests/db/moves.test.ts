import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createWorld, destroyWorld, type World } from "./harness";

const INSUFFICIENT_PRIVILEGE = "42501";
const UNIQUE_VIOLATION = "23505";

describe("moving a player between squads", () => {
  let world: World;

  beforeAll(async () => {
    world = await createWorld();
  });

  afterAll(async () => {
    await destroyWorld(world);
  });

  it("closes the old membership and opens the new one for the director", async () => {
    const as = await world.as(world.director);
    const { error } = await as.rpc("move_player", {
      target_player_id: world.playerInA.id,
      target_squad_id: world.squadB.id,
    });

    expect(error).toBeNull();

    const { data: history } = await as
      .from("squad_memberships")
      .select("squad_id, start_date, end_date")
      .eq("player_id", world.playerInA.id);

    expect(history).toHaveLength(2);

    const open = (history ?? []).filter((row) => row.end_date === null);
    expect(open).toHaveLength(1);
    expect(open[0].squad_id).toBe(world.squadB.id);

    const closed = (history ?? []).filter((row) => row.end_date !== null);
    expect(closed).toHaveLength(1);
    expect(closed[0].squad_id).toBe(world.squadA.id);
    expect(closed[0].end_date! > closed[0].start_date).toBe(true);
  });

  it("hands the player to the coach of the new squad", async () => {
    const coachA = await world.as(world.coachA);
    const coachB = await world.as(world.coachB);

    const seenByOld = await coachA
      .from("players")
      .select("id")
      .eq("id", world.playerInA.id);
    const seenByNew = await coachB
      .from("players")
      .select("id")
      .eq("id", world.playerInA.id);

    expect(seenByOld.data).toEqual([]);
    expect(seenByNew.data).toEqual([{ id: world.playerInA.id }]);
  });

  it("refuses to move a player for a coach", async () => {
    const as = await world.as(world.coachA);
    const { error } = await as.rpc("move_player", {
      target_player_id: world.playerInB.id,
      target_squad_id: world.squadA.id,
    });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const { data } = await world.admin
      .from("squad_memberships")
      .select("squad_id")
      .eq("player_id", world.playerInB.id)
      .is("end_date", null);

    expect(data).toEqual([{ squad_id: world.squadB.id }]);
  });

  it("refuses to move a player into the squad they are already in", async () => {
    const as = await world.as(world.director);
    const { error } = await as.rpc("move_player", {
      target_player_id: world.playerInB.id,
      target_squad_id: world.squadB.id,
    });

    expect(error?.code).toBe(UNIQUE_VIOLATION);

    const { data } = await world.admin
      .from("squad_memberships")
      .select("id")
      .eq("player_id", world.playerInB.id);

    expect(data).toHaveLength(1);
  });
});
