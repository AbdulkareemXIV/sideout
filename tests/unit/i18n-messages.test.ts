import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { getDirection } from "@/lib/i18n/direction";
import { routing } from "@/lib/i18n/routing";

const messagesDir = new URL("../../messages/", import.meta.url);

function readCatalogue(locale: string): unknown {
  return JSON.parse(readFileSync(new URL(`${locale}.json`, messagesDir), "utf8"));
}

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix === "" ? key : `${prefix}.${key}`),
  );
}

function collectEmptyValues(
  value: unknown,
  path = "",
): { path: string; value: string }[] {
  if (typeof value === "string") {
    return value.trim() === "" ? [{ path, value }] : [];
  }

  if (typeof value !== "object" || value === null) {
    return [{ path, value: String(value) }];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectEmptyValues(child, path === "" ? key : `${path}.${key}`),
  );
}

describe("translation catalogues", () => {
  const reference = flattenKeys(readCatalogue(routing.defaultLocale)).sort();

  it("ships a catalogue for every supported locale", () => {
    for (const locale of routing.locales) {
      expect(() => readCatalogue(locale), `messages/${locale}.json`).not.toThrow();
    }
  });

  it.each(routing.locales)("%s has exactly the same keys as the default locale", (locale) => {
    const keys = flattenKeys(readCatalogue(locale)).sort();

    expect(keys).toEqual(reference);
  });

  it.each(routing.locales)("%s has no empty or untranslated values", (locale) => {
    expect(collectEmptyValues(readCatalogue(locale))).toEqual([]);
  });

  it("knows the directory of every locale", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
    expect(routing.locales).toEqual(expect.arrayContaining(["en", "ar"]));
  });

  it("does not ship a message file outside the supported locales", () => {
    const files = readdirSync(fileURLToPath(messagesDir))
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, ""))
      .sort();

    expect(files).toEqual([...routing.locales].sort());
  });
});
