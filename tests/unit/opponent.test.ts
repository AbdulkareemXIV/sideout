import { describe, expect, it } from "vitest";

import { opponentLabel } from "@/features/match/opponent";

describe("naming the opponent", () => {
  it("joins the squad and lineup names of an academy opponent", () => {
    expect(
      opponentLabel({ squadName: "Falcons", lineupName: "Starting six" }),
    ).toBe("Falcons Starting six");
  });

  it("uses whichever part of the lineup name is there", () => {
    expect(opponentLabel({ lineupName: "Starting six" })).toBe("Starting six");
  });

  it("falls back to the name typed in for an outside team", () => {
    expect(opponentLabel({ name: "Al Hilal U16" })).toBe("Al Hilal U16");
  });

  it("trims the typed name", () => {
    expect(opponentLabel({ name: "  Al Hilal U16  " })).toBe("Al Hilal U16");
  });

  it("has no name when neither source is filled in", () => {
    expect(opponentLabel({ name: "   " })).toBeNull();
    expect(opponentLabel({})).toBeNull();
  });
});
