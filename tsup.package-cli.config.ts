import { defineConfig } from "tsup";

export default defineConfig({
  entry: { palace: "packages/cli/src/index.ts" },
  format: ["cjs"],
  platform: "node",
  target: "es2022",
  outDir: "dist",
  clean: true,
  splitting: false,
  minifyWhitespace: true,
  sourcemap: false,
  dts: false,
  outExtension: () => ({ js: ".cjs" }),
  noExternal: ["@vertex-palace/cli", "@vertex-palace/core", "@vertex-palace/shared"]
});
