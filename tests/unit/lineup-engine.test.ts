import { describe, expect, it } from "vitest";

import {
  BASE_POINTS,
  checkOverlap,
  rotate,
  rotations,
  rowOf,
  setterForRotation,
  validateLineup,
  type Arrangement,
  type CourtPoint,
  type Position,
  type System,
} from "@/features/lineups/engine";

const base: Arrangement = {
  1: "p1",
  2: "p2",
  3: "p3",
  4: "p4",
  5: "p5",
  6: "p6",
};

const points = (overrides: Partial<Record<Position, CourtPoint>> = {}) =>
  ({ ...BASE_POINTS, ...overrides }) as Record<Position, CourtPoint>;

describe("rotation", () => {
  it("moves every player one position clockwise", () => {
    const next = rotate(base);

    expect(next[1]).toBe(base[2]);
    expect(next[6]).toBe(base[1]);
    expect(next[5]).toBe(base[6]);
    expect(next[4]).toBe(base[5]);
    expect(next[3]).toBe(base[4]);
    expect(next[2]).toBe(base[3]);
  });

  it("gives six different arrangements and returns to the start", () => {
    const all = rotations(base);

    expect(all).toHaveLength(6);
    expect(new Set(all.map((one) => JSON.stringify(one))).size).toBe(6);
    expect(rotate(all[5]!)).toEqual(base);
  });

  it("puts every player in every position exactly once across the set", () => {
    for (const player of Object.values(base)) {
      const seen = rotations(base).map(
        (one) =>
          (Object.entries(one) as [string, string][]).find(
            ([, id]) => id === player,
          )![0],
      );

      expect(new Set(seen).size).toBe(6);
    }
  });

  it("knows which row a position belongs to", () => {
    expect([2, 3, 4].map((p) => rowOf(p as Position))).toEqual([
      "front",
      "front",
      "front",
    ]);
    expect([1, 5, 6].map((p) => rowOf(p as Position))).toEqual([
      "back",
      "back",
      "back",
    ]);
  });
});

describe("who sets", () => {
  it("keeps the single setter for all six rotations in 5-1", () => {
    const all = rotations({ ...base, 1: "setter" });

    for (const one of all) {
      expect(setterForRotation("5-1", ["setter"], one)).toBe("setter");
    }
  });

  it("sets from the back-row setter in 6-2", () => {
    const all = rotations({ ...base, 1: "a", 4: "b" });
    const setters = ["a", "b"];

    expect(setterForRotation("6-2", setters, all[0]!)).toBe("a");
    expect(setterForRotation("6-2", setters, all[1]!)).toBe("a");
    expect(setterForRotation("6-2", setters, all[3]!)).toBe("b");
  });

  it("sets from the front-row setter in 4-2", () => {
    const all = rotations({ ...base, 1: "a", 4: "b" });
    const setters = ["a", "b"];

    expect(setterForRotation("4-2", setters, all[0]!)).toBe("b");
    expect(setterForRotation("4-2", setters, all[3]!)).toBe("a");
  });

  it("returns nothing when no setter is on court", () => {
    expect(setterForRotation("5-1", ["absent"], base)).toBeNull();
  });
});

describe("overlap", () => {
  it("accepts the base formation", () => {
    expect(checkOverlap(points())).toEqual([]);
  });

  it("reports a back-row player who is not behind their front-row pair", () => {
    const violations = checkOverlap(points({ 5: { x: 0.2, y: 0.1 } }));

    expect(violations).toContainEqual({
      positions: [5, 4],
      relation: "frontBack",
    });
  });

  it("treats equal distance from the net as a fault", () => {
    const violations = checkOverlap(
      points({ 6: { x: 0.5, y: BASE_POINTS[3].y } }),
    );

    expect(violations).toContainEqual({
      positions: [6, 3],
      relation: "frontBack",
    });
  });

  it("reports front-row players who are not left to right", () => {
    const violations = checkOverlap(points({ 2: { x: 0.4, y: 0.15 } }));

    expect(violations).toContainEqual({
      positions: [3, 2],
      relation: "leftToRightFront",
    });
  });

  it("reports back-row players who are not left to right", () => {
    const violations = checkOverlap(points({ 1: { x: 0.3, y: 0.8 } }));

    expect(violations).toContainEqual({
      positions: [6, 1],
      relation: "leftToRightBack",
    });
  });

  it("compares only the seven pairs the rule names", () => {
    const violations = checkOverlap(points({ 4: { x: 0.9, y: 0.9 } }));

    expect(
      violations.map((violation) => violation.positions.join("-")),
    ).toEqual(["5-4", "4-3"]);
  });
});

describe("validating a lineup", () => {
  const valid = { system: "5-1" as System, positions: base, setterIds: ["p1"] };

  it("accepts six players and one setter in 5-1", () => {
    expect(validateLineup(valid)).toEqual([]);
  });

  it("names the empty positions", () => {
    expect(
      validateLineup({ ...valid, positions: { ...base, 3: null } }),
    ).toEqual([{ kind: "missingPositions", positions: [3] }]);
  });

  it("refuses the same player in two positions", () => {
    expect(validateLineup({ ...valid, positions: { ...base, 2: "p1" } })).toEqual(
      [{ kind: "duplicatePlayers", players: ["p1"] }],
    );
  });

  it("wants two setters in 6-2 and 4-2", () => {
    expect(
      validateLineup({ system: "6-2", positions: base, setterIds: ["p1"] }),
    ).toEqual([{ kind: "setterCount", expected: 2, found: 1 }]);
    expect(
      validateLineup({ system: "4-2", positions: base, setterIds: [] }),
    ).toEqual([{ kind: "setterCount", expected: 2, found: 0 }]);
  });

  it("refuses a setter who is not one of the six", () => {
    expect(
      validateLineup({ ...valid, setterIds: ["bench"] }),
    ).toContainEqual({ kind: "setterNotOnCourt", players: ["bench"] });
  });

  it("refuses a libero who is also a setter", () => {
    expect(validateLineup({ ...valid, liberoId: "p1" })).toContainEqual({
      kind: "liberoIsSetter",
      players: ["p1"],
    });
  });

  it("accepts a libero who is not a setter", () => {
    expect(validateLineup({ ...valid, liberoId: "p4" })).toEqual([]);
  });
});
