import { describe, expect, it } from "vitest";

import {
  matchState,
  pointFor,
  setsToWin,
  targetPoints,
  undoableEvent,
  type MatchConfig,
  type MatchEvent,
  type MatchEventInput,
} from "@/features/match/engine";

const config: MatchConfig = { bestOf: 3, setPoints: 25, firstServe: "us" };

function log(...events: MatchEventInput[]): MatchEvent[] {
  return events.map((event, index) => ({ id: `e${index + 1}`, event }));
}

const ourPoint: MatchEventInput = {
  type: "stat",
  team: "us",
  playerId: "p1",
  action: "attack",
  result: "kill",
};

const theirPoint: MatchEventInput = { type: "opponent_point" };

describe("scoring a match", () => {
  it("counts one point per rally", () => {
    const state = matchState(log(ourPoint, theirPoint), config);

    expect(state.score).toEqual({ us: 1, them: 1 });
    expect(state.sets).toEqual([]);
  });

  it("awards the rally only for point-ending results", () => {
    expect(pointFor("attack", "kill", "us")).toBe("us");
    expect(pointFor("serve", "error", "us")).toBe("them");
    expect(pointFor("attack", "blocked", "us")).toBe("them");
    expect(pointFor("serve", "ace", "them")).toBe("them");
    expect(pointFor("dig", "rated", "us")).toBeNull();
  });

  it("ends a set at the target, won by two", () => {
    const twentyFour = Array.from({ length: 24 }, () => ourPoint);
    const tied = matchState(log(...twentyFour, theirPoint), config);
    expect(tied.sets).toEqual([]);

    const won = matchState(log(...twentyFour, theirPoint, ourPoint), config);
    expect(won.sets).toEqual([{ us: 25, them: 1 }]);
    expect(won.score).toEqual({ us: 0, them: 0 });
  });

  it("keeps playing past the target until the lead is two", () => {
    const long = matchState(
      log(
        ...Array.from({ length: 24 }, () => ourPoint),
        ...Array.from({ length: 24 }, () => theirPoint),
        ourPoint,
      ),
      config,
    );

    expect(long.sets).toEqual([]);
    expect(long.score).toEqual({ us: 25, them: 24 });
  });

  it("plays the deciding set to 15", () => {
    expect(targetPoints(0, config)).toBe(25);
    expect(targetPoints(2, config)).toBe(15);
    expect(targetPoints(1, { ...config, bestOf: 5 })).toBe(25);
    expect(targetPoints(4, { ...config, bestOf: 5 })).toBe(15);
    expect(setsToWin(3)).toBe(2);
    expect(setsToWin(5)).toBe(3);
  });

  it("ends the match when a team has the majority of sets", () => {
    const set = Array.from({ length: 25 }, () => ourPoint);
    const state = matchState(log(...set, ...set), config);

    expect(state.setsWon).toEqual({ us: 2, them: 0 });
    expect(state.finished).toBe(true);

    const more = matchState(log(...set, ...set, ourPoint), config);
    expect(more.score).toEqual({ us: 0, them: 0 });
  });

  it("rotates the team that wins the serve back, and not the serving team", () => {
    const keepServe = matchState(log(ourPoint), config);
    expect(keepServe.serving).toBe("us");
    expect(keepServe.rotation.us).toBe(0);

    const sideout = matchState(log(theirPoint), config);
    expect(sideout.serving).toBe("them");
    expect(sideout.rotation.them).toBe(1);
  });
});

describe("undoing", () => {
  it("cancels the named event and leaves the log append-only", () => {
    const events = log(ourPoint, theirPoint);
    const undone = [...events, { id: "e3", event: { type: "undo", target: "e2" } } as MatchEvent];

    const state = matchState(undone, config);
    expect(state.score).toEqual({ us: 1, them: 0 });
    expect(state.serving).toBe("us");
    expect(events).toHaveLength(2);
  });

  it("reverses a rotation that a sideout caused", () => {
    const events = log(theirPoint);
    const undone = [...events, { id: "e2", event: { type: "undo", target: "e1" } } as MatchEvent];

    const state = matchState(undone, config);
    expect(state.rotation.them).toBe(0);
    expect(state.serving).toBe("us");
    expect(state.score).toEqual({ us: 0, them: 0 });
  });

  it("names the event the next undo would cancel", () => {
    const events = log(ourPoint, theirPoint);

    expect(undoableEvent(events)?.id).toBe("e2");
    expect(
      undoableEvent([
        ...events,
        { id: "e3", event: { type: "undo", target: "e2" } } as MatchEvent,
      ])?.id,
    ).toBe("e1");
  });
});

describe("limits", () => {
  it("allows two timeouts and six substitutions per set", () => {
    const timeouts = Array.from({ length: 3 }, () => ({ type: "timeout", team: "us" }) as const);
    expect(matchState(log(...timeouts), config).timeouts.us).toBe(2);

    const substitutions = Array.from({ length: 7 }, (_, index) => ({
      type: "substitution",
      team: "us",
      outId: `p${index}`,
      inId: `b${index}`,
    }) as const);
    expect(matchState(log(...substitutions), config).substitutions.us).toBe(6);
  });
});
