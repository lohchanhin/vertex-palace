import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepo } from "../src/scanner/scan-repo";
import { initPalace } from "../src/storage/init-palace";
import { withFixture } from "./test-utils";

describe("scanRepo", () => {
  it("ignores node_modules and .env", async () => {
    await withFixture("ts-api", async (root) => {
      await writeFile(path.join(root, ".env"), "SECRET=value", "utf8");
      await mkdir(path.join(root, "node_modules", "pkg"), { recursive: true });
      await writeFile(path.join(root, "node_modules", "pkg", "index.js"), "module.exports = {}", "utf8");
      await mkdir(path.join(root, "packages", "app", "node_modules", "pkg"), { recursive: true });
      await writeFile(path.join(root, "packages", "app", "node_modules", "pkg", "index.js"), "module.exports = {}", "utf8");

      const scan = await scanRepo({ root, includeHidden: true });

      expect(scan.files.some((file) => file.path.includes("node_modules"))).toBe(false);
      expect(scan.files.some((file) => file.path === ".env")).toBe(false);
      expect(scan.files.some((file) => file.path.endsWith("auth.controller.ts"))).toBe(true);
    });
  });

  it("ignores Codex worktrees and arbitrary nested Git repositories", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, ".codex-work", "client-copy", "src"), { recursive: true });
      await writeFile(path.join(root, ".codex-work", "client-copy", "src", "duplicate.ts"), "export const duplicate = true;", "utf8");
      await mkdir(path.join(root, ".codex-temp"), { recursive: true });
      await writeFile(path.join(root, ".codex-temp", "scratch.ts"), "export const scratch = true;", "utf8");
      await mkdir(path.join(root, "tmp"), { recursive: true });
      await writeFile(path.join(root, "tmp", "scratch.ts"), "export const scratch = true;", "utf8");
      await mkdir(path.join(root, "vendor-dashboard", "src"), { recursive: true });
      await writeFile(path.join(root, "vendor-dashboard", ".git"), "gitdir: ../.git/worktrees/vendor-dashboard", "utf8");
      await writeFile(path.join(root, "vendor-dashboard", "src", "foreign.ts"), "export const foreign = true;", "utf8");

      const scan = await scanRepo({ root, includeHidden: true });

      expect(scan.files.some((file) => file.path.includes(".codex-work"))).toBe(false);
      expect(scan.files.some((file) => file.path.includes(".codex-temp"))).toBe(false);
      expect(scan.files.some((file) => file.path.startsWith("tmp/"))).toBe(false);
      expect(scan.files.some((file) => file.path.includes("vendor-dashboard"))).toBe(false);
      expect(scan.ignored.some((file) => file.reason.includes("nested repository: vendor-dashboard"))).toBe(true);
    });
  });

  it("honors project-specific ignore patterns from palace.yml", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      const configPath = path.join(root, ".palace", "palace.yml");
      const config = await readFile(configPath, "utf8");
      await writeFile(configPath, config.replace('  - ".git"', '  - ".git"\n  - "generated-local"\n  - "generated-local/**"'), "utf8");
      await mkdir(path.join(root, "generated-local"), { recursive: true });
      await writeFile(path.join(root, "generated-local", "noise.ts"), "export const noise = true;", "utf8");

      const scan = await scanRepo({ root, includeHidden: true });

      expect(scan.files.some((file) => file.path.includes("generated-local"))).toBe(false);
    });
  });
});
