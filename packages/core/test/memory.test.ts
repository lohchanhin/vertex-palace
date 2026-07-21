import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { indexPalace } from "../src/indexer/index-palace";
import { redactSecrets, writeMemory } from "../src/memory/write-memory";
import { routePalace } from "../src/router/route-planner";
import { initPalace } from "../src/storage/init-palace";
import { readGuardedMemory, readPitfallBoardForPack } from "../src/memory/pitfall-board";
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

  it("deduplicates normalized pitfalls and packs multiple relevant entries", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      await writeMemory({
        root,
        task: "improve scanner routing",
        outcome: "partial",
        pitfalls: ["Do not index nested worktrees."],
        tags: ["scanner", "routing"]
      });
      await writeMemory({
        root,
        task: "improve scanner routing",
        outcome: "partial",
        pitfalls: ["do not index nested worktrees!", "Route scanner tasks away from copied repositories."],
        tags: ["scanner", "routing"]
      });

      const index = JSON.parse(await readFile(path.join(root, ".palace", "memory", "pitfall-board.json"), "utf8")) as { entries: Array<{ text: string }> };
      const packed = await readPitfallBoardForPack(root, { task: "scanner routing copied worktrees", limit: 6 });

      expect(index.entries).toHaveLength(2);
      expect(packed).toContain("do not index nested worktrees!");
      expect(packed).toContain("Route scanner tasks away from copied repositories.");
    });
  });

  it("reports every retrieved memory inclusion and exclusion reason", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      const current = "2026-07-18T00:00:00.000Z";
      const old = "2025-01-01T00:00:00.000Z";
      const entry = (id: string, text: string, client: string, createdAt = current) => ({
        id,
        text,
        task: "article hero contrast renderer",
        outcome: "partial" as const,
        client,
        source: "pitfall" as const,
        tags: ["article", "hero", "contrast", "renderer"],
        memoryPath: `.palace/memory/${id}.md`,
        createdAt
      });
      const entries = [
        entry("memory-included", "Keep the Aurora renderer override scoped.", "aurora"),
        entry("memory-scope", "Keep the Beta renderer override scoped.", "beta"),
        entry("memory-expired", "An old Aurora renderer warning.", "aurora", old),
        entry("memory-limit", "A second current Aurora renderer warning.", "aurora")
      ];
      await writeFile(
        path.join(root, ".palace", "memory", "pitfall-board.json"),
        JSON.stringify({ entries }),
        "utf8"
      );

      const result = await readGuardedMemory(root, {
        task: "Fix the Aurora article hero contrast renderer for this tenant",
        limit: 1,
        maxTokens: 600,
        maxAgeDays: 90,
        now: new Date("2026-07-19T00:00:00.000Z")
      });

      expect(result.items.map((item) => item.id)).toEqual(["memory-included"]);
      expect(result.decision).toBe("current_memory_available");
      expect(result.currentRelevantCount).toBe(1);
      expect(result.rejectedStaleCount).toBe(1);
      expect(result.rejectedScopeCount).toBe(1);
      expect(result.conflictCount).toBe(0);
      expect(result.telemetry).toEqual({
        memoryCandidates: 4,
        memoryIncluded: 1,
        memoryExcluded: [
          { id: "memory-limit", reason: "selection_limit_reached" },
          { id: "memory-expired", reason: "expired" },
          { id: "memory-scope", reason: "scope_mismatch" }
        ],
        candidateIds: ["memory-included", "memory-limit", "memory-expired", "memory-scope"],
        includedIds: ["memory-included"],
        memoryDecision: "current_memory_available",
        currentRelevantCount: 1,
        rejectedStaleCount: 1,
        rejectedScopeCount: 1,
        conflictCount: 0,
        requiresGuardedDelivery: false
      });
    });
  });

  it("reports token budget exclusions without silently dropping a candidate", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      const verbose = Array.from({ length: 180 }, (_, index) => `renderer-${index}`).join(" ");
      await writeFile(
        path.join(root, ".palace", "memory", "pitfall-board.json"),
        JSON.stringify({
          entries: [{
            id: "memory-too-large",
            text: `Aurora article contrast ${verbose}`,
            task: "Aurora article contrast renderer",
            outcome: "partial",
            client: "aurora",
            source: "pitfall",
            tags: ["aurora", "article", "contrast", "renderer"],
            memoryPath: ".palace/memory/memory-too-large.md",
            createdAt: "2026-07-18T00:00:00.000Z"
          }]
        }),
        "utf8"
      );

      const result = await readGuardedMemory(root, {
        task: "Fix the Aurora article contrast renderer",
        limit: 3,
        maxTokens: 100,
        now: new Date("2026-07-19T00:00:00.000Z")
      });

      expect(result.items).toEqual([]);
      expect(result.telemetry).toEqual({
        memoryCandidates: 1,
        memoryIncluded: 0,
        memoryExcluded: [{ id: "memory-too-large", reason: "token_budget_exceeded" }],
        candidateIds: ["memory-too-large"],
        includedIds: [],
        memoryDecision: "conflict_requires_guard",
        currentRelevantCount: 0,
        rejectedStaleCount: 0,
        rejectedScopeCount: 0,
        conflictCount: 1,
        requiresGuardedDelivery: true
      });
    });
  });

  it("guards missing explicit decision memory without guarding a bare migration keyword", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);

      const decision = await readGuardedMemory(root, {
        task: "Use the historical ownership decision for this token"
      });
      const migration = await readGuardedMemory(root, {
        task: "Fix the scheduler after migration"
      });

      expect(decision.decision).toBe("none");
      expect(decision.requiresGuardedDelivery).toBe(true);
      expect(migration.decision).toBe("none");
      expect(migration.requiresGuardedDelivery).toBe(false);
    });
  });

  it("excludes memory from an explicitly different version of the same subsystem", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      const entry = (id: string, client: string, text: string) => ({
        id,
        text,
        task: "Fix scheduler batch configuration after migration",
        outcome: "partial" as const,
        client,
        source: "pitfall" as const,
        tags: ["scheduler", "batch", "configuration", "migration"],
        memoryPath: `.palace/memory/${id}.md`,
        createdAt: "2026-07-18T00:00:00.000Z"
      });
      await writeFile(
        path.join(root, ".palace", "memory", "pitfall-board.json"),
        JSON.stringify({
          entries: [
            entry("memory-scheduler-v1", "scheduler-v1", "The v1 worker consumed legacy limits."),
            entry("memory-scheduler-v2", "scheduler-v2", "The v2 worker consumes runtime limits.")
          ]
        }),
        "utf8"
      );

      const result = await readGuardedMemory(root, {
        task: "Fix the v2 scheduler batch configuration now that migration is complete",
        now: new Date("2026-07-19T00:00:00.000Z")
      });

      expect(result.items.map((item) => item.id)).toEqual(["memory-scheduler-v2"]);
      expect(result.decision).toBe("current_memory_available");
      expect(result.currentRelevantCount).toBe(1);
      expect(result.rejectedScopeCount).toBe(1);
      expect(result.telemetry.memoryExcluded).toEqual([
        { id: "memory-scheduler-v1", reason: "scope_mismatch" }
      ]);
    });
  });

  it("infers one client from unique historical scope aliases without requiring its literal name", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      const entry = (id: string, client: string, task: string, text: string) => ({
        id,
        text,
        task,
        outcome: "partial" as const,
        client,
        source: "pitfall" as const,
        tags: ["article", "contrast", "tenant", "decision"],
        memoryPath: `.palace/memory/${id}.md`,
        createdAt: "2026-07-18T00:00:00.000Z"
      });
      await writeFile(
        path.join(root, ".palace", "memory", "pitfall-board.json"),
        JSON.stringify({
          entries: [
            entry(
              "memory-aurora-launch",
              "aurora",
              "Record the independently governed launch tenant ownership decision",
              "Keep the launch contrast change in Aurora and out of shared tokens."
            ),
            entry(
              "memory-beta-preview",
              "beta",
              "Record the regional preview tenant article decision",
              "Keep the Beta preview contrast override local."
            )
          ]
        }),
        "utf8"
      );

      const result = await readGuardedMemory(root, {
        task: "Use the historical decision to fix contrast for the independently governed launch tenant",
        now: new Date("2026-07-19T00:00:00.000Z")
      });

      expect(result.items.map((item) => item.id)).toEqual(["memory-aurora-launch"]);
      expect(result.telemetry.memoryExcluded).toEqual([
        { id: "memory-beta-preview", reason: "scope_mismatch" }
      ]);
      expect(result.telemetry.scopeInference).toEqual({
        client: "aurora",
        reason: "unique_historical_alias_match",
        evidenceTokens: ["contrast", "governed", "independently", "launch"]
      });
    });
  });

  it("refuses historical alias inference when multiple clients are equally plausible", async () => {
    await withFixture("ts-api", async (root) => {
      await initPalace(root);
      const entries = ["aurora", "beta"].map((client) => ({
        id: `memory-${client}`,
        text: `Keep the launch contrast override in ${client}.`,
        task: "Record the independently governed launch tenant ownership decision",
        outcome: "partial" as const,
        client,
        source: "pitfall" as const,
        tags: ["launch", "contrast", "tenant"],
        memoryPath: `.palace/memory/memory-${client}.md`,
        createdAt: "2026-07-18T00:00:00.000Z"
      }));
      await writeFile(
        path.join(root, ".palace", "memory", "pitfall-board.json"),
        JSON.stringify({ entries }),
        "utf8"
      );

      const result = await readGuardedMemory(root, {
        task: "Use the historical decision to fix contrast for the independently governed launch tenant",
        now: new Date("2026-07-19T00:00:00.000Z")
      });

      expect(result.items).toEqual([]);
      expect(result.decision).toBe("scope_rejected");
      expect(result.currentRelevantCount).toBe(0);
      expect(result.rejectedScopeCount).toBe(2);
      expect(result.conflictCount).toBe(0);
      expect(result.requiresGuardedDelivery).toBe(false);
      expect(result.telemetry.memoryExcluded).toEqual([
        { id: "memory-aurora", reason: "scope_mismatch" },
        { id: "memory-beta", reason: "scope_mismatch" }
      ]);
      expect(result.telemetry.scopeInference).toBeUndefined();
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
