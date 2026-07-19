import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calibrateConfidence, evaluateRoute } from "../src/evaluation/evaluate-route";
import { indexPalace } from "../src/indexer/index-palace";
import { withFixture } from "./test-utils";

describe("evaluateRoute", () => {
  it("measures context reduction and changed-file route coverage", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "docs"), { recursive: true });
      await writeFile(
        path.join(root, "docs", "large-unrelated-reference.md"),
        `# Unrelated reference\n\n${"background material ".repeat(12000)}`,
        "utf8"
      );
      await indexPalace(root);

      const evaluation = await evaluateRoute(root, "fix login refresh token bug", {
        changedFiles: ["src/controllers/auth.controller.ts", "src/services/token.service.ts:1-20"],
        budget: 6000,
        routeLimit: 8,
        maxDrawers: 3
      });

      expect(evaluation.context.repositoryTokens).toBeGreaterThan(evaluation.context.packTokens);
      expect(evaluation.context.tokenReductionPercent).toBeGreaterThan(0);
      expect(evaluation.context.repositoryToPackRatio).toBeGreaterThan(1);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.matchedFiles).toEqual([
        "src/controllers/auth.controller.ts",
        "src/services/token.service.ts"
      ]);
      expect(evaluation.coverage.missedFiles).toEqual([]);
      expect(evaluation.assessment).toBe("strong");

      const markdown = await readFile(path.join(root, evaluation.artifacts.latestMarkdownPath), "utf8");
      const json = JSON.parse(await readFile(path.join(root, evaluation.artifacts.latestJsonPath), "utf8")) as {
        id: string;
        routeId: string;
      };
      expect(markdown).toContain("# Vertex Palace Evaluation");
      expect(markdown).toContain("Changed-file coverage: 100%");
      expect(json.id).toBe(evaluation.id);
      expect(json.routeId).toBe(evaluation.routeId);
    });
  });

  it("surfaces route misses and overconfident scores", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);

      const evaluation = await evaluateRoute(root, "fix login refresh token bug", {
        changedFiles: ["src/payment/payment.service.ts"],
        routeLimit: 8
      });

      expect(evaluation.coverage.changedFileCoverage).toBe(0);
      expect(evaluation.coverage.missedFiles).toEqual(["src/payment/payment.service.ts"]);
      expect(evaluation.calibration.status).toBe("overconfident");
      expect(evaluation.assessment).toBe("needs-review");
      expect(evaluation.warnings).toEqual(
        expect.arrayContaining([
          "Route missed 1 changed file(s).",
          "Route confidence is higher than observed changed-file coverage."
        ])
      );
    });
  });

  it("keeps declared generated artifacts routable without counting their bundled source", async () => {
    await withFixture("ts-api", async (root) => {
      const sources = new Map<string, string>([
        ["packages/mcp/src/server.ts", "export const startServer = () => 'mcp';\n"],
        [
          "tsup.plugin-mcp.config.ts",
          "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/acme/mcp', outExtension: () => ({ js: '.cjs' }) });\n"
        ],
        ["plugins/acme/mcp/server.cjs", "const generated = 'bundle';\n".repeat(10000)]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(root, "Rebuild the generated MCP bundle", {
        changedFiles: ["plugins/acme/mcp/server.cjs"],
        routeLimit: 6,
        budget: 6000
      });

      expect(evaluation.context.skippedGeneratedFiles).toBe(1);
      expect(evaluation.context.repositoryTokens).toBeLessThan(50000);
      expect(evaluation.route.files).toContain("plugins/acme/mcp/server.cjs");
    });
  });

  it("calibrates confidence in both directions", () => {
    expect(calibrateConfidence(0.8, 0.7).status).toBe("well-calibrated");
    expect(calibrateConfidence(0.9, 0.2).status).toBe("overconfident");
    expect(calibrateConfidence(0.2, 0.9).status).toBe("underconfident");
    expect(calibrateConfidence(0.8).status).toBe("unverified");
  });
});
