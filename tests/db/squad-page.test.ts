import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createWorld, destroyWorld, type Client, type World } from "./harness";

/**
 * The queries the squad page runs: the squad, its open memberships and the players
 * in them. Row-level security decides who sees what.
 */
async function openSquad(client: Client, squadId: string) {
  const { data: squad } = await client
    .from("squads")
    .select("id, name, age_group")
    .eq("id", squadId)
    .maybeSingle();

  if (!squad) {
    return { squad: null, players: [] as { id: string; full_name: string }[] };
  }

  const { data: memberships } = await client
    .from("squad_memberships")
    .select("player_id")
    .eq("squad_id", squad.id)
    .is("end_date", null);

  const playerIds = (memberships ?? []).map((row) => row.player_id);

  const { data: players } =
    playerIds.length > 0
      ? await client
          .from("players")
          .select("id, full_name")
          .in("id", playerIds)
      : { data: [] };

  return { squad, players: players ?? [] };
}

describe("opening a squad", () => {
  let world: World;

  beforeAll(async () => {
    world = await createWorld();
  });

  afterAll(async () => {
    await destroyWorld(world);
  });

  it("loads the squad and its roster for the director", async () => {
    const as = await world.as(world.director);
    const opened = await openSquad(as, world.squadA.id);

    expect(opened.squad?.id).toBe(world.squadA.id);
    expect(opened.players.map((player) => player.id)).toContain(
      world.playerInA.id,
    );
  });

  it("loads the squad and its roster for the squad's own coach", async () => {
    const as = await world.as(world.coachA);
    const opened = await openSquad(as, world.squadA.id);

    expect(opened.squad?.id).toBe(world.squadA.id);
    expect(opened.players.map((player) => player.id)).toContain(
      world.playerInA.id,
    );
  });

  it("refuses the squad to a coach of another squad", async () => {
    const as = await world.as(world.coachB);
    const opened = await openSquad(as, world.squadA.id);

    expect(opened.squad).toBeNull();
    expect(opened.players).toEqual([]);
  });
});
