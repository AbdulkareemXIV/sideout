import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const setup = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => setup()),
}));

import {
  finishMatch,
  recalculateMatchTotals,
  undoLastEvent,
} from "@/features/match/actions";
import type { MatchEventInput } from "@/features/match/engine";

const kill: MatchEventInput = {
  type: "stat",
  team: "us",
  playerId: "p1",
  action: "attack",
  result: "kill",
};

const theirPoint: MatchEventInput = { type: "opponent_point" };

/** A client whose match row, log and totals writes can all be inspected. */
function fakeClient({
  events,
  status,
}: {
  events: MatchEventInput[];
  status: string;
}) {
  const updates: Record<string, unknown>[] = [];
  const upserts: unknown[][] = [];
  const inserted: MatchEventInput[] = [];
  const cleared: string[] = [];

  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "coach" } } }) },
    from(table: string) {
      if (table === "matches") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  best_of: 3,
                  set_points: 25,
                  first_serve: "us",
                  lineup_id: "l1",
                  status,
                },
                error: null,
              }),
            }),
          }),
          update: (row: Record<string, unknown>) => {
            updates.push(row);

            return { eq: async () => ({ error: null }) };
          },
        };
      }

      if (table === "lineups") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { positions: { 1: "p1" } },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "match_events") {
        const rows = events.map((event, index) => ({
          id: `e${index + 1}`,
          seq: index + 1,
          payload: event,
        }));


        const ordered = Object.assign(Promise.resolve({ data: rows, error: null }), {
          limit: () => ({
            maybeSingle: async () => ({
              data: rows[rows.length - 1] ?? null,
              error: null,
            }),
          }),
        });

        return {
          select: () => ({ eq: () => ({ order: () => ordered }) }),
          insert: async (row: { payload: MatchEventInput }) => {
            inserted.push(row.payload);

            return { error: null };
          },
        };
      }

      if (table === "match_player_totals") {
        return {
          upsert: async (rows: unknown[][]) => {
            upserts.push(rows);

            return { error: null };
          },
          delete: () => ({
            eq: (_column: string, value: string) => {
              cleared.push(value);

              return Object.assign(Promise.resolve({ error: null }), {
                not: async () => ({ error: null }),
              });
            },
          }),
        };
      }

      throw new Error(`unexpected table: ${table}`);
    },
  };

  return { client, updates, upserts, inserted, cleared };
}

describe("recalculating a finished match", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setup.mockReset();
  });

  it("writes the totals the log produces", async () => {
    const { client, upserts } = fakeClient({ events: [kill], status: "finished" });
    setup.mockResolvedValue(client);

    await expect(recalculateMatchTotals("m1")).resolves.toEqual({ error: null });

    expect(upserts[0]).toEqual([
      { match_id: "m1", player_id: "p1", totals: { "attack.kill": 1 } },
    ]);
  });

  it("reopens the match when the corrected log no longer ends it", async () => {
    const { client, updates } = fakeClient({ events: [], status: "finished" });
    setup.mockResolvedValue(client);

    await recalculateMatchTotals("m1");

    expect(updates).toEqual([{ status: "live", ended_at: null }]);
  });

  it("keeps the match closed when the log still ends it", async () => {
    const { client, updates } = fakeClient({
      events: Array.from({ length: 50 }, () => kill),
      status: "finished",
    });
    setup.mockResolvedValue(client);

    await recalculateMatchTotals("m1");

    expect(updates).toEqual([{ status: "finished" }]);
  });

  it("is how closing a match writes its totals", async () => {
    const { client, upserts, updates } = fakeClient({
      events: [kill],
      status: "live",
    });
    setup.mockResolvedValue(client);

    await expect(finishMatch("m1")).resolves.toEqual({ error: null });

    expect(updates[0]).toMatchObject({ status: "finished" });
    expect(upserts[0]).toEqual([
      { match_id: "m1", player_id: "p1", totals: { "attack.kill": 1 } },
    ]);
  });
});

describe("correcting a finished match", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setup.mockReset();
  });

  it("undoes the last point and rewrites the totals", async () => {
    const { client, inserted, upserts, updates, cleared } = fakeClient({
      events: [theirPoint],
      status: "finished",
    });
    setup.mockResolvedValue(client);

    await expect(undoLastEvent("m1")).resolves.toEqual({ error: null });

    expect(inserted[0]).toMatchObject({ type: "undo", target: "e1" });
    expect(upserts).toEqual([]);
    expect(cleared).toEqual(["m1"]);
    expect(updates).toEqual([{ status: "live", ended_at: null }]);
  });

  it("leaves a live match's totals alone", async () => {
    const { client, upserts, updates } = fakeClient({
      events: [theirPoint],
      status: "live",
    });
    setup.mockResolvedValue(client);

    await expect(undoLastEvent("m1")).resolves.toEqual({ error: null });

    expect(upserts).toEqual([]);
    expect(updates).toEqual([]);
  });
});
