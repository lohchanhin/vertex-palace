import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { indexPalace, palaceContext, serializePackOutput } from "../src/index";
import { writeMemory } from "../src/memory/write-memory";
import { getPalaceStatus } from "../src/storage/status";
import { withFixture } from "./test-utils";

describe("palaceContext", () => {
  it("initializes, indexes, routes, and packs an uninitialized repository in one call", async () => {
    await withFixture("ts-api", async (root) => {
      const output = await palaceContext({
        root,
        task: "fix login refresh token bug",
        budget: 6000,
        routeLimit: 4,
        maxDrawers: 2
      });
      const status = await getPalaceStatus(root);

      expect(status.initialized).toBe(true);
      expect(status.indexed).toBe(true);
      expect(status.stale).toBe(false);
      expect(output.routeId).toMatch(/^route_/);
      expect(output.markdown).toContain("## Palace Route");
      expect(output.markdown).not.toContain("## Excluded Areas");
      expect((output.markdown?.match(/### Drawer:/g) ?? []).length).toBeLessThanOrEqual(2);
    });
  });

  it("bypasses packed source context for one explicit file in a small repository", async () => {
    await withFixture("ts-api", async (root) => {
      const output = await palaceContext({
        root,
        task: "Fix formatting in src/services/token.service.ts",
        budget: 6000,
        auto: true
      });

      expect(output.mode).toBe("bypass");
      expect(output.payload?.contextCalls).toBe(1);
      expect(output.markdown?.trim().split("\n")).toEqual([
        "Mode: bypass",
        "Primary candidate: src/services/token.service.ts",
        "Reason: Safe one-file route: no relevant memory or boundary risk. Direct: inspect once, edit; run npm test; final once: `git diff --check; git status --short; git diff -- src/services/token.service.ts`; stop."
      ]);
      expect(output.markdown).not.toContain("generateAccessToken");
      expect(output.payload?.contextBytes).toBe(Buffer.byteLength(output.markdown ?? "", "utf8"));
      expect(output.payload?.contextEstimatedTokens).toBeLessThanOrEqual(output.modeSelection?.maxContextTokens ?? 0);
    });
  });

  it("keeps bypass JSON below its selected context budget", async () => {
    await withFixture("ts-api", async (root) => {
      const output = await palaceContext({
        root,
        task: "Fix formatting in src/services/token.service.ts",
        budget: 6000,
        auto: true,
        format: "json"
      });

      expect(output.mode).toBe("bypass");
      expect(output.payload?.contextEstimatedTokens).toBeLessThanOrEqual(output.modeSelection?.maxContextTokens ?? 0);
      expect(output.json).toEqual({
        mode: "bypass",
        primaryCandidate: "src/services/token.service.ts",
        reason: "Safe one-file route: no relevant memory or boundary risk. Direct: inspect once, edit; run npm test; final once: `git diff --check; git status --short; git diff -- src/services/token.service.ts`; stop."
      });
      expect(Object.keys(output.json as Record<string, unknown>)).toEqual(["mode", "primaryCandidate", "reason"]);
      expect(output.payload?.contextBytes).toBe(Buffer.byteLength(serializePackOutput(output), "utf8"));
    });
  });

  it("emits the declared package-manager test command without adding a bypass field", async () => {
    await withFixture("ts-api", async (root) => {
      await writeFile(
        path.join(root, "package.json"),
        `${JSON.stringify({
          name: "ts-api-fixture",
          version: "1.0.0",
          packageManager: "pnpm@10.34.5",
          scripts: { test: "vitest run" }
        }, null, 2)}\n`,
        "utf8"
      );

      const output = await palaceContext({
        root,
        task: "Fix formatting in src/services/token.service.ts",
        budget: 6000,
        auto: true,
        format: "json"
      });
      const json = output.json as Record<string, unknown>;

      expect(output.mode).toBe("bypass");
      expect(json.reason).toContain("run pnpm test");
      expect(json.reason).toContain("final once: `git diff --check; git status --short; git diff -- src/services/token.service.ts`");
      expect(Object.keys(json)).toEqual(["mode", "primaryCandidate", "reason"]);
      expect(output.payload?.contextEstimatedTokens).toBeLessThan(80);
    });
  });

  it("bypasses a high-confidence single-file route without an explicit filename", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "format-currency.mjs");
      await writeFile(target, "export function formatCurrency(value) { return `$${value.toFixed(2)}`; }\n", "utf8");
      await indexPalace(root);

      const output = await palaceContext({
        root,
        task: "Fix currency formatting so negative zero is rendered as $0.00. Keep the public API stable.",
        budget: 6000,
        auto: true,
        format: "json"
      });

      expect(output.mode).toBe("bypass");
      expect(output.json).toMatchObject({
        mode: "bypass",
        primaryCandidate: "src/format-currency.mjs"
      });
      expect((output.json as Record<string, unknown>).reason).toContain(
        "final once: `git diff --check; git status --short; git diff -- src/format-currency.mjs`"
      );
      expect(Object.keys(output.json as Record<string, unknown>)).toEqual(["mode", "primaryCandidate", "reason"]);
    });
  });

  it("bypasses all four repeated small-local trials in a large indexed repository", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "format-currency.mjs");
      const noiseRoot = path.join(root, "noise");
      await mkdir(noiseRoot, { recursive: true });
      await writeFile(target, "export function formatCurrency(value) { return `$${value.toFixed(2)}`; }\n", "utf8");
      await Promise.all(
        Array.from({ length: 240 }, (_, index) => writeFile(
          path.join(noiseRoot, `module-${String(index).padStart(3, "0")}.ts`),
          `export const unrelatedValue${index} = ${index};\n`,
          "utf8"
        ))
      );
      await indexPalace(root);

      const outputs = [];
      for (let trial = 0; trial < 4; trial += 1) {
        outputs.push(await palaceContext({
          root,
          task: "Fix currency formatting so negative zero is rendered as $0.00. Keep the public API stable.",
          budget: 6000,
          auto: true,
          format: "json"
        }));
      }

      expect(outputs.map((output) => output.mode)).toEqual(["bypass", "bypass", "bypass", "bypass"]);
      for (const output of outputs) {
        expect(output.json).toMatchObject({ mode: "bypass", primaryCandidate: "src/format-currency.mjs" });
        expect((output.json as Record<string, unknown>).reason).toContain(
          "final once: `git diff --check; git status --short; git diff -- src/format-currency.mjs`"
        );
        expect(Object.keys(output.json as Record<string, unknown>)).toEqual(["mode", "primaryCandidate", "reason"]);
        expect(output.payload?.contextEstimatedTokens).toBeLessThan(80);
      }
    });
  });

  it("keeps a single-file task in Palace when relevant memory exists", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "format-currency.mjs");
      await writeFile(target, "export function formatCurrency(value) { return `$${value.toFixed(2)}`; }\n", "utf8");
      await indexPalace(root);
      await writeMemory({
        root,
        task: "currency formatting negative zero",
        outcome: "partial",
        pitfalls: ["Currency formatting must preserve the accounting sign policy for negative zero."],
        tags: ["currency", "formatting", "negative", "zero"]
      });

      const output = await palaceContext({
        root,
        task: "Fix currency formatting so negative zero is rendered as $0.00. Keep the public API stable.",
        budget: 6000,
        auto: true,
        format: "json"
      });

      expect(output.mode).toBe("full-palace");
      expect(output.memoryTelemetry?.memoryIncluded).toBe(1);
      expect(output.payload?.memoryItemCount).toBe(1);
    });
  });

  it("uses route-lite for a focused task and loads only primary context", async () => {
    await withFixture("ts-api", async (root) => {
      const output = await palaceContext({
        root,
        task: "fix login refresh token bug",
        budget: 6000,
        auto: true,
        format: "json"
      });
      const json = output.json as {
        context: Array<{ tier: string; loadLevel: string }>;
        deferredReferences: Array<{ tier: string }>;
        recommendedExecution: string[];
        executionBoundaries: {
          primary: string[];
          support: string[];
          deferred: string[];
          excluded: Array<{ sourcePath: string; reason: string }>;
          requiredEvidence: string[];
          doNot: string[];
          stopCondition: string[];
          conflictSummary: string[];
        };
      };

      expect(output.mode).toBe("route-lite");
      expect(json.context.length).toBeGreaterThan(0);
      expect(json.context.every((item) => item.tier === "primary")).toBe(true);
      expect(json.deferredReferences.some((item) => item.tier === "support")).toBe(true);
      expect(json.executionBoundaries.primary.length).toBeGreaterThan(0);
      expect(json.executionBoundaries.support.length).toBeGreaterThan(0);
      expect(json.executionBoundaries.deferred).toBeInstanceOf(Array);
      expect(json.executionBoundaries.excluded).toBeInstanceOf(Array);
      expect(json.executionBoundaries.requiredEvidence).toEqual(["tests/auth.e2e.test.ts"]);
      expect(json.executionBoundaries.requiredEvidence).not.toContain("README.md");
      expect(json.context.every((item) => item.loadLevel === "full_symbol" || item.loadLevel === "full_file")).toBe(true);
      expect(json.recommendedExecution).toContain("Use delivered full_file or full_symbol drawers directly; do not reopen those paths.");
      expect(json.executionBoundaries.doNot).toContain("Do not inventory or broadly scan the repository.");
      expect(json.executionBoundaries.stopCondition).toContain("Targeted tests for the changed behavior pass.");
      expect(json.executionBoundaries.conflictSummary.length).toBeGreaterThan(0);
      expect(output.executionBoundaries).toEqual(json.executionBoundaries);
      expect(output.payload?.memoryItemCount).toBe(0);
      expect(output.payload?.contextEstimatedTokens).toBeLessThan(2000);
    });
  });

  it("uses full-palace when a task crosses frontend and backend contracts", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "frontend"), { recursive: true });
      await writeFile(
        path.join(root, "frontend", "login-form.tsx"),
        "export function LoginForm() { return <form>Login</form>; }\n",
        "utf8"
      );

      const output = await palaceContext({
        root,
        task: "Update the frontend and backend API contract for login",
        budget: 6000,
        auto: true,
        format: "json"
      });
      const json = output.json as {
        context: Array<{ sourcePath: string; tier: string; loadLevel: string }>;
        executionBoundaries: { requiredEvidence: string[] };
      };

      expect(output.mode).toBe("full-palace");
      expect(output.modeSelection?.riskSignals.crossStack).toBe(true);
      expect(json.context.some((item) => item.tier === "support")).toBe(true);
      expect(json.context).toContainEqual(expect.objectContaining({
        sourcePath: "tests/auth.e2e.test.ts",
        loadLevel: "full_file"
      }));
      expect(json.executionBoundaries.requiredEvidence).toEqual(["tests/auth.e2e.test.ts"]);
      expect(output.payload?.memoryItemCount).toBe(0);
    });
  });

  it("delivers relevant seeded memory when auto selects full-palace", async () => {
    await withFixture("ts-api", async (root) => {
      const noiseRoot = path.join(root, "noise");
      await mkdir(noiseRoot, { recursive: true });
      await Promise.all(
        Array.from({ length: 105 }, (_, index) => writeFile(
          path.join(noiseRoot, `module-${String(index).padStart(3, "0")}.ts`),
          `export const value${index} = ${index};\n`,
          "utf8"
        ))
      );
      await indexPalace(root);
      await writeMemory({
        root,
        client: "aurora",
        task: "Aurora article hero contrast tenant renderer",
        outcome: "partial",
        pitfalls: [
          "Never change the shared theme for an Aurora-only article contrast issue.",
          "The renderer previously ignored an explicit Aurora tenant text-color override."
        ],
        tags: ["aurora", "article", "contrast", "tenant", "renderer"]
      });

      const task = "Fix the Aurora article hero contrast regression while preserving the appearance of every other tenant. The renderer must honor an explicit tenant text-color override, the Aurora hero must meet WCAG AA contrast, and the complete test suite must pass. Do not weaken or rewrite the tests.";
      const output = await palaceContext({
        root,
        task,
        budget: 6000,
        auto: true
      });

      expect(output.mode).toBe("full-palace");
      expect(output.modeSelection?.memoryLevel).toBe("scoped-summary");
      expect(output.payload?.memoryItemCount).toBe(2);
      expect(output.payload?.memoryCandidateCount).toBe(2);
      expect(output.payload?.memoryExcludedCount).toBe(0);
      expect(output.memoryTelemetry).toMatchObject({
        memoryCandidates: 2,
        memoryIncluded: 2,
        memoryExcluded: []
      });
      expect(output.memoryTelemetry?.candidateIds).toEqual(output.memoryTelemetry?.includedIds);
      expect(output.payload?.guardrailCount).toBeGreaterThanOrEqual(1);
      expect(output.markdown).toContain("## Relevant Memory");
      expect(output.markdown).toContain("## Memory Selection");
      expect(output.markdown).toContain("## Primary");
      expect(output.markdown).toContain("## Support");
      expect(output.markdown).toContain("## Required Evidence");
      expect(output.markdown).toContain("## Deferred");
      expect(output.markdown).toContain("## Excluded");
      expect(output.markdown).toContain("## Do Not");
      expect(output.markdown).toContain("## Stop Condition");
      expect(output.markdown).toContain("## Conflict Summary");
      expect(output.markdown).toContain("Estimated context cost:");
      expect(output.markdown).toContain("Candidates: 2 | Included: 2 | Excluded: 0");
      expect(output.markdown).toContain("Never change the shared theme");
      expect(output.markdown).toContain("renderer previously ignored");
      expect(output.markdown).toContain("Current code and tests outrank remembered decisions");
      expect(output.payload?.contextEstimatedTokens).toBeLessThanOrEqual(output.modeSelection?.maxContextTokens ?? 0);

      const jsonOutput = await palaceContext({ root, task, budget: 6000, auto: true, format: "json" });
      const json = jsonOutput.json as {
        memory: unknown[];
        memoryTelemetry: {
          memoryCandidates: number;
          memoryIncluded: number;
          memoryExcluded: unknown[];
          candidateIds: string[];
          includedIds: string[];
        };
        guardrails: string[];
      };

      expect(jsonOutput.mode).toBe("full-palace");
      expect(json.memory).toHaveLength(2);
      expect(json.memoryTelemetry.memoryCandidates).toBe(2);
      expect(json.memoryTelemetry.memoryIncluded).toBe(2);
      expect(json.memoryTelemetry.memoryExcluded).toEqual([]);
      expect(json.memoryTelemetry.candidateIds).toEqual(json.memoryTelemetry.includedIds);
      expect(json.guardrails).toContain("Current code and tests outrank remembered decisions and pitfalls.");
      expect(jsonOutput.payload?.contextBytes).toBe(Buffer.byteLength(serializePackOutput(jsonOutput), "utf8"));
    });
  });

  it("delivers a uniquely inferred historical client scope when the task uses a business alias", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "clients", "aurora"), { recursive: true });
      await writeFile(
        path.join(root, "clients", "aurora", "article-tokens.ts"),
        "export const articleTokens = { text: '#94a3b8' };\n",
        "utf8"
      );
      await indexPalace(root);
      await writeMemory({
        root,
        client: "aurora",
        task: "Record the independently governed launch tenant article-token ownership decision",
        outcome: "partial",
        pitfalls: [
          "A prior launch contrast fix changed the shared article token. Keep the launch-only change in Aurora."
        ],
        failedAttempts: [
          "Changing the shared fallback expanded the launch page fix to tenants outside the approved scope."
        ],
        tags: ["launch-tenant", "article-token", "tenant-ownership", "accessibility"]
      });

      const output = await palaceContext({
        root,
        task: "Fix the article body text contrast regression for the independently governed launch tenant. Historical project decisions define which tenant owns this token. Keep the shared token and every other tenant unchanged.",
        budget: 6000,
        auto: true
      });

      expect(output.mode).toBe("guarded-memory-palace");
      expect(output.payload?.memoryItemCount).toBe(2);
      expect(output.memoryTelemetry?.memoryIncluded).toBe(2);
      expect(output.memoryTelemetry?.memoryExcluded).toEqual([]);
      expect(output.memoryTelemetry?.scopeInference).toEqual({
        client: "aurora",
        reason: "unique_historical_alias_match",
        evidenceTokens: expect.arrayContaining(["governed", "independently", "launch"])
      });
      expect(output.markdown).toContain("Inferred scope: aurora (unique_historical_alias_match");
      expect(output.markdown).toContain("Keep the launch-only change in Aurora");
      expect(output.executionBoundaries?.primary).toEqual([
        "clients/aurora/article-tokens.ts"
      ]);
      expect(output.markdown).toMatch(/## Primary[\s\S]*clients\/aurora\/article-tokens\.ts/);
      expect(output.markdown).not.toMatch(/### primary: (?!clients\/aurora\/article-tokens\.ts)/);
    });
  });

  it("guards a migration task while excluding memories from the superseded subsystem version", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "src", "scheduler"), { recursive: true });
      await mkdir(path.join(root, "config"), { recursive: true });
      await writeFile(
        path.join(root, "src", "scheduler", "load-batch-limit.mjs"),
        "export function loadBatchLimit() { return 25; }\n",
        "utf8"
      );
      await writeFile(
        path.join(root, "config", "runtime-limits.mjs"),
        "export const runtimeLimits = { maxBatch: 25 };\n",
        "utf8"
      );
      await indexPalace(root);
      await writeMemory({
        root,
        client: "scheduler-v1",
        task: "Repair the v1 scheduler batch configuration",
        outcome: "partial",
        pitfalls: [
          "The v1 worker consumed legacy limits.",
          "A previous v1 repair left the active legacy value unchanged."
        ],
        tags: ["scheduler", "batch", "configuration", "migration"]
      });

      const output = await palaceContext({
        root,
        task: "Fix the v2 batch scheduler now that the configuration migration is complete.",
        budget: 6000,
        auto: true
      });

      expect(output.mode).toBe("guarded-memory-palace");
      expect(output.payload?.memoryCandidateCount).toBe(2);
      expect(output.payload?.memoryItemCount).toBe(0);
      expect(output.payload?.memoryExcludedCount).toBe(2);
      expect(output.memoryTelemetry?.memoryExcluded).toEqual([
        expect.objectContaining({ reason: "scope_mismatch" }),
        expect.objectContaining({ reason: "scope_mismatch" })
      ]);
      expect(output.markdown).toContain("No relevant, current memory evidence met the scope and age checks.");
      expect(output.markdown).toContain("2 retrieved memory item(s) were excluded with machine-readable reasons.");
    });
  });

  it("keeps full-palace output inside its context ceiling when memory telemetry is dense", async () => {
    await withFixture("ts-api", async (root) => {
      const noiseRoot = path.join(root, "noise");
      await mkdir(noiseRoot, { recursive: true });
      await Promise.all(
        Array.from({ length: 105 }, (_, index) => writeFile(
          path.join(noiseRoot, `module-${String(index).padStart(3, "0")}.ts`),
          `export const value${index} = ${index};\n`,
          "utf8"
        ))
      );
      await indexPalace(root);
      const entries = Array.from({ length: 50 }, (_, index) => ({
        id: `memory-${String(index).padStart(2, "0")}`,
        text: `Aurora article contrast renderer warning ${index}.`,
        task: "Aurora article hero contrast tenant renderer",
        outcome: "partial",
        client: "aurora",
        source: "pitfall",
        tags: ["aurora", "article", "contrast", "renderer"],
        memoryPath: `.palace/memory/memory-${String(index).padStart(2, "0")}.md`,
        createdAt: "2026-07-18T00:00:00.000Z"
      }));
      await writeFile(
        path.join(root, ".palace", "memory", "pitfall-board.json"),
        JSON.stringify({ entries }),
        "utf8"
      );

      const output = await palaceContext({
        root,
        task: "Fix the Aurora article hero contrast renderer without changing other tenants",
        budget: 6000,
        auto: true,
        format: "json"
      });

      expect(output.mode).toBe("full-palace");
      expect(output.memoryTelemetry?.memoryCandidates).toBe(50);
      expect(output.memoryTelemetry?.memoryIncluded).toBe(3);
      expect(output.memoryTelemetry?.memoryExcluded).toHaveLength(47);
      expect(output.payload?.contextEstimatedTokens).toBeLessThanOrEqual(output.modeSelection?.maxContextTokens ?? 0);
    });
  });

  it("hard-bounds guarded Markdown and JSON with fifty auditable memory candidates", async () => {
    await withFixture("ts-api", async (root) => {
      const payloadRoot = path.join(root, "src", "payload");
      await mkdir(payloadRoot, { recursive: true });
      await Promise.all(
        Array.from({ length: 10 }, (_, index) => writeFile(
          path.join(payloadRoot, `context-${index}.ts`),
          `export function fitMemoryTelemetry${index}() {\n${`  const payloadBudget${index} = "guarded memory telemetry context ceiling route evidence ${index}";\n`.repeat(45)}  return payloadBudget${index};\n}\n`,
          "utf8"
        ))
      );
      await indexPalace(root);
      const entries = Array.from({ length: 50 }, (_, index) => ({
        id: `memory-${String(index).padStart(2, "0")}`,
        text: `Guarded memory telemetry context ceiling warning ${index}.`,
        task: "Guarded memory telemetry context ceiling",
        outcome: "partial",
        source: "pitfall",
        tags: ["guarded", "memory", "telemetry", "context", "ceiling"],
        memoryPath: `.palace/memory/memory-${index}.md`,
        createdAt: "2026-07-18T00:00:00.000Z"
      }));
      await writeFile(
        path.join(root, ".palace", "memory", "pitfall-board.json"),
        JSON.stringify({ entries }),
        "utf8"
      );

      const task = "Use historical project decisions to fix guarded memory telemetry context ceiling across the payload packer and all regression validation surfaces";
      for (const format of ["markdown", "json"] as const) {
        const output = await palaceContext({
          root,
          task,
          budget: 5000,
          routeLimit: 10,
          maxDrawers: 5,
          mode: "guarded-memory-palace",
          format
        });
        const serialized = serializePackOutput(output);

        expect(output.mode).toBe("guarded-memory-palace");
        expect(output.memoryTelemetry?.memoryCandidates).toBe(50);
        expect(output.memoryTelemetry?.memoryIncluded).toBe(3);
        expect(output.memoryTelemetry?.candidateIds).toHaveLength(50);
        expect(output.memoryTelemetry?.memoryExcluded).toHaveLength(47);
        expect(output.memoryTelemetry?.memoryExcluded.every((item) => item.reason === "selection_limit_reached")).toBe(true);
        expect(serialized).toContain("memory-49");
        expect(output.payload?.contextEstimatedTokens).toBeLessThanOrEqual(5000);
        expect(output.payload?.contextBytes).toBe(Buffer.byteLength(serialized, "utf8"));
      }
    });
  });

  it("uses only relevant, scoped memory for tenant-sensitive tasks", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      await writeMemory({
        root,
        client: "client-alpha",
        task: "client alpha login tenant isolation",
        outcome: "partial",
        pitfalls: ["Keep client alpha login tokens isolated from shared defaults."],
        tags: ["login", "tenant"]
      });
      await writeMemory({
        root,
        task: "publish plugin package",
        outcome: "partial",
        pitfalls: ["Verify npm provenance before publishing the plugin."],
        tags: ["npm", "plugin"]
      });

      const output = await palaceContext({
        root,
        task: "For client alpha, use the previous login pitfall and keep shared tenant behavior isolated",
        budget: 6000,
        auto: true
      });

      expect(output.mode).toBe("guarded-memory-palace");
      expect(output.payload?.memoryItemCount).toBe(1);
      expect(output.payload?.memoryEstimatedTokens).toBeLessThanOrEqual(600);
      expect(output.markdown).toContain("Keep client alpha login tokens isolated");
      expect(output.markdown).toContain("Current code and tests outrank remembered decisions");
      expect(output.markdown).not.toContain("npm provenance");
    });
  });
});
