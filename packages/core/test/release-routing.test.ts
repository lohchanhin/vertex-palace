import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateRoute } from "../src/evaluation/evaluate-route";
import { indexPalace } from "../src/indexer/index-palace";
import { analyzeTask } from "../src/router/analyze-task";
import { classifyTask } from "../src/router/classify-task";
import { routePalace } from "../src/router/route-planner";
import { withFixture } from "./test-utils";

describe("release routing matrix", () => {
  it("routes a JavaScript monorepo npm release through manifests, notes, and regression tests", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "package.json",
        "packages/api/package.json",
        "packages/web/package.json",
        "packages/api/src/index.ts",
        "packages/api/test/release.test.ts",
        "CHANGELOG.md"
      ];
      await writeSources(root, {
        "package.json": JSON.stringify({ name: "acme-workspace", version: "1.4.0", workspaces: ["packages/*"] }),
        "packages/api/package.json": JSON.stringify({ name: "@acme/api", version: "1.4.0" }),
        "packages/web/package.json": JSON.stringify({ name: "@acme/web", version: "1.4.0" }),
        "packages/api/src/index.ts": "export const apiVersion = '1.4.0';\n",
        "packages/api/test/release.test.ts": "describe('release regression', () => it('publishes api', () => true));\n",
        "CHANGELOG.md": "# Changelog\n\n## 1.4.0\n\nPublish api and web packages.\n"
      });
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Publish version 1.4.0 of the api and web workspace packages to npm, update the changelog, and verify the release regression test.",
        { changedFiles, routeLimit: 8, budget: 12000, maxDrawers: 3 }
      );
      reportMatrix("R2-js-monorepo", evaluation);

      expect(evaluation.taskType).toBe("release");
      expect(evaluation.route.files).toEqual(expect.arrayContaining([
        "package.json",
        "packages/api/package.json",
        "packages/web/package.json",
        "packages/api/test/release.test.ts",
        "CHANGELOG.md"
      ]));
      expect(evaluation.route.files).not.toContain("src/payment/payment.service.ts");
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(8);
      expect(evaluation.coverage.changedFileCoverage).toBeGreaterThanOrEqual(0.67);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.5);
    });
  });

  it("routes Codex plugin distribution through marketplace, manifest, and MCP pin", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "package.json",
        ".agents/plugins/marketplace.json",
        "plugins/acme/.codex-plugin/plugin.json",
        "plugins/acme/.mcp.json",
        "packages/mcp/src/server.ts",
        "CHANGELOG.md"
      ];
      await writeSources(root, {
        "package.json": JSON.stringify({ name: "acme-plugin", version: "1.2.0" }),
        ".agents/plugins/marketplace.json": JSON.stringify({ plugins: [{ name: "acme", source: { ref: "v1.2.0" } }] }),
        "plugins/acme/.codex-plugin/plugin.json": JSON.stringify({ name: "acme", version: "1.2.0" }),
        "plugins/acme/.mcp.json": JSON.stringify({ mcpServers: { acme: { args: ["acme@1.2.0"] } } }),
        "packages/mcp/src/server.ts": "export const version = '1.2.0';\n",
        "CHANGELOG.md": "# Changelog\n\n## 1.2.0 Codex plugin release\n"
      });
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Release the Acme Codex plugin v1.2.0, update its marketplace ref and MCP npm pin, then verify public installation.",
        { changedFiles, routeLimit: 8, budget: 12000, maxDrawers: 3 }
      );
      reportMatrix("R3-codex-plugin", evaluation);

      expect(evaluation.taskType).toBe("release");
      expect(evaluation.route.files).toEqual(expect.arrayContaining([
        "package.json",
        ".agents/plugins/marketplace.json",
        "plugins/acme/.codex-plugin/plugin.json",
        "plugins/acme/.mcp.json"
      ]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(8);
      expect(evaluation.coverage.changedFileCoverage).toBeGreaterThanOrEqual(0.67);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.5);
    });
  });

  it("routes a Python release through PyPI metadata, notes, and tests", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "pyproject.toml",
        "src/acme/__init__.py",
        "tests/test_release.py",
        "CHANGELOG.md"
      ];
      await writeSources(root, {
        "pyproject.toml": "[project]\nname = 'acme'\nversion = '2.0.0'\n",
        "src/acme/__init__.py": "__version__ = '2.0.0'\n",
        "tests/test_release.py": "def test_release_version():\n    assert True\n",
        "CHANGELOG.md": "# Changelog\n\n## 2.0.0 PyPI release\n"
      });
      await indexPalace(root);

      const evaluation = await evaluateRoute(
        root,
        "Publish Acme Python 2.0.0 to PyPI, update the changelog, and verify the release test before tagging.",
        { changedFiles, routeLimit: 6, budget: 12000, maxDrawers: 3 }
      );
      reportMatrix("R4-python-pypi", evaluation);

      expect(evaluation.taskType).toBe("release");
      expect(evaluation.route.files).toEqual(expect.arrayContaining([
        "pyproject.toml",
        "tests/test_release.py",
        "CHANGELOG.md"
      ]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(6);
      expect(evaluation.coverage.changedFileCoverage).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.5);
    });
  });

  it("preserves action intent around release vocabulary", async () => {
    expect(classifyTask("发布 Acme 新版本到 npm，更新 changelog 与 Git tag")).toBe("release");
    expect(classifyTask("Fix npm publish authentication failure E401")).toBe("bugfix");
    expect(classifyTask("修复 npm 发布失败 E401")).toBe("bugfix");
    expect(classifyTask("Explain how to publish a package to npm")).toBe("explain");
    expect(classifyTask("Review the release checklist for security risks")).toBe("review");
    expect(classifyTask("Test the release workflow without publishing")).toBe("test");
    expect(classifyTask("Deploy the application to production")).toBe("unknown");

    await withFixture("ts-api", async (root) => {
      await writeSources(root, {
        "CHANGELOG.md": "# Changelog\n\n## Next release\n",
        "packages/acme/package.json": JSON.stringify({ name: "acme", version: "3.0.0" })
      });
      await indexPalace(root);
      const route = await routePalace(root, "发布 Acme 新版本到 npm，更新 changelog 与 Git tag", { routeLimit: 6 });
      const analysis = analyzeTask(route.task);

      expect(route.taskType).toBe("release");
      expect(route.route.map((step) => step.sourcePath)).toEqual(expect.arrayContaining([
        "packages/acme/package.json",
        "CHANGELOG.md"
      ]));
      expect(analysis.keywords).toEqual(expect.arrayContaining(["release", "package", "changelog", "tag"]));
    });
  });
});

async function writeSources(root: string, sources: Record<string, string>): Promise<void> {
  for (const [relativePath, source] of Object.entries(sources)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source, "utf8");
  }
}

function reportMatrix(name: string, evaluation: Awaited<ReturnType<typeof evaluateRoute>>): void {
  if (process.env.RELEASE_MATRIX_REPORT !== "1") return;
  process.stdout.write(`${JSON.stringify({
    name,
    taskType: evaluation.taskType,
    routeFiles: evaluation.route.files,
    changedFileCoverage: evaluation.coverage.changedFileCoverage,
    routeFocus: evaluation.coverage.routeFocus,
    confidence: evaluation.route.confidence,
    calibration: evaluation.calibration
  })}\n`);
}
