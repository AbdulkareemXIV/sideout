import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const setup = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => setup()),
}));

import { redirect } from "next/navigation";

import { startMatch } from "@/features/match/actions";

type Failure = { code: string; message: string };

const ourLineup = crypto.randomUUID();
const opponentLineup = crypto.randomUUID();

const lineups = [
  { id: ourLineup, squad_id: "s1" },
  { id: opponentLineup, squad_id: "s1" },
];

const input = {
  locale: "en",
  lineupId: ourLineup,
  opponentLineupId: opponentLineup,
  bestOf: 3,
  setPoints: 25,
  firstServe: "us",
};

/** A stand-in for the Supabase client, one chain per table the action uses. */
function fakeClient({
  matchError = null,
  eventError = null,
}: {
  matchError?: Failure | null;
  eventError?: Failure | null;
} = {}) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "coach" } } }) },
    from(table: string) {
      if (table === "lineups") {
        return {
          select: () => ({ in: async () => ({ data: lineups, error: null }) }),
        };
      }

      if (table === "matches") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: matchError ? null : { id: "m1" },
                error: matchError,
              }),
            }),
          }),
        };
      }

      if (table === "match_events") {
        return { insert: async () => ({ error: eventError }) };
      }

      throw new Error(`unexpected table: ${table}`);
    },
  };
}

describe("starting a match", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("says the match tables are missing when the database is not migrated", async () => {
    setup.mockResolvedValueOnce(
      fakeClient({
        matchError: {
          code: "PGRST205",
          message: "Could not find the table 'public.matches' in the schema cache",
        },
      }),
    );

    await expect(startMatch(input)).resolves.toEqual({ error: "notReady" });
  });

  it("says the log table is missing when the start event cannot be written", async () => {
    setup.mockResolvedValueOnce(
      fakeClient({
        eventError: {
          code: "PGRST205",
          message:
            "Could not find the table 'public.match_events' in the schema cache",
        },
      }),
    );

    await expect(startMatch(input)).resolves.toEqual({ error: "notReady" });
  });

  it("still reports a permission failure as forbidden", async () => {
    setup.mockResolvedValueOnce(
      fakeClient({
        matchError: { code: "42501", message: "new row violates row-level security" },
      }),
    );

    await expect(startMatch(input)).resolves.toEqual({ error: "forbidden" });
  });

  it("keeps an unexplained failure generic", async () => {
    setup.mockResolvedValueOnce(
      fakeClient({ matchError: { code: "XX000", message: "boom" } }),
    );

    await expect(startMatch(input)).resolves.toEqual({ error: "failed" });
  });

  it("opens the new match when the insert succeeds", async () => {
    setup.mockResolvedValueOnce(fakeClient());

    await expect(startMatch(input)).rejects.toThrow("redirect:/en/matches/m1");
    expect(redirect).toHaveBeenCalledWith("/en/matches/m1");
  });

/** A client that keeps every row the action writes. */
function capturingClient() {
  const written: { table: string; row: Record<string, unknown> }[] = [];

  return {
    written,
    client: {
      auth: { getUser: async () => ({ data: { user: { id: "coach" } } }) },
      from(table: string) {
        if (table === "lineups") {
          return {
            select: () => ({
              in: async (_column: string, ids: string[]) => ({
                data: lineups.filter((lineup) => ids.includes(lineup.id)),
                error: null,
              }),
            }),
          };
        }

        if (table === "matches") {
          return {
            insert: (row: Record<string, unknown>) => {
              written.push({ table, row });

              return {
                select: () => ({
                  single: async () => ({ data: { id: "m1" }, error: null }),
                }),
              };
            },
          };
        }

        if (table === "match_events") {
          return {
            insert: async (row: Record<string, unknown>) => {
              written.push({ table, row });

              return { error: null };
            },
          };
        }

        throw new Error(`unexpected table: ${table}`);
      },
    },
  };
}

describe("picking the opponent", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("stores the other lineup and the squad it belongs to", async () => {
    const { client, written } = capturingClient();
    setup.mockResolvedValueOnce(client);

    await expect(startMatch(input)).rejects.toThrow("redirect:/en/matches/m1");

    expect(written[0]?.row).toMatchObject({
      lineup_id: ourLineup,
      opponent_lineup_id: opponentLineup,
      opponent_squad_id: "s1",
      opponent_name: null,
    });
    expect(written[1]?.row.payload).toMatchObject({
      type: "match_started",
      opponentLineupId: opponentLineup,
    });
  });

  it("stores a team named by hand without a lineup", async () => {
    const { client, written } = capturingClient();
    setup.mockResolvedValueOnce(client);

    const againstName = { ...input, opponentLineupId: undefined };
    await expect(
      startMatch({ ...againstName, opponentName: "  Al Hilal U16 " }),
    ).rejects.toThrow("redirect:/en/matches/m1");

    expect(written[0]?.row).toMatchObject({
      lineup_id: ourLineup,
      opponent_lineup_id: null,
      opponent_squad_id: null,
      opponent_name: "Al Hilal U16",
    });
    expect(written[1]?.row.payload).toMatchObject({ type: "match_started" });
    expect(written[1]?.row.payload).not.toHaveProperty("opponentLineupId");
  });

  it("refuses the same lineup on both sides", async () => {
    await expect(
      startMatch({ ...input, opponentLineupId: ourLineup }),
    ).resolves.toEqual({ error: "invalidInput" });
    expect(setup).not.toHaveBeenCalled();
  });

  it("refuses an opponent lineup the coach cannot see", async () => {
    const { client } = capturingClient();
    setup.mockResolvedValueOnce(client);

    await expect(
      startMatch({ ...input, opponentLineupId: crypto.randomUUID() }),
    ).resolves.toEqual({ error: "forbidden" });
  });

  it("needs either a lineup or a name for the opponent", async () => {
    const ours = { ...input, opponentLineupId: undefined };

    await expect(startMatch(ours)).resolves.toEqual({ error: "invalidInput" });
    await expect(
      startMatch({ ...ours, opponentName: "   " }),
    ).resolves.toEqual({ error: "invalidInput" });
  });
});
});
