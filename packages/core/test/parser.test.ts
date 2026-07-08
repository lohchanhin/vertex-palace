import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFile } from "../src/parser/parse-file";
import { withFixture } from "./test-utils";

describe("parseFile", () => {
  it("extracts TypeScript imports, classes, methods, and functions", async () => {
    await withFixture("ts-api", async (root) => {
      const parsed = await parseFile(root, "src/controllers/auth.controller.ts", "typescript");

      expect(parsed.imports).toContain("../services/auth.service");
      expect(parsed.symbols.some((symbol) => symbol.name === "AuthController" && symbol.kind === "class")).toBe(true);
      expect(parsed.symbols.some((symbol) => symbol.name === "AuthController.login" && symbol.kind === "method")).toBe(true);
    });
  });

  it("falls back without crashing", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "broken.custom");
      await import("node:fs/promises").then((fs) => fs.writeFile(target, "function looseThing() {}", "utf8"));
      const parsed = await parseFile(root, "src/broken.custom", "custom");
      expect(parsed.symbols.some((symbol) => symbol.name === "looseThing")).toBe(true);
    });
  });
});
