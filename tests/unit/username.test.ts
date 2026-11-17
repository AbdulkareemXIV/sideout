import { describe, expect, it } from "vitest";

import { changePasswordSchema, signInSchema } from "@/lib/auth/schemas";
import { normalizeUsername, usernameToEmail } from "@/lib/auth/username";

describe("username", () => {
  it("trims and lowercases what the user typed", () => {
    expect(normalizeUsername("  Sara.U16 ")).toBe("sara.u16");
  });

  it("maps to the internal address Supabase Auth needs", () => {
    expect(usernameToEmail("Sara.U16")).toBe("sara.u16@sideout.local");
  });
});

describe("signInSchema", () => {
  it("accepts a username in any case and returns the normalised one", () => {
    const parsed = signInSchema.parse({
      username: " Sara.U16 ",
      password: "Demo1234!",
    });

    expect(parsed).toEqual({ username: "sara.u16", password: "Demo1234!" });
  });

  it.each(["ab", "sara u16", "sara@u16", "", "sara/u16"])(
    "rejects %s",
    (username) => {
      expect(
        signInSchema.safeParse({ username, password: "Demo1234!" }).success,
      ).toBe(false);
    },
  );

  it("rejects an empty password", () => {
    expect(
      signInSchema.safeParse({ username: "sara.u16", password: "" }).success,
    ).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts a matching pair of at least eight characters", () => {
    expect(
      changePasswordSchema.safeParse({
        password: "Volley2026!",
        confirmation: "Volley2026!",
      }).success,
    ).toBe(true);
  });

  it("rejects a password shorter than eight characters", () => {
    expect(
      changePasswordSchema.safeParse({
        password: "short",
        confirmation: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects a confirmation that does not match", () => {
    expect(
      changePasswordSchema.safeParse({
        password: "Volley2026!",
        confirmation: "Volley2026?",
      }).success,
    ).toBe(false);
  });
});
