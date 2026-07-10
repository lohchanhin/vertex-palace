import { defineConfig } from "tsup";

export default defineConfig({
  entry: { server: "packages/mcp/src/server.ts" },
  format: ["cjs"],
  platform: "node",
  target: "es2022",
  outDir: "plugins/vertex-palace/mcp",
  clean: true,
  splitting: false,
  minifyWhitespace: true,
  sourcemap: false,
  dts: false,
  outExtension: () => ({ js: ".cjs" }),
  noExternal: ["@vertex-palace/core", "@vertex-palace/shared"]
});
