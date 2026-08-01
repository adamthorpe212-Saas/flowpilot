import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A "use server" module may only export async functions.
 *
 * Next.js turns every export of such a module into a server endpoint, so a
 * constant exported from one arrives in the browser as `undefined`. It is not a
 * type error and not a lint error — it compiles, it passes tests that import
 * the module directly, and it fails at runtime on first render with something
 * like "cannot convert undefined to object".
 *
 * That happened twice here: EMPTY_PREVIEW and DAYS. Both were only found by
 * opening the page in a browser. This test is the check that would have caught
 * them, since nothing else in the toolchain can.
 */

function sourceFiles(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;

    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(full));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      found.push(full);
    }
  }

  return found;
}

const serverActionFiles = sourceFiles("app").filter((file) => {
  const source = readFileSync(file, "utf8");
  // Directive must be the first statement to apply to the whole module.
  return /^\s*["']use server["']/.test(source);
});

describe('"use server" modules', () => {
  it("finds the action files, so this test cannot silently pass", () => {
    expect(serverActionFiles.length).toBeGreaterThan(5);
  });

  it("export only async functions", () => {
    const offenders: string[] = [];

    for (const file of serverActionFiles) {
      const lines = readFileSync(file, "utf8").split("\n");

      lines.forEach((line, index) => {
        // `export type` and `export interface` are erased at compile time and
        // never become endpoints, so they are safe.
        if (/^export\s+(type|interface)\b/.test(line)) return;
        if (/^export\s+async\s+function\b/.test(line)) return;
        if (!/^export\b/.test(line)) return;

        offenders.push(
          `${file}:${index + 1} — ${line.trim().slice(0, 60)}`,
        );
      });
    }

    expect(
      offenders,
      `A "use server" module may only export async functions. These arrive in the browser as undefined:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
