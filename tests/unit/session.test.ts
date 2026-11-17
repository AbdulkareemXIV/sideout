import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getUser = vi.fn();
const signOutUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser, signOut: signOutUser },
  })),
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { redirectIfSignedIn, signOut } from "@/lib/auth/actions";

describe("a signed-in user opening the sign-in page", () => {
  it("is sent to their home page", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });

    await expect(redirectIfSignedIn("en")).rejects.toThrow("redirect:/en");
    expect(redirect).toHaveBeenCalledWith("/en");
  });

  it("still sees the form when signed out", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(redirectIfSignedIn("en")).resolves.toBeUndefined();
  });
});

describe("signing out", () => {
  it("clears the session, drops cached pages and lands on sign-in", async () => {
    signOutUser.mockResolvedValueOnce({ error: null });

    await expect(signOut("en")).rejects.toThrow("redirect:/en/sign-in");

    expect(signOutUser).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith("/en/sign-in");
  });

  it("keeps the language the user was reading", async () => {
    signOutUser.mockResolvedValueOnce({ error: null });

    await expect(signOut("ar")).rejects.toThrow("redirect:/ar/sign-in");
  });
});
