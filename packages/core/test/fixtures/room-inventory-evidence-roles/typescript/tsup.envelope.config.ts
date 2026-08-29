import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "envelope-adapter": "typescript/src/envelope-adapter.ts" },
  outDir: "typescript/generated",
  outExtension: () => ({ js: ".cjs" })
});
