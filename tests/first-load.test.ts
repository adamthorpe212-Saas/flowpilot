import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The first page a new customer ever sees.
 *
 * getCurrentBusiness() creates the business on first authenticated load and
 * then reads it back. Both queries used to be `select("*").limit(1)` — the same
 * URL, the same headers, the same request. Next memoises identical fetches
 * within a render pass, so the read-back was answered from the existence
 * check's cached response, which is empty by definition because that is the
 * only reason the creation branch runs.
 *
 * The business was created and then reported missing, so the app layout
 * redirected every brand-new signup to /login. Reproduced against production:
 * first request 307 to /login, second and third rendered fine.
 *
 * Nothing else in the codebase could have caught it. It needs a Next render to
 * happen at all, the data was always correct, and every test passed. So this
 * asserts the shape of the fix — that the read-back is scoped to the id the RPC
 * returned, and therefore cannot be the same request as the check above it.
 */

/**
 * Comments stripped first, so these assertions measure the code and not the
 * prose about it. Without this, the comment explaining the old `.limit(1)` bug
 * counted as an occurrence of the bug.
 */
const SOURCE = readFileSync("lib/auth.ts", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

/** The body of getCurrentBusiness, so these do not match unrelated code. */
const BODY = SOURCE.slice(SOURCE.indexOf("export const getCurrentBusiness"));

describe("getCurrentBusiness", () => {
  it("reads the new business back by id, not by limit(1)", () => {
    /*
     * `.eq("id", ...)` is what makes the read-back a distinct URL. Revert it to
     * a bare limit(1) and every new signup is bounced to a login page again.
     */
    const afterCreate = BODY.slice(BODY.indexOf("create_business_for_current_user"));

    expect(afterCreate).toMatch(/\.eq\(\s*"id"/);
  });

  it("uses the id the RPC returns rather than discarding it", () => {
    // `const { error } = await supabase.rpc(...)` threw the id away, which is
    // what left the read-back with nothing to scope itself by.
    expect(BODY).toMatch(/data:\s*newId[\s\S]*?\.rpc\(/);
  });

  it("refuses to continue if the RPC gives back no id", () => {
    // Better a logged failure than a silent redirect nobody can explain.
    expect(BODY).toMatch(/if\s*\(!newId\)/);
  });

  it("still has exactly one unscoped lookup — the existence check", () => {
    /*
     * If a second `limit(1)` ever reappears in this function, the two requests
     * are identical again and the bug is back. One is correct: the check that
     * asks whether any business already exists.
     */
    const unscoped = BODY.match(/\.limit\(1\)/g) ?? [];
    expect(unscoped).toHaveLength(1);
  });
});
