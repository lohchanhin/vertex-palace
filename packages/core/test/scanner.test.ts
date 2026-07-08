import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepo } from "../src/scanner/scan-repo";
import { withFixture } from "./test-utils";

describe("scanRepo", () => {
  it("ignores node_modules and .env", async () => {
    await withFixture("ts-api", async (root) => {
      await writeFile(path.join(root, ".env"), "SECRET=value", "utf8");
      await mkdir(path.join(root, "node_modules", "pkg"), { recursive: true });
      await writeFile(path.join(root, "node_modules", "pkg", "index.js"), "module.exports = {}", "utf8");

      const scan = await scanRepo({ root, includeHidden: true });

      expect(scan.files.some((file) => file.path.includes("node_modules"))).toBe(false);
      expect(scan.files.some((file) => file.path === ".env")).toBe(false);
      expect(scan.files.some((file) => file.path.endsWith("auth.controller.ts"))).toBe(true);
    });
  });
});
