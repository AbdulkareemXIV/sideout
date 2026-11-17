// Pure volleyball rules for the lineup planner and match mode.
// No React, no database, no framework: everything here is a function of its
// arguments so the rules can be unit-tested on their own.

export const POSITIONS = [1, 2, 3, 4, 5, 6] as const;

export type Position = (typeof POSITIONS)[number];
export type System = "5-1" | "6-2" | "4-2";
export type Row = "front" | "back";

/** Which player stands in each rotational position. */
export type Arrangement = Record<Position, string>;

/** A player on the court: x from the left sideline, y from the net. */
export type CourtPoint = { x: number; y: number };

const FRONT_ROW: readonly Position[] = [2, 3, 4];

export function rowOf(position: Position): Row {
  return FRONT_ROW.includes(position) ? "front" : "back";
}

export function isFrontRow(position: Position): boolean {
  return rowOf(position) === "front";
}

/** Clockwise, as the team rotates after winning the serve back. */
const NEXT_POSITION: Record<Position, Position> = {
  1: 6,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
};

export function rotate(arrangement: Arrangement): Arrangement {
  const next = {} as Arrangement;
  for (const position of POSITIONS) {
    next[NEXT_POSITION[position]] = arrangement[position];
  }
  return next;
}

/** The six rotations of a set, starting with the starting lineup. */
export function rotations(arrangement: Arrangement): Arrangement[] {
  const all: Arrangement[] = [arrangement];
  for (let step = 1; step < POSITIONS.length; step += 1) {
    all.push(rotate(all[step - 1]!));
  }
  return all;
}

export function setterCount(system: System): number {
  return system === "5-1" ? 1 : 2;
}

/**
 * The setter of a rotation. 5-1 always has the same setter; 6-2 sets with the
 * setter in the back row, 4-2 with the setter in the front row.
 */
export function setterForRotation(
  system: System,
  setterIds: readonly string[],
  arrangement: Arrangement,
): string | null {
  const onCourt = setterIds.filter((id) =>
    POSITIONS.some((position) => arrangement[position] === id),
  );
  if (onCourt.length === 0) return null;
  if (system === "5-1") return onCourt[0] ?? null;

  const wantedRow: Row = system === "6-2" ? "back" : "front";
  const found = onCourt.find((id) =>
    POSITIONS.some(
      (position) =>
        arrangement[position] === id && rowOf(position) === wantedRow,
    ),
  );
  return found ?? null;
}

export type Violation = {
  /** The two positions compared, in the order the rule states them. */
  positions: [Position, Position];
  relation: "frontBack" | "leftToRightFront" | "leftToRightBack";
};

const RULES: {
  positions: [Position, Position];
  relation: Violation["relation"];
  holds: (first: CourtPoint, second: CourtPoint) => boolean;
}[] = [
  // Back row must be further from the net than its front-row pair.
  { positions: [5, 4], relation: "frontBack", holds: (back, front) => back.y > front.y },
  { positions: [6, 3], relation: "frontBack", holds: (back, front) => back.y > front.y },
  { positions: [1, 2], relation: "frontBack", holds: (back, front) => back.y > front.y },
  // Front row left to right.
  { positions: [4, 3], relation: "leftToRightFront", holds: (left, right) => left.x < right.x },
  { positions: [3, 2], relation: "leftToRightFront", holds: (left, right) => left.x < right.x },
  // Back row left to right.
  { positions: [5, 6], relation: "leftToRightBack", holds: (left, right) => left.x < right.x },
  { positions: [6, 1], relation: "leftToRightBack", holds: (left, right) => left.x < right.x },
];

/** Only the receiving team is checked, so call this for its formation only. */
export function checkOverlap(
  points: Record<Position, CourtPoint>,
): Violation[] {
  return RULES.filter(
    ({ positions: [first, second], holds }) =>
      !holds(points[first], points[second]),
  ).map(({ positions, relation }) => ({ positions, relation }));
}

/** Where the six positions sit on a half court, before any coach moves them. */
export const BASE_POINTS: Record<Position, CourtPoint> = {
  4: { x: 0.2, y: 0.15 },
  3: { x: 0.5, y: 0.15 },
  2: { x: 0.8, y: 0.15 },
  5: { x: 0.2, y: 0.8 },
  6: { x: 0.5, y: 0.8 },
  1: { x: 0.8, y: 0.8 },
};

export type LineupProblem =
  | { kind: "missingPositions"; positions: Position[] }
  | { kind: "duplicatePlayers"; players: string[] }
  | { kind: "setterCount"; expected: number; found: number }
  | { kind: "setterNotOnCourt"; players: string[] };

export type LineupInput = {
  system: System;
  positions: Partial<Record<Position, string | null>>;
  setterIds: readonly string[];
};

/** Everything that must be true before a lineup can be saved. */
export function validateLineup({
  system,
  positions,
  setterIds,
}: LineupInput): LineupProblem[] {
  const problems: LineupProblem[] = [];

  const missing = POSITIONS.filter((position) => !positions[position]);
  if (missing.length > 0) {
    problems.push({ kind: "missingPositions", positions: missing });
  }

  const onCourt = POSITIONS.map((position) => positions[position]).filter(
    (id): id is string => Boolean(id),
  );
  const duplicates = [
    ...new Set(
      onCourt.filter((id, index) => onCourt.indexOf(id) !== index),
    ),
  ];
  if (duplicates.length > 0) {
    problems.push({ kind: "duplicatePlayers", players: duplicates });
  }

  const expected = setterCount(system);
  const setters = [...new Set(setterIds)];
  if (setters.length !== expected) {
    problems.push({ kind: "setterCount", expected, found: setters.length });
  }

  const absent = setters.filter((id) => !onCourt.includes(id));
  if (absent.length > 0) {
    problems.push({ kind: "setterNotOnCourt", players: absent });
  }

  return problems;
}
