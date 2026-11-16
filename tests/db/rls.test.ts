import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createWorld, destroyWorld, type World } from "./harness";

const INSUFFICIENT_PRIVILEGE = "42501";

describe("row-level security for module 1", () => {
  let world: World;

  beforeAll(async () => {
    world = await createWorld();
  });

  afterAll(async () => {
    await destroyWorld(world);
  });

  it("lets the director read the whole academy", async () => {
    const as = await world.as(world.director);

    const squads = await as.from("squads").select("id");
    const players = await as.from("players").select("id");
    const profiles = await as.from("profiles").select("id");
    const academy = await as.from("academy").select("id");

    expect(squads.data).toHaveLength(2);
    expect(players.data).toHaveLength(2);
    expect(profiles.data).toHaveLength(4);
    expect(academy.data).toHaveLength(1);
  });

  it("shows a coach only the squads they are assigned to", async () => {
    const as = await world.as(world.coachA);
    const { data } = await as.from("squads").select("id");

    expect(data).toEqual([{ id: world.squadA.id }]);
  });

  it("shows a coach only the players of their own squads", async () => {
    const as = await world.as(world.coachA);
    const { data } = await as.from("players").select("id");

    expect(data).toEqual([{ id: world.playerInA.id }]);
  });

  it("shows a coach their own account and their players' accounts only", async () => {
    const as = await world.as(world.coachA);
    const { data } = await as.from("profiles").select("id");

    const ids = (data ?? []).map((row) => row.id);

    expect(ids).toContain(world.coachA.id);
    expect(ids).toContain(world.playerA.id);
    expect(ids).not.toContain(world.coachB.id);
    expect(ids).not.toContain(world.director.id);
  });

  it("refuses to let a coach create a squad", async () => {
    const as = await world.as(world.coachA);
    const { error } = await as
      .from("squads")
      .insert({ name: "Coach made this", age_group: "U16" });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("refuses to let a coach assign coaches", async () => {
    const as = await world.as(world.coachA);
    const { error } = await as
      .from("coach_assignments")
      .insert({ coach_id: world.coachA.id, squad_id: world.squadB.id });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("refuses to let a coach add a player to a squad they do not coach", async () => {
    const as = await world.as(world.coachA);
    const { error } = await as.from("squad_memberships").insert({
      player_id: world.playerInB.id,
      squad_id: world.squadB.id,
      start_date: "2026-03-01",
    });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("refuses to let a coach close a membership", async () => {
    const as = await world.as(world.coachA);
    const { data } = await as
      .from("squad_memberships")
      .update({ end_date: "2026-06-01" })
      .eq("id", world.membershipInA)
      .select("id");

    expect(data).toEqual([]);

    const { data: membership } = await world.admin
      .from("squad_memberships")
      .select("end_date")
      .eq("id", world.membershipInA)
      .single();

    expect(membership?.end_date).toBeNull();
  });

  it("shows a player their own record and nobody else's", async () => {
    const as = await world.as(world.playerA);

    const own = await as.from("players").select("id");
    const other = await as
      .from("players")
      .select("id")
      .eq("id", world.playerInB.id);

    expect(own.data).toEqual([{ id: world.playerInA.id }]);
    expect(other.data).toEqual([]);
  });

  it("shows a player their own squad only", async () => {
    const as = await world.as(world.playerA);
    const { data } = await as.from("squads").select("id");

    expect(data).toEqual([{ id: world.squadA.id }]);
  });

  it("refuses to let a player change their player record", async () => {
    const as = await world.as(world.playerA);
    const { data } = await as
      .from("players")
      .update({ jersey_number: 99 })
      .eq("id", world.playerInA.id)
      .select("id");

    expect(data).toEqual([]);
  });

  it("refuses to let a player create a squad", async () => {
    const as = await world.as(world.playerA);
    const { error } = await as
      .from("squads")
      .insert({ name: "Player made this", age_group: "U16" });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("lets a player change only their language and password flag", async () => {
    const as = await world.as(world.playerA);

    const language = await as
      .from("profiles")
      .update({ preferred_language: "ar" })
      .eq("id", world.playerA.id)
      .select("preferred_language");

    expect(language.error).toBeNull();
    expect(language.data).toEqual([{ preferred_language: "ar" }]);

    const name = await as
      .from("profiles")
      .update({ full_name: "Changed by the browser" })
      .eq("id", world.playerA.id);

    expect(name.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("shows nothing at all to a visitor who is not signed in", async () => {
    const academy = await world.anonymous.from("academy").select("id");
    const squads = await world.anonymous.from("squads").select("id");
    const players = await world.anonymous.from("players").select("id");

    expect(academy.data).toEqual([]);
    expect(squads.data).toEqual([]);
    expect(players.data).toEqual([]);
  });

  it("lets the director move a player and keeps both memberships", async () => {
    const as = await world.as(world.director);

    const closed = await as
      .from("squad_memberships")
      .update({ end_date: "2026-06-01" })
      .eq("id", world.membershipInA)
      .select("id");

    expect(closed.error).toBeNull();
    expect(closed.data).toHaveLength(1);

    const opened = await as
      .from("squad_memberships")
      .insert({
        player_id: world.playerInA.id,
        squad_id: world.squadB.id,
        start_date: "2026-06-02",
      })
      .select("id");

    expect(opened.error).toBeNull();

    const history = await as
      .from("squad_memberships")
      .select("id")
      .eq("player_id", world.playerInA.id);

    expect(history.data).toHaveLength(2);

    const coachA = await world.as(world.coachA);
    const coachB = await world.as(world.coachB);
    const seenByCoachA = await coachA.from("players").select("id");
    const seenByCoachB = await coachB.from("players").select("id");

    expect(seenByCoachA.data).toEqual([]);
    expect(seenByCoachB.data).toHaveLength(2);
    expect(seenByCoachB.data).toContainEqual({ id: world.playerInA.id });
  });
});
