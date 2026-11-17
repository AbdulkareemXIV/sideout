// Pure match rules: rally scoring, sets, rotation on sideout, limits and undo.
// State is never stored; it is folded from the append-only event log.

export const TEAMS = ["us", "them"] as const;
export type Team = (typeof TEAMS)[number];

export type Exchange = { out: string; in: string };

export type MatchConfig = {
  bestOf: 3 | 5;
  setPoints: number;
  firstServe: Team;
  /** The starting six per team, in position order, when substitutions matter. */
  lineups?: Partial<Record<Team, readonly string[]>>;
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
  | "kill"
  | "in"
  | "error"
  | "rated"
  | "rated0"
  | "rated1"
  | "rated2"
  | "rated3"
  | "inPlay"
  | "blocked"
  | "solo"
  | "assist";

export type MatchEventInput =
  | {
      type: "match_started";
      bestOf: 3 | 5;
      setPoints: number;
      firstServe: Team;
      lineupId: string;
      /** Missing when the opponent is a team outside the academy, named by hand. */
      opponentLineupId?: string;
    }
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
  /** The six on court now, in position order, once a lineup is known. */
  court: Record<Team, string[]>;
  /** Who replaced whom this set, in order. */
  exchanges: Record<Team, Exchange[]>;
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
  const court = {
    us: [...(config.lineups?.us ?? [])],
    them: [...(config.lineups?.them ?? [])],
  };

  return {
    sets: [],
    score: { us: 0, them: 0 },
    setsWon: { us: 0, them: 0 },
    serving: config.firstServe,
    rotation: { us: 0, them: 0 },
    timeouts: { us: 0, them: 0 },
    substitutions: { us: 0, them: 0 },
    court,
    exchanges: { us: [], them: [] },
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
    court: {
      us: [...(config.lineups?.us ?? state.court.us)],
      them: [...(config.lineups?.them ?? state.court.them)],
    },
    exchanges: { us: [], them: [] },
    finished,
  };
}

function apply(state: MatchState, event: MatchEventInput, config: MatchConfig): MatchState {
  if (state.finished) return state;

  switch (event.type) {
    // The format and the lineups come from the match row, so opening the log
    // changes nothing on replay.
    case "match_started":
      return state;
    case "stat": {
      const court = state.court[event.team];
      // Serving out of order is blocked: only the player in position 1 serves.
      if (event.action === "serve" && court.length === 6 && court[0] !== event.playerId)
        return state;

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

      const starters = config.lineups?.[event.team];
      const counted = {
        ...state,
        substitutions: {
          ...state.substitutions,
          [event.team]: state.substitutions[event.team] + 1,
        },
      };

      // Without a starting six there is nobody to check the exchange against.
      if (!starters || starters.length === 0) return counted;
      if (substitutionProblem(state, event.team, event.outId, event.inId, starters))
        return state;

      return {
        ...counted,
        court: {
          ...state.court,
          [event.team]: state.court[event.team].map((id) =>
            id === event.outId ? event.inId : id,
          ),
        },
        exchanges: {
          ...state.exchanges,
          [event.team]: [
            ...state.exchanges[event.team],
            { out: event.outId, in: event.inId },
          ],
        },
      };
    }

    case "undo":
      return state;
    default:
      // Payloads are read back from JSON, so an unknown type must not lose the
      // state the log has built so far.
      return state;
  }
}

export type SubstitutionProblem =
  | "limit"
  | "notOnCourt"
  | "alreadyOnCourt"
  | "alreadyEntered"
  | "returnNotAllowed"
  | "wrongReplacement";

/**
 * Volleyball substitution rules: a starter leaves once and may only return for
 * the player who replaced them; a substitute enters once per set and may only
 * be replaced by the starter they replaced.
 */
export function substitutionProblem(
  state: SubstitutionState,
  team: Team,
  outId: string,
  inId: string,
  starters: readonly string[],
): SubstitutionProblem | null {
  if (state.substitutions[team] >= SUBSTITUTIONS_PER_SET) return "limit";

  const court = state.court[team];
  if (!court.includes(outId)) return "notOnCourt";
  if (court.includes(inId)) return "alreadyOnCourt";

  const exchanges = state.exchanges[team];
  const isStarter = (id: string) => starters.includes(id);

  if (isStarter(inId)) {
    const cameOff = exchanges.find((exchange) => exchange.out === inId);
    if (!cameOff) return "returnNotAllowed";
    if (cameOff.in !== outId) return "wrongReplacement";
    return null;
  }

  if (exchanges.some((exchange) => exchange.in === inId)) return "alreadyEntered";
  if (!isStarter(outId)) return "wrongReplacement";

  return null;
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

/** The events a coach can take back; opening the log is not one of them. */
const UNDOABLE = new Set<string>(["stat", "opponent_point", "timeout", "substitution"]);

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
    if (!UNDOABLE.has(entry.event.type)) continue;
    if (!undone.has(entry.id)) return entry;
  }

  return null;
}

export type SubstitutionState = {
  substitutions: Record<Team, number>;
  court: Record<Team, string[]>;
  exchanges: Record<Team, Exchange[]>;
};
