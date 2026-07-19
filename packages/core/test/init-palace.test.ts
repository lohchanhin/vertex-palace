import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { initPalace } from "../src/storage/init-palace";
import { exists } from "../src/storage/read-palace";
import { withFixture } from "./test-utils";

describe("initPalace Git isolation", () => {
  it("initializes a non-Git directory without creating Git metadata", async () => {
    await withFixture("ts-api", async (root) => {
      const result = await initPalace(root);

      expect(result.gitExcludePath).toBeNull();
      expect(result.gitExcludeUpdated).toBe(false);
      expect(await exists(path.join(root, ".git"))).toBe(false);
      expect(await exists(path.join(root, ".palace", "palace.yml"))).toBe(true);
    });
  });

  it("adds one local exclude entry without editing tracked .gitignore", async () => {
    await withFixture("ts-api", async (root) => {
      const excludePath = path.join(root, ".git", "info", "exclude");
      const gitignorePath = path.join(root, ".gitignore");
      await mkdir(path.dirname(excludePath), { recursive: true });
      await writeFile(excludePath, "# local excludes\n", "utf8");
      await writeFile(gitignorePath, "node_modules/\n", "utf8");

      const first = await initPalace(root);
      const second = await initPalace(root);
      const exclude = await readFile(excludePath, "utf8");

      expect(first.gitExcludePath).toBe(excludePath);
      expect(first.gitExcludeUpdated).toBe(true);
      expect(second.gitExcludeUpdated).toBe(false);
      expect(exclude.match(/^\/\.palace\/$/gm)).toHaveLength(1);
      expect(await readFile(gitignorePath, "utf8")).toBe("node_modules/\n");
    });
  });

  it("writes to the common Git directory for a linked worktree", async () => {
    await withFixture("ts-api", async (root) => {
      const commonDirectory = path.join(root, ".git-common");
      const worktreeDirectory = path.join(commonDirectory, "worktrees", "fixture");
      const excludePath = path.join(commonDirectory, "info", "exclude");
      await mkdir(worktreeDirectory, { recursive: true });
      await writeFile(path.join(root, ".git"), "gitdir: .git-common/worktrees/fixture\n", "utf8");
      await writeFile(path.join(worktreeDirectory, "commondir"), "../..\n", "utf8");

      const result = await initPalace(root);

      expect(result.gitExcludePath).toBe(excludePath);
      expect(result.gitExcludeUpdated).toBe(true);
      expect(await readFile(excludePath, "utf8")).toBe("/.palace/\n");
    });
  });
});
