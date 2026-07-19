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
      expect(output.markdown).toContain("Mode: bypass");
      expect(output.markdown).toContain("No source content packed");
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
      expect((output.json as { context: unknown[] }).context).toEqual([]);
      expect(output.payload?.contextBytes).toBe(Buffer.byteLength(serializePackOutput(output), "utf8"));
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
        context: Array<{ tier: string }>;
        deferredReferences: Array<{ tier: string }>;
      };

      expect(output.mode).toBe("route-lite");
      expect(json.context.length).toBeGreaterThan(0);
      expect(json.context.every((item) => item.tier === "primary")).toBe(true);
      expect(json.deferredReferences.some((item) => item.tier === "support")).toBe(true);
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
      const json = output.json as { context: Array<{ tier: string }> };

      expect(output.mode).toBe("full-palace");
      expect(output.modeSelection?.riskSignals.crossStack).toBe(true);
      expect(json.context.some((item) => item.tier === "support")).toBe(true);
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
      expect(output.payload?.guardrailCount).toBeGreaterThanOrEqual(1);
      expect(output.markdown).toContain("## Relevant Memory");
      expect(output.markdown).toContain("Never change the shared theme");
      expect(output.markdown).toContain("renderer previously ignored");
      expect(output.markdown).toContain("Current code and tests outrank remembered decisions");
      expect(output.payload?.contextEstimatedTokens).toBeLessThanOrEqual(output.modeSelection?.maxContextTokens ?? 0);

      const jsonOutput = await palaceContext({ root, task, budget: 6000, auto: true, format: "json" });
      const json = jsonOutput.json as { memory: unknown[]; guardrails: string[] };

      expect(jsonOutput.mode).toBe("full-palace");
      expect(json.memory).toHaveLength(2);
      expect(json.guardrails).toContain("Current code and tests outrank remembered decisions and pitfalls.");
      expect(jsonOutput.payload?.contextBytes).toBe(Buffer.byteLength(serializePackOutput(jsonOutput), "utf8"));
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
