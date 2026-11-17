import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createWorld, destroyWorld, type World } from "./harness";

const six = ["a", "b", "c", "d", "e", "f"].map(() => crypto.randomUUID());

const lineup = {
  system: "5-1" as const,
  positions: Object.fromEntries(six.map((id, index) => [String(index + 1), id])),
  setter_ids: [six[0]!],
  receive_formations: {},
};

describe("match mode", () => {
  let world: World;
  let ourLineup: string;
  let matchId: string;

  beforeAll(async () => {
    world = await createWorld();
    const as = await world.as(world.coachA);

    const { data } = await as
      .from("lineups")
      .insert({
        ...lineup,
        squad_id: world.squadA.id,
        name: "Starting six",
        created_by: world.coachA.id,
      })
      .select("id");

    ourLineup = data![0]!.id;

    const { data: match } = await as
      .from("matches")
      .insert({
        squad_id: world.squadA.id,
        lineup_id: ourLineup,
        opponent_name: "Falcons U16",
        created_by: world.coachA.id,
      })
      .select("id");

    matchId = match![0]!.id;
  });

  afterAll(async () => {
    await destroyWorld(world);
  });

  it("starts a match from a lineup in the coach's own squad", async () => {
    const as = await world.as(world.coachA);

    const { error } = await as
      .from("matches")
      .insert({
        squad_id: world.squadA.id,
        lineup_id: ourLineup,
        opponent_name: "Falcons U16",
        best_of: 5,
        set_points: 21,
        created_by: world.coachA.id,
      })
      .select("id");

    expect(error).toBeNull();
  });

  it("refuses a match for a squad the coach does not coach", async () => {
    const as = await world.as(world.coachA);

    const { error } = await as.from("matches").insert({
      squad_id: world.squadB.id,
      lineup_id: ourLineup,
      opponent_name: "Falcons U16",
      created_by: world.coachA.id,
    });

    expect(error?.code).toBe("42501");
  });

  it("keeps other coaches out of the match and its log", async () => {
    const as = await world.as(world.coachB);

    const { data: matches } = await as.from("matches").select("id").eq("id", matchId);
    const { data: events } = await as
      .from("match_events")
      .select("id")
      .eq("match_id", matchId);

    expect(matches).toEqual([]);
    expect(events).toEqual([]);
  });

  it("shows a match to the director and to the squad's players", async () => {
    const asDirector = await world.as(world.director);
    const asPlayer = await world.as(world.playerA);

    const { data: forDirector } = await asDirector
      .from("matches")
      .select("id")
      .eq("id", matchId);
    const { data: forPlayer } = await asPlayer
      .from("matches")
      .select("id")
      .eq("id", matchId);

    expect(forDirector).toHaveLength(1);
    expect(forPlayer).toHaveLength(1);
  });

  it("logs events for the coach and numbers them in order", async () => {
    const as = await world.as(world.coachA);

    const first = await as.from("match_events").insert({
      match_id: matchId,
      seq: 1,
      type: "match_started",
      payload: { bestOf: 3, setPoints: 25, firstServe: "us" },
      created_by: world.coachA.id,
    });

    const second = await as.from("match_events").insert({
      match_id: matchId,
      seq: 2,
      type: "opponent_point",
      payload: { type: "opponent_point" },
      created_by: world.coachA.id,
    });

    const duplicate = await as.from("match_events").insert({
      match_id: matchId,
      seq: 2,
      type: "timeout",
      payload: { type: "timeout", team: "us" },
      created_by: world.coachA.id,
    });

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(duplicate.error?.code).toBe("23505");
  });

  it("keeps players from writing to the log", async () => {
    const as = await world.as(world.playerA);

    const { error } = await as.from("match_events").insert({
      match_id: matchId,
      seq: 99,
      type: "opponent_point",
      payload: {},
      created_by: world.playerA.id,
    });

    expect(error?.code).toBe("42501");
  });
});
