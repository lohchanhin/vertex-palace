import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateRoute } from "../src/evaluation/evaluate-route";
import { indexPalace } from "../src/indexer/index-palace";
import { analyzeTask } from "../src/router/analyze-task";
import { classifyTask } from "../src/router/classify-task";
import { routePalace } from "../src/router/route-planner";
import { withFixture } from "./test-utils";

const RELEASE_TASK = "Release Vertex Palace 0.2.2 after fixing Adaptive Full Palace memory delivery, verify npm registry, Git tag, and public plugin MCP installation";

const RELEASE_CHANGED_FILES = [
  ".agents/plugins/marketplace.json",
  "BUILD_WEEK.md",
  "CHANGELOG.md",
  "README.md",
  "docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md",
  "package.json",
  "packages/cli/package.json",
  "packages/cli/src/index.ts",
  "packages/core/package.json",
  "packages/core/src/packer/context-packer.ts",
  "packages/core/src/router/mode-selector.ts",
  "packages/core/test/context.test.ts",
  "packages/core/test/mode-selector.test.ts",
  "packages/mcp/package.json",
  "packages/mcp/src/server.ts",
  "packages/shared/package.json",
  "plugins/vertex-palace/.codex-plugin/plugin.json",
  "plugins/vertex-palace/.mcp.json",
  "plugins/vertex-palace/mcp/server.cjs"
] as const;

describe("routePalace", () => {
  it("classifies retrospective evaluation tasks and preserves tenant entities", () => {
    const task = "overall evaluation retrospective score for client6-blogunlock BlogUnlock route confidence";
    const analysis = analyzeTask(task);

    expect(classifyTask(task)).toBe("evaluation");
    expect(analysis.keywords).toEqual(expect.arrayContaining(["retrospective", "memory", "client6-blogunlock", "client6blogunlock", "blogunlock"]));
    expect(analysis.entities).toEqual(expect.arrayContaining(["client6-blogunlock", "client6blogunlock", "blogunlock"]));
  });

  it("distinguishes release work from publish failures and application deployment", () => {
    const analysis = analyzeTask(RELEASE_TASK);

    expect(classifyTask(RELEASE_TASK)).toBe("release");
    expect(classifyTask("发布 Vertex Palace 新版本到 npm 并建立 Git tag")).toBe("release");
    expect(classifyTask("Fix npm publish authentication failure E401")).toBe("bugfix");
    expect(classifyTask("修复 npm 发布失败 E401")).toBe("bugfix");
    expect(classifyTask("Deploy the application to production")).toBe("unknown");
    expect(analysis.keywords).toEqual(expect.arrayContaining([
      "release",
      "package",
      "manifest",
      "npm",
      "registry",
      "tag",
      "plugin",
      "mcp",
      "adaptive",
      "mode",
      "selector",
      "context",
      "packer",
      "test"
    ]));
  });

  it("covers implementation, regression, package, plugin, and release records for a release task", async () => {
    await withFixture("ts-api", async (root) => {
      const sources = new Map<string, string>([
        [".agents/plugins/marketplace.json", JSON.stringify({ plugins: [{ source: { ref: "v0.2.2" } }] })],
        ["BUILD_WEEK.md", "# Vertex Palace Build Week\n\nRelease verification and public installation.\n"],
        ["CHANGELOG.md", "# Changelog\n\n## 0.2.2\n\nAdaptive Full Palace memory delivery.\n"],
        ["README.md", "# Vertex Palace\n\nInstall the npm package and Codex plugin.\n"],
        ["docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md", "# Adaptive Full-Palace Memory Fidelity Fix\n\n## Release Verification\n"],
        ["package.json", JSON.stringify({ name: "vertex-palace", version: "0.2.2" })],
        ["packages/cli/package.json", JSON.stringify({ name: "@vertex-palace/cli", version: "0.2.2" })],
        ["packages/cli/src/index.ts", "export const cliVersion = '0.2.2 release';\n"],
        ["packages/core/package.json", JSON.stringify({ name: "@vertex-palace/core", version: "0.2.2" })],
        ["packages/core/src/packer/context-packer.ts", "export function packAdaptiveFullPalaceMemory() { return 'adaptive full palace context packer scoped memory delivery'; }\n"],
        ["packages/core/src/router/mode-selector.ts", "export function selectAdaptiveFullPalaceMode() { return 'adaptive mode selector full palace memory'; }\n"],
        ["packages/core/test/context.test.ts", "describe('adaptive context packer memory regression', () => it('delivers memory', () => true));\n"],
        ["packages/core/test/mode-selector.test.ts", "describe('adaptive mode selector release regression', () => it('selects full palace', () => true));\n"],
        ["packages/mcp/package.json", JSON.stringify({ name: "@vertex-palace/mcp", version: "0.2.2" })],
        ["packages/mcp/src/server.ts", "export const mcpServerVersion = '0.2.2 public plugin release';\n"],
        ["packages/shared/package.json", JSON.stringify({ name: "@vertex-palace/shared", version: "0.2.2" })],
        ["plugins/vertex-palace/.codex-plugin/plugin.json", JSON.stringify({ name: "vertex-palace", version: "0.2.2" })],
        ["plugins/vertex-palace/.mcp.json", JSON.stringify({ mcpServers: { "vertex-palace": { args: ["vertex-palace@0.2.2"] } } })],
        ["plugins/vertex-palace/mcp/server.cjs", "const version = '0.2.2';\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const evaluation = await evaluateRoute(root, RELEASE_TASK, {
        changedFiles: [...RELEASE_CHANGED_FILES],
        budget: 12000,
        routeLimit: 12,
        maxDrawers: 4
      });
      const routed = evaluation.route.files;

      expect(evaluation.taskType).toBe("release");
      expect(routed).toContain("packages/core/src/packer/context-packer.ts");
      expect(routed).toContain("packages/core/src/router/mode-selector.ts");
      expect(routed.some((file) => /^packages\/core\/test\/(?:context|mode-selector)\.test\.ts$/.test(file))).toBe(true);
      expect(routed).toContain("package.json");
      expect(routed).toContain("plugins/vertex-palace/.mcp.json");
      expect(routed.some((file) => file === "CHANGELOG.md" || file === "docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md")).toBe(true);
      expect(evaluation.coverage.changedFileCoverage).toBeGreaterThanOrEqual(0.5);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.6);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("routes evaluation feedback to Palace internals instead of nested application source", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "packages", "core", "src", "router"), { recursive: true });
      await mkdir(path.join(root, "packages", "core", "src", "memory"), { recursive: true });
      await mkdir(path.join(root, "vve-dashboard-language", "backend", "src", "services"), { recursive: true });
      await mkdir(path.join(root, "vve-dashboard-language", "scripts"), { recursive: true });
      await mkdir(path.join(root, "vve-dashboard-language", "shared"), { recursive: true });
      await writeFile(
        path.join(root, "packages", "core", "src", "router", "route-planner.ts"),
        `export function routeConfidenceForEvaluation() {
  return "confidence route evaluation retrospective";
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "packages", "core", "src", "memory", "write-memory.ts"),
        `export function bindLatestRouteMemory() {
  return "memory route binding retrospective";
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "vve-dashboard-language", "backend", "src", "services", "tenant-binding.service.ts"),
        `export function tenantBinding() {
  return "tenant route binding service";
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "vve-dashboard-language", "scripts", "lint-admin-route-gates.mjs"),
        `export function lintAdminRouteGates() {
  return "route confidence gates";
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "vve-dashboard-language", "shared", "html-sanitizer.ts"),
        `export function sanitizeContextHtml() {
  return "context pack sanitizer";
}
`,
        "utf8"
      );
      await indexPalace(root);

      const route = await routePalace(root, "overall evaluation retrospective score route confidence tenant binding", { routeLimit: 8 });
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(route.taskType).toBe("evaluation");
      expect(route.confidence).toBeLessThan(1);
      expect(joined).toContain("packages/core/src/router/route-planner.ts");
      expect(joined).toContain("packages/core/src/memory/write-memory.ts");
      expect(joined).not.toContain("vve-dashboard-language/backend/src/services/tenant-binding.service.ts");
      expect(joined).not.toContain("vve-dashboard-language/scripts/lint-admin-route-gates.mjs");
      expect(joined).not.toContain("vve-dashboard-language/shared/html-sanitizer.ts");
    });
  });

  it("refreshes a stale index before planning a route", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      await writeFile(
        path.join(root, "src", "services", "report.service.ts"),
        `import { formatResult } from "../utils/formatter";
export function buildReportService() {
  return formatResult("fresh report service");
}
`,
        "utf8"
      );
      await mkdir(path.join(root, "src", "utils"), { recursive: true });
      await writeFile(path.join(root, "src", "utils", "formatter.ts"), `export const formatResult = (value: string) => value;\n`, "utf8");

      const route = await routePalace(root, "implement fresh report service", { routeLimit: 8 });
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(joined).toContain("src/services/report.service.ts");
      expect(joined).toContain("src/utils/formatter.ts");
    });
  });

  it("understands Chinese optimization tasks and full-stack hints", () => {
    const task = "提升 商品规格 图片上传 前端 后端 接口 路由";
    const analysis = analyzeTask(task);

    expect(classifyTask(task)).toBe("refactor");
    expect(analysis.keywords).toEqual(expect.arrayContaining(["product", "variant", "image", "upload", "frontend", "backend", "api"]));
    expect(analysis.wingHints).toEqual(expect.arrayContaining(["product", "image", "upload", "frontend", "backend", "api"]));
  });

  it("routes large-project feedback terms toward router, classifier, packer, and indexer code", () => {
    const task = "大型全栈项目反馈：提升跨前后端依赖完整度、文件与 Symbol 路由准确度、减少 unknown 任务、控制 pack 输出长度、改善 CLI MCP 使用便利性、索引新鲜度管理";
    const analysis = analyzeTask(task);

    expect(classifyTask(task)).toBe("refactor");
    expect(analysis.keywords).toEqual(expect.arrayContaining(["frontend", "backend", "dependency", "classify", "analyze", "route", "router", "pack", "cli", "mcp", "index", "stale"]));
    expect(analysis.keywords).not.toContain("unknown");
  });

  it("removes generic optimization prose while preserving Palace subsystem intent", () => {
    const analysis = analyzeTask(
      "Optimize Vertex Palace core scanner and router: exclude nested worktrees and unrelated copies, improve index freshness, context pack quality, memory deduplication, pitfall relevance, and CLI reliability"
    );

    expect(analysis.keywords).toEqual(expect.arrayContaining(["scanner", "ignore", "router", "index", "stale", "pack", "packer", "memory", "pitfall", "cli"]));
    expect(analysis.keywords).not.toEqual(expect.arrayContaining(["optimize", "quality", "relevance", "reliability", "unrelated", "copies", "core", "repository", "product"]));
  });

  it("does not treat Build Week or plain evaluation as unrelated subsystem hints", () => {
    const analysis = analyzeTask("Build Week route evaluation through shared CLI MCP tests documentation and CI");

    expect(analysis.keywords).not.toEqual(expect.arrayContaining(["build", "frontend", "page", "component", "memory", "retrospective"]));
    expect(analysis.entities).toEqual(expect.arrayContaining(["build-week", "buildweek"]));
  });

  it("routes measurable evaluation work toward the evaluation subsystem", async () => {
    await withFixture("ts-api", async (root) => {
      const files = [
        [
          "packages/core/src/evaluation/evaluate-route.ts",
          `export function evaluateRouteCoverage() {
  return "evaluation report changed-file coverage confidence calibration token reduction";
}
`
        ],
        ["packages/cli/src/commands/evaluate.ts", `export const evaluateCommand = "CLI evaluation command";\n`],
        ["packages/mcp/src/tools/definitions.ts", `export const palaceEvaluateTool = "MCP evaluation tool";\n`],
        ["packages/shared/src/types.ts", `export type EvaluationReport = { coverage: number };\n`],
        ["packages/core/test/evaluation.test.ts", `describe("evaluation", () => it("measures coverage", () => true));\n`],
        ["packages/core/src/indexer/build-nodes.ts", `export const buildNodes = "generic index builder";\n`],
        ["packages/cli/src/commands/memory.ts", `export const memoryCommand = "unrelated memory command";\n`],
        [".github/workflows/ci.yml", `name: evaluation CI workflow\n`],
        ["BUILD_WEEK.md", `# Build Week evaluation documentation\n`]
      ] as const;
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "build evaluation report for changed-file coverage and confidence calibration through shared types, CLI, MCP, regression tests, documentation, and CI workflow",
        { routeLimit: 4 }
      );

      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(joined).toContain("packages/core/src/evaluation/evaluate-route.ts");
      expect(joined).toContain("packages/cli/src/commands/evaluate.ts");
      expect(joined).toContain("packages/mcp/src/tools/definitions.ts");
      expect(joined).toContain("packages/shared/src/types.ts");
      expect(joined).toContain("packages/core/test/evaluation.test.ts");
      expect(joined).toContain("BUILD_WEEK.md");
      expect(joined).toContain(".github/workflows/ci.yml");
      expect(joined).not.toContain("packages/core/src/indexer/build-nodes.ts");
      expect(joined).not.toContain("packages/cli/src/commands/memory.ts");
    });
  });

  it("keeps routed context diverse and avoids duplicate file and symbol entries", async () => {
    await withFixture("ts-api", async (root) => {
      const files = [
        ["packages/core/src/scanner/scan-repo.ts", "export function scanRepo() { return 'scanner ignore worktree'; }"],
        ["packages/core/src/packer/context-packer.ts", "export function packContext() { return 'context pack'; }"],
        ["packages/core/src/router/route-planner.ts", "export function routePalace() { return 'route index freshness'; }"],
        ["packages/core/src/memory/pitfall-board.ts", "export function pitfallBoard() { return 'memory pitfall deduplication'; }"],
        ["packages/cli/src/index.ts", "export function palaceCli() { return 'cli reliability'; }"]
      ] as const;
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(root, "Fix scanner worktree ignores, context pack routing, memory pitfall deduplication, index freshness, and CLI reliability", { routeLimit: 8 });
      const sourcePaths = route.route.map((step) => step.sourcePath.split(":")[0]);

      expect(sourcePaths).toContain("packages/core/src/scanner/scan-repo.ts");
      expect(sourcePaths).toContain("packages/core/src/packer/context-packer.ts");
      expect(new Set(sourcePaths).size).toBe(sourcePaths.length);
    });
  });

  it("does not let fixture services outrank router code for feedback tasks", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "packages", "core", "src", "router"), { recursive: true });
      await mkdir(path.join(root, "packages", "core", "test", "fixtures", "demo", "src", "services"), { recursive: true });
      await writeFile(
        path.join(root, "packages", "core", "src", "router", "classify-task.ts"),
        `export function classifyTask(task: string) {
  return task.includes("unknown") ? "unknown" : "refactor";
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "packages", "core", "src", "router", "route-scorer.ts"),
        `export function scoreRouteDependency(task: string) {
  return task.includes("frontend") && task.includes("backend");
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "packages", "core", "test", "fixtures", "demo", "src", "services", "token.service.ts"),
        `export function fixtureBackendService() {
  return "service";
}
`,
        "utf8"
      );
      await indexPalace(root);

      const route = await routePalace(root, "大型全栈项目反馈：提升跨前后端依赖完整度、文件与 Symbol 路由准确度、减少 unknown 任务", { routeLimit: 8 });
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(joined).toContain("packages/core/src/router/classify-task.ts");
      expect(joined).toContain("packages/core/src/router/route-scorer.ts");
      expect(joined).not.toContain("packages/core/test/fixtures/demo/src/services/token.service.ts");
    });
  });

  it("routes login refresh token bugs to auth, token, and verification context", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const route = await routePalace(root, "fix login refresh token bug");
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(route.taskType).toBe("bugfix");
      expect(joined).toMatch(/auth\.controller|token\.service|auth\.e2e/);
      expect(route.route.every((step) => step.reason.length > 0)).toBe(true);
      expect(route.route.every((step) => step.loadLevel)).toBe(true);
      expect(route.excluded.some((item) => /payment|admin/.test(item.sourcePath))).toBe(true);
      expect(route.budget.estimatedTokens).toBeLessThanOrEqual(route.budget.maxInputTokens);

      const optimizedRoute = await readFile(path.join(root, ".palace", "routes", "optimized-route.txt"), "utf8");
      const latestRoute = JSON.parse(await readFile(path.join(root, ".palace", "routes", "latest-route.json"), "utf8")) as { id: string; task: string };
      expect(optimizedRoute).toContain("fix login refresh token bug");
      expect(latestRoute.id).toBe(route.id);
      expect(latestRoute.task).toBe("fix login refresh token bug");
    });
  });

  it("does not pull unrelated verification tests into bugfix routes", async () => {
    await withFixture("ts-api", async (root) => {
      const testsDir = path.join(root, "tests");
      await mkdir(testsDir, { recursive: true });
      await writeFile(
        path.join(testsDir, "payment.e2e.test.ts"),
        `describe("payment rules", () => it("requires complete payment credentials", () => expect(true).toBe(true)));\n`,
        "utf8"
      );
      await indexPalace(root);

      const route = await routePalace(root, "fix login refresh token bug", { routeLimit: 12 });
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(joined).toMatch(/auth\.e2e/);
      expect(joined).not.toMatch(/payment\.e2e/);
    });
  });

  it("keeps frontend and backend files in mixed Chinese full-stack routes", async () => {
    await withFixture("ts-api", async (root) => {
      await mkdir(path.join(root, "frontend", "src", "pages", "products"), { recursive: true });
      await mkdir(path.join(root, "backend", "src", "controllers"), { recursive: true });
      await mkdir(path.join(root, "backend", "src", "services"), { recursive: true });
      await writeFile(
        path.join(root, "frontend", "src", "pages", "products", "variant-images.tsx"),
        `export function VariantImageUploader() {
  return <form aria-label="product variant image upload">Upload product variant image</form>;
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "backend", "src", "controllers", "product-image.controller.ts"),
        `import { saveProductVariantImage } from "../services/product-image.service";

export function uploadProductVariantImageController(file: File) {
  return saveProductVariantImage(file);
}
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "backend", "src", "services", "product-image.service.ts"),
        `export function saveProductVariantImage(file: File) {
  return { file, status: "stored" };
}
`,
        "utf8"
      );
      await indexPalace(root);

      const route = await routePalace(root, "提升 商品规格 图片上传 前端 后端 接口 路由", { routeLimit: 12 });
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(route.taskType).toBe("refactor");
      expect(joined).toContain("frontend/src/pages/products/variant-images.tsx");
      expect(joined).toContain("backend/src/controllers/product-image.controller.ts");
      expect(joined).toContain("backend/src/services/product-image.service.ts");
    });
  });
});
