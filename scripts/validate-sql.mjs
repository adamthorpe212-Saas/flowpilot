/**
 * Parses every migration with the real Postgres parser (libpg-query, the
 * PostgreSQL grammar compiled to WASM).
 *
 * This exists because there is no Docker on the dev machine, so `supabase start`
 * cannot stand up a local Postgres and migrations cannot be executed before
 * they are applied to a real project. Parsing is not a substitute for running
 * them — it catches syntax, not semantics — but it is the difference between
 * handing over SQL that has been checked and SQL that has only been read.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse, loadModule, formatSqlError } from "libpg-query";

const dir = "supabase/migrations";

await loadModule();

const files = readdirSync(dir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No migrations found in " + dir);
  process.exitCode = 0;
} else {
  let failed = false;

  for (const file of files) {
    const sql = readFileSync(path.join(dir, file), "utf8");
    try {
      const result = await parse(sql);
      console.log(`OK    ${file}  (${result?.stmts?.length ?? "?"} statements)`);
    } catch (error) {
      failed = true;
      console.log(`FAIL  ${file}`);
      try {
        console.log(formatSqlError(error, sql));
      } catch {
        console.log("      " + (error.message || String(error)));
      }
    }
  }

  // Set exitCode rather than calling process.exit(): the WASM module still
  // holds libuv handles at this point, and forcing exit trips an assertion in
  // libuv on Windows after the work has already completed.
  process.exitCode = failed ? 1 : 0;
}
