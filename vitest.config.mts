import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      /*
       * `server-only` throws by design when imported outside a server component
       * bundle, which is exactly what a test runner is. Aliasing it to an empty
       * module lets server modules be imported and their pure functions tested,
       * without weakening the guard in the application build.
       */
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
