// Pure match rules: rally scoring, sets, rotation on sideout, limits and undo.
// State is never stored; it is folded from the append-only event log.

export const TEAMS = ["us", "them"] as const;
export type Team = (typeof TEAMS)[number];

export type MatchConfig = {
  bestOf: 3 | 5;
  setPoints: number;
  firstServe: Team;
};

export const DECIDING_SET_POINTS = 15;
export const TIMEOUTS_PER_SET = 2;
export const SUBSTITUTIONS_PER_SET = 6;

export type StatAction =
  | "serve"
  | "attack"
  | "block"
  | "dig"
  | "reception"
  | "set"
  | "other";

export type StatResult =
  | "ace"
  | "in"
  | "error"
  | "kill"
  | "inPlay"
  | "blocked"
  | "solo"
  | "assist"
  | "rated";

export type MatchEventInput =
  | {
      type: "stat";
      team: Team;
      playerId: string;
      action: StatAction;
      result: StatResult;
    }
  | { type: "opponent_point" }
  | { type: "timeout"; team: Team }
  | { type: "substitution"; team: Team; outId: string; inId: string }
  | { type: "undo"; target: string };

export type MatchEvent = { id: string; event: MatchEventInput };

export type SetScore = { us: number; them: number };

export type MatchState = {
  sets: SetScore[];
  score: SetScore;
  setsWon: SetScore;
  serving: Team;
  /** How many times each team has rotated, counted from its starting six. */
  rotation: Record<Team, number>;
  timeouts: Record<Team, number>;
  substitutions: Record<Team, number>;
  /** Player id to "<action>.<result>" counts. */
  totals: Record<string, Record<string, number>>;
  finished: boolean;
};

const other = (team: Team): Team => (team === "us" ? "them" : "us");

/** A point-ending stat awards a rally; a plain action does not. */
export function pointFor(
  action: StatAction,
  result: StatResult,
  team: Team,
): Team | null {
  if (action === "serve" && result === "ace") return team;
  if (action === "serve" && result === "error") return other(team);
  if (action === "attack" && result === "kill") return team;
  if (action === "attack" && (result === "error" || result === "blocked"))
    return other(team);
  if (action === "block" && result === "solo") return team;
  return null;
}

export function setsToWin(bestOf: 3 | 5): number {
  return Math.floor(bestOf / 2) + 1;
}

export function targetPoints(setIndex: number, config: MatchConfig): number {
  return setIndex === config.bestOf - 1 ? DECIDING_SET_POINTS : config.setPoints;
}

export function initial(config: MatchConfig): MatchState {
  return {
    sets: [],
    score: { us: 0, them: 0 },
    setsWon: { us: 0, them: 0 },
    serving: config.firstServe,
    rotation: { us: 0, them: 0 },
    timeouts: { us: 0, them: 0 },
    substitutions: { us: 0, them: 0 },
    totals: {},
    finished: false,
  };
}



function recordStat(
  state: MatchState,
  event: Extract<MatchEventInput, { type: "stat" }>,
): MatchState {
  const key = `${event.action}.${event.result}`;
  const player = state.totals[event.playerId] ?? {};
  return {
    ...state,
    totals: {
      ...state.totals,
      [event.playerId]: { ...player, [key]: (player[key] ?? 0) + 1 },
    },
  };
}

function award(state: MatchState, winner: Team, config: MatchConfig): MatchState {
  const score = { ...state.score, [winner]: state.score[winner] + 1 };
  const setIndex = state.sets.length;
  const target = targetPoints(setIndex, config);
  const won = score[winner] >= target && score[winner] - score[other(winner)] >= 2;

  if (!won) {
    // Losing the serve hands the ball over and rotates the receiving six.
    const serving = winner === state.serving ? state.serving : winner;
    const rotation =
      winner === state.serving
        ? state.rotation
        : {
            ...state.rotation,
            [winner]: (state.rotation[winner] + 1) % 6,
          };

    return { ...state, score, serving, rotation };
  }

  const setsWon = { ...state.setsWon, [winner]: state.setsWon[winner] + 1 };
  const finished = setsWon[winner] >= setsToWin(config.bestOf);

  return {
    ...state,
    sets: [...state.sets, score],
    score: { us: 0, them: 0 },
    setsWon,
    serving: config.firstServe,
    rotation: { us: 0, them: 0 },
    timeouts: { us: 0, them: 0 },
    substitutions: { us: 0, them: 0 },
    finished,
  };
}

function apply(state: MatchState, event: MatchEventInput, config: MatchConfig): MatchState {
  if (state.finished) return state;

  switch (event.type) {
    case "stat": {
      const withStat = recordStat(state, event);
      const winner = pointFor(event.action, event.result, event.team);
      return winner ? award(withStat, winner, config) : withStat;
    }
    case "opponent_point":
      return award(state, "them", config);
    case "timeout": {
      if (state.timeouts[event.team] >= TIMEOUTS_PER_SET) return state;
      return {
        ...state,
        timeouts: {
          ...state.timeouts,
          [event.team]: state.timeouts[event.team] + 1,
        },
      };
    }
    case "substitution": {
      if (state.substitutions[event.team] >= SUBSTITUTIONS_PER_SET) return state;
      return {
        ...state,
        substitutions: {
          ...state.substitutions,
          [event.team]: state.substitutions[event.team] + 1,
        },
      };
    }
    case "undo":
      return state;
  }
}

/**
 * Replays the log. An undo event cancels the event it names, so the log itself
 * stays append-only.
 */
export function matchState(
  events: readonly MatchEvent[],
  config: MatchConfig,
): MatchState {
  const cancelled = new Set(
    events
      .map((entry) => entry.event)
      .filter((event): event is Extract<MatchEventInput, { type: "undo" }> => event.type === "undo")
      .map((event) => event.target),
  );

  return events
    .filter((entry) => entry.event.type !== "undo" && !cancelled.has(entry.id))
    .reduce((state, entry) => apply(state, entry.event, config), initial(config));
}

export function canUndo(events: readonly MatchEvent[]): boolean {
  return undoableEvent(events) !== null;
}


/** The last event an undo would cancel. */
export function undoableEvent(events: readonly MatchEvent[]): MatchEvent | null {
  const undone = new Set(
    events
      .map((entry) => entry.event)
      .filter((event): event is Extract<MatchEventInput, { type: "undo" }> => event.type === "undo")
      .map((event) => event.target),
  );

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const entry = events[index]!;
    if (entry.event.type !== "undo" && !undone.has(entry.id)) return entry;
  }

  return null;
}
