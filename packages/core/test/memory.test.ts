import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { indexPalace } from "../src/indexer/index-palace";
import { redactSecrets, writeMemory } from "../src/memory/write-memory";
import { routePalace } from "../src/router/route-planner";
import { initPalace } from "../src/storage/init-palace";
import { withFixture } from "./test-utils";

describe("memory", () => {
  it("redacts secrets before writing memory", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      expect(redactSecrets("Authorization: Bearer secret-token password=hunter2")).toContain("[REDACTED]");
      const result = await writeMemory({
        root,
        task: "fix token",
        outcome: "success",
        notes: "password=hunter2 Authorization: Bearer abc.def.ghi"
      });
      expect(result.ok).toBe(true);
      expect(result.memoryPath).toContain("successful-routes");
      expect(result.ledgerMemoryPath.replace(/\\/g, "/")).toContain(".palace/memory/successful-routes");

      const latest = await readFile(path.join(root, ".palace", "memory", "latest-task.md"), "utf8");
      const log = await readFile(path.join(root, ".palace", "memory", "task-log.md"), "utf8");
      const index = JSON.parse(await readFile(path.join(root, ".palace", "memory", "index.json"), "utf8")) as { entries: Array<{ task: string }> };
      expect(latest).toContain("Task: fix token");
      expect(log).toContain("fix token");
      expect(index.entries[0]?.task).toBe("fix token");
    });
  });

  it("isolates multi-client memory when a client label is provided", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      const result = await writeMemory({
        root,
        client: "iMishang",
        task: "fix checkout",
        outcome: "partial",
        tags: ["checkout", "client-specific"],
        notes: "Kept tenant settings configurable."
      });
      const content = await readFile(result.memoryPath, "utf8");

      expect(result.memoryPath.replace(/\\/g, "/")).toContain("clients/imishang/task-summaries");
      expect(result.ledgerMemoryPath.replace(/\\/g, "/")).toContain("memory/clients/imishang/task-summaries");
      expect(content).toContain("Client: iMishang");
      expect(content).toContain("Tags: checkout, client-specific");

      const clientLatest = await readFile(path.join(root, ".palace", "memory", "clients", "imishang", "latest-task.md"), "utf8");
      const globalLatest = await readFile(path.join(root, ".palace", "memory", "latest-task.md"), "utf8");
      expect(clientLatest).toContain("Task: fix checkout");
      expect(globalLatest).toContain("Client: iMishang");
    });
  });

  it("writes repeated mistakes to the entrance pitfall board", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      const result = await writeMemory({
        root,
        task: "fix checkout",
        outcome: "partial",
        failedAttempts: ["Tried editing generated files before checking source templates."],
        pitfalls: ["Do not trust stale route files before checking latest-route.md."],
        tags: ["checkout", "routing"]
      });

      expect(result.pitfallsWritten).toBe(2);
      const board = await readFile(path.join(root, ".palace", "00-entrance", "pitfall-board.md"), "utf8");
      const index = JSON.parse(await readFile(path.join(root, ".palace", "memory", "pitfall-board.json"), "utf8")) as { entries: Array<{ text: string }> };

      expect(board).toContain("# Pitfall Board");
      expect(board).toContain("Do not trust stale route files");
      expect(board).toContain("Tried editing generated files");
      expect(index.entries).toHaveLength(2);
    });
  });

  it("binds memory to the latest route when routeId is omitted", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const route = await routePalace(root, "fix login refresh token bug");
      const result = await writeMemory({
        root,
        task: "fix login refresh token bug",
        outcome: "success",
        changedFiles: ["src/services/token.service.ts"]
      });

      const latest = await readFile(result.latestPath, "utf8");
      const log = await readFile(result.logPath, "utf8");
      const index = JSON.parse(await readFile(result.indexPath, "utf8")) as { entries: Array<{ routeId?: string }> };

      expect(latest).toContain(`Route: ${route.id}`);
      expect(log).toContain(`Route: ${route.id}`);
      expect(index.entries[0]?.routeId).toBe(route.id);
    });
  });
});
