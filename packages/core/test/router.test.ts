import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateRoute } from "../src/evaluation/evaluate-route";
import { indexPalace } from "../src/indexer/index-palace";
import { analyzeTask } from "../src/router/analyze-task";
import { classifyTask } from "../src/router/classify-task";
import { routePalace } from "../src/router/route-planner";
import { requestedRouteSurfaces } from "../src/router/route-scorer";
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

  it("keeps evaluation-subsystem implementation distinct from evaluating the product", () => {
    expect(classifyTask(
      "Implement generated-artifact token estimates and evaluation regression tests in the parser, indexer, and router"
    )).toBe("feature");
    expect(classifyTask(
      "Build an evaluation report for changed-file coverage and confidence calibration"
    )).toBe("evaluation");
  });

  it("distinguishes release work from publish failures and application deployment", () => {
    const analysis = analyzeTask(RELEASE_TASK);

    expect(classifyTask(RELEASE_TASK)).toBe("release");
    expect(classifyTask("发布 Vertex Palace 新版本到 npm 并建立 Git tag")).toBe("release");
    expect(classifyTask("Fix npm publish authentication failure E401")).toBe("bugfix");
    expect(classifyTask("修复 npm 发布失败 E401")).toBe("bugfix");
    expect(classifyTask("Deploy the application to production")).toBe("unknown");
    expect(classifyTask("Improve release verification script routing")).toBe("refactor");
    expect(classifyTask("优化发布验证脚本路由")).toBe("refactor");
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

  it("treats public API preservation as a guardrail instead of an API route target", () => {
    const analysis = analyzeTask("Fix currency formatting so negative zero is rendered as $0.00. Keep the public API stable.");

    expect(analysis.keywords).toEqual(expect.arrayContaining(["currency", "formatting", "negative", "zero"]));
    expect(analysis.keywords).not.toEqual(expect.arrayContaining(["api", "controller", "0", "00"]));
    expect(analysis.wingHints).not.toContain("api");
  });

  it("normalizes bug-report morphology without inventing evaluation or product-variant intent", () => {
    const zodTask = "A codec-backed discriminated union fails when encoding because discriminator values differ.";
    const requestsTask = "Fix redirect authorization handling for HTTP-to-HTTPS upgrades and stripped credentials.";

    expect(classifyTask(zodTask)).toBe("bugfix");
    expect(analyzeTask(zodTask).keywords).toEqual(expect.arrayContaining(["codec", "discriminated", "union", "encode", "discriminator", "value"]));
    expect(analyzeTask(zodTask).wingHints).not.toContain("variant");
    expect(analyzeTask(requestsTask).keywords).toEqual(expect.arrayContaining(["redirect", "auth", "upgrade", "strip", "credential"]));
    expect(analyzeTask(requestsTask).keywords).not.toEqual(expect.arrayContaining(["evaluation", "evaluate", "confidence", "grade"]));
  });

  it("routes a Python redirect-auth bug from focused tests to the complete implementation method", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "src/requests/sessions.py",
          `class SessionRedirectMixin:
    def should_strip_auth(self, old_url: str, new_url: str) -> bool:
        if old_url == new_url:
            return False
        if old_url.startswith("https") and new_url.startswith("http:"):
            return True
        return old_url != new_url
`
        ],
        [
          "tests/test_requests.py",
          `def test_should_strip_auth_default_port():
    assert True

def test_should_strip_auth_http_downgrade():
    assert True
`
        ],
        ["tests/test_utils.py", "def test_default_credentials():\n    assert True\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Fix redirect authorization handling so credentials are preserved for same-host default-port redirects and HTTP-to-HTTPS upgrades, but stripped on host, downgrade, or nonstandard port changes. Update the focused regression tests.",
        { routeLimit: 6 }
      );
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(route.taskType).toBe("bugfix");
      expect(joined).toContain("src/requests/sessions.py");
      expect(joined).toContain("tests/test_requests.py");
      expect(route.route.find((step) => step.sourcePath.startsWith("src/requests/sessions.py"))?.sourcePath).toMatch(/:2-7$/);
      expect(route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""))).toEqual([
        "src/requests/sessions.py",
        "tests/test_requests.py"
      ]);
      expect(route.excluded.map((item) => item.sourcePath)).not.toContain("src/requests");
    });
  });

  it("routes a codec-backed discriminated-union bug to v4 core implementation and tests", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "packages/zod/src/v4/core/schemas.ts",
          `export const $ZodCodec = core.$constructor("$ZodCodec", () => true);
export const $ZodDiscriminatedUnion = core.$constructor("$ZodDiscriminatedUnion", (inst, def) => {
  inst.parse = (payload, ctx) => ctx.direction === "backward" ? encode(payload) : decode(payload);
});
`
        ],
        [
          "packages/zod/src/v3/types.ts",
          `export class ZodDiscriminatedUnion {
  _parse(input: unknown) {
    const discriminator = "type";
    const value = input;
    const output = value;
    return { discriminator, output };
  }

  static create(discriminator: string, options: unknown[]) {
    return { discriminator, options };
  }
}
`
        ],
        ["packages/zod/src/v4/classic/schemas.ts", `export function discriminatedUnion() { return "v4 wrapper"; }\n`],
        ["packages/zod/src/v4/classic/tests/discriminated-unions.test.ts", `import { z } from "zod/v4";\ntest("encode with codec discriminator", () => z);\n`],
        ["packages/zod/src/v3/tests/discriminated-unions.test.ts", `import { z } from "zod/v3";\ntest("legacy discriminator", () => z);\n`],
        ["packages/bench/discriminated-union.ts", `export const discriminatedUnionBenchmark = () => "benchmark";\n`]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "A codec-backed discriminated union decodes correctly but fails when encoding because input and output discriminator values differ. Preserve fast decoding while allowing backward encoding to select the right option, and update the focused regression tests.",
        { routeLimit: 6 }
      );
      const joined = route.route.map((step) => step.sourcePath).join("\n");

      expect(route.taskType).toBe("bugfix");
      expect(joined).toContain("packages/zod/src/v4/core/schemas.ts");
      expect(joined).toContain("packages/zod/src/v4/classic/tests/discriminated-unions.test.ts");
      expect(joined).not.toContain("packages/zod/src/v3/types.ts");
      expect(joined).not.toContain("packages/bench/discriminated-union.ts");
      expect(route.route.find((step) => step.sourcePath.startsWith("packages/zod/src/v4/core/schemas.ts"))?.tier).toBe("primary");
      expect(route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""))).toEqual([
        "packages/zod/src/v4/core/schemas.ts",
        "packages/zod/src/v4/classic/tests/discriminated-unions.test.ts"
      ]);
      expect(route.excluded.map((item) => item.sourcePath)).not.toContain("packages");
    });
  });

  it("keeps declaration-only type fixes inside declarations, type tests, and package metadata", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["index.js", "export const limitFunction = (function_, options) => (...arguments_) => function_(...arguments_);\n"],
        ["index.d.ts", "export function limitFunction<Arguments extends unknown[], ReturnType>(function_: (...arguments_: Arguments) => PromiseLike<ReturnType>, options: {concurrency: number}): (...arguments_: Arguments) => Promise<ReturnType>;\n"],
        ["index.test-d.ts", "import {expectType} from 'tsd';\nimport {limitFunction} from './index.js';\nexpectType<Promise<number>>(limitFunction(async (value: number) => value, {concurrency: 1})(1));\n"],
        ["test.js", "test('limitFunction runtime behavior', async t => t.is(await limitFunction(async () => 1)(), 1));\n"],
        ["benchmark.js", "export const benchmark = () => limitFunction(async () => 1, {concurrency: 1});\n"],
        ["scripts/benchmarker.js", "export const benchmarker = () => 'runtime benchmark';\n"],
        ["package.json", JSON.stringify({ name: "p-limit", type: "module", exports: { types: "./index.d.ts", default: "./index.js" }, scripts: { test: "xo && ava && tsd" } })]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Fix the overly permissive public limitFunction type. It currently accepts synchronous functions even though limiting synchronous execution has no effect. Restrict it to asynchronous functions, preserve inferred argument and return types, and add focused compile-time regression coverage using the repository's existing type-test setup.",
        { routeLimit: 6, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(route.taskType).toBe("bugfix");
      expect(filesOnly).toEqual(["index.d.ts", "index.test-d.ts", "package.json"]);
      expect(route.route.find((step) => step.sourcePath.startsWith("index.d.ts"))?.tier).toBe("primary");
      expect(route.route.find((step) => step.sourcePath === "index.test-d.ts")?.tier).toBe("support");
      expect(filesOnly).not.toContain("index.js");
      expect(filesOnly).not.toContain("test.js");
      expect(filesOnly).not.toContain("benchmark.js");
      expect(filesOnly).not.toContain("scripts/benchmarker.js");
      expect(route.excluded.filter((item) => filesOnly.includes(item.sourcePath))).toEqual([]);
    });
  });

  it("keeps a focused regression test when release verification scripts compete for a small bugfix route", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["packages/core/src/router/analyze-task.ts", "export function analyzeTask() { return ['evidence', 'route']; }\n"],
        ["packages/core/src/router/classify-task.ts", "export function classifyTask() { return 'bugfix'; }\n"],
        ["packages/core/src/router/route-planner.ts", "export function routePalace() { return ['implementation', 'verification']; }\n"],
        ["packages/core/test/router.test.ts", "describe('release-candidate evidence routing', () => it('keeps the regression companion', () => true));\n"],
        ["packages/core/test/unrelated.test.ts", "describe('payment checkout', () => it('stays unrelated', () => true));\n"],
        ["scripts/verify-release-candidate.cjs", "module.exports = () => 'clean tarball release candidate';\n"],
        ["scripts/verify-real-repositories.cjs", "module.exports = () => 'real repository evidence';\n"],
        ["scripts/verify-release-classification.cjs", "module.exports = () => 'verify release candidate evidence classification';\n"],
        ["scripts/verify-evidence-router.cjs", "module.exports = () => 'verify focused evidence router regression';\n"],
        ["scripts/smoke-npm-release.cjs", "module.exports = () => 'smoke actual npm release intent';\n"],
        ["scripts/benchmark-release-route.cjs", "module.exports = () => 'benchmark release candidate route evidence';\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Fix release-candidate evidence classification and update the focused router regression tests while preserving actual npm release intent",
        { routeLimit: 4, budget: 6000 }
      );
      const filesOnly = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(route.taskType).toBe("bugfix");
      expect(filesOnly).toContain("packages/core/src/router/analyze-task.ts");
      expect(filesOnly).toContain("packages/core/test/router.test.ts");
      expect(filesOnly).not.toContain("packages/core/test/unrelated.test.ts");
      expect(route.route).toHaveLength(4);
    });
  });

  it("routes a coordinated refactor through sibling modules, focused tests, and its generated MCP artifact", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["packages/core/package.json", JSON.stringify({ name: "@vertex-palace/core", main: "./dist/index.js" })],
        [
          "packages/core/src/index.ts",
          "export * from './router/analyze-task';\nexport * from './router/classify-task';\n"
        ],
        [
          "packages/core/src/router/publication-intent.ts",
          "export function publicationIntent() { return 'publish'; }\n"
        ],
        [
          "packages/core/src/router/analyze-task.ts",
          "import { publicationIntent } from './publication-intent';\nexport const analyzeTask = () => publicationIntent();\n"
        ],
        [
          "packages/core/src/router/classify-task.ts",
          "import { publicationIntent } from './publication-intent';\nexport const classifyTask = () => publicationIntent();\n"
        ],
        [
          "packages/core/test/router.test.ts",
          "import { analyzeTask } from '../src/router/analyze-task';\ntest('publication intent routing', () => analyzeTask());\n"
        ],
        [
          "packages/mcp/src/server.ts",
          "import { analyzeTask } from '@vertex-palace/core';\nexport const startServer = () => analyzeTask();\n"
        ],
        [
          "tsup.plugin-mcp.config.ts",
          "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"
        ],
        ["plugins/vertex-palace/mcp/server.cjs", "module.exports = { generated: true };\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Refactor publication-intent routing across analyze-task and classify-task, update the focused router tests, and rebuild the generated MCP bundle",
        { routeLimit: 8, budget: 6000 }
      );
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(route.taskType).toBe("refactor");
      expect(routed).toEqual(expect.arrayContaining([
        "packages/core/src/router/analyze-task.ts",
        "packages/core/src/router/classify-task.ts",
        "packages/core/src/router/publication-intent.ts",
        "packages/core/test/router.test.ts",
        "plugins/vertex-palace/mcp/server.cjs"
      ]));
      expect(route.route.some((step) => step.reason.includes("changed_with"))).toBe(true);
      expect(route.route.find((step) => step.sourcePath === "plugins/vertex-palace/mcp/server.cjs")?.loadLevel).toBe("summary");
    });
  });

  it("allocates a bounded route across coordinated implementation, verification, docs, config, and generated artifacts", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/mode-selector.ts",
        "packages/core/src/packer/context-packer.ts",
        "packages/shared/src/types.ts",
        "packages/core/test/mode-selector.test.ts",
        "packages/core/test/context.test.ts",
        "packages/core/vitest.config.ts",
        "scripts/verify-release-candidate.cjs",
        "scripts/smoke-mcp.cjs",
        "docs/research/ADVISORY_SAFETY_CONTRACT_0_4_ALPHA.md",
        "docs/zh-CN/ADVISORY_SAFETY_CONTRACT_0_4_ALPHA.md",
        "plugins/vertex-palace/mcp/server.cjs"
      ];
      const sources = new Map<string, string>([
        ["packages/core/src/router/mode-selector.ts", "export function selectAdvisoryMode() { return { evidenceStatus: 'insufficient', interventionPolicy: 'advisory' }; }\n"],
        ["packages/core/src/packer/context-packer.ts", "export function packAdvisoryBoundaries() { return { stopEnforced: false }; }\n"],
        ["packages/shared/src/types.ts", "export type AdvisorySafetyContract = { evidenceStatus: 'sufficient' | 'insufficient'; interventionPolicy: 'advisory' | 'bounded' };\n"],
        ["packages/core/test/mode-selector.test.ts", "describe('advisory mode selector', () => it('requires sufficient evidence for bounded intervention', () => true));\n"],
        ["packages/core/test/context.test.ts", "describe('advisory context packer', () => it('does not enforce an early stop', () => true));\n"],
        ["packages/core/vitest.config.ts", "export default { test: { pool: 'forks', fileParallelism: false } };\n"],
        ["scripts/verify-release-candidate.cjs", "module.exports = () => 'verify advisory safety contract in a clean tarball';\n"],
        ["scripts/smoke-mcp.cjs", "module.exports = () => 'smoke generated MCP advisory payload';\n"],
        ["docs/research/ADVISORY_SAFETY_CONTRACT_0_4_ALPHA.md", "# Advisory Safety Contract 0.4 Alpha\n\nEvidence status and intervention authority remain separate.\n"],
        ["docs/zh-CN/ADVISORY_SAFETY_CONTRACT_0_4_ALPHA.md", "# Advisory Safety Contract 0.4 Alpha - Simplified Chinese\n\nBilingual evidence status and intervention authority.\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'advisory payload';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        ["plugins/vertex-palace/mcp/server.cjs", "module.exports = { generated: true, interventionPolicy: 'advisory' };\n"],
        ["packages/core/test/router.test.ts", "describe('unrelated route scoring', () => it('keeps old behavior', () => true));\n"],
        ["packages/core/vitest.integration.config.ts", "export default { test: { include: ['integration/**'] } };\n"],
        ["scripts/verify-publish-registry.cjs", "module.exports = () => 'verify npm registry publication';\n"],
        ["scripts/smoke-cli.cjs", "module.exports = () => 'smoke unrelated CLI';\n"],
        ["docs/research/ADAPTIVE_MEMORY_FIX_0_3_0.md", "# Historic Adaptive Memory Fix\n\nOld release verification evidence.\n"],
        ["docs/zh-CN/ADAPTIVE_MEMORY_FIX_0_3_0.md", "# Historic Adaptive Memory Fix - Simplified Chinese\n\nOld bilingual release evidence.\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Improve advisory-safety routing across mode selection and context packing; update the shared contract, focused tests, bilingual research docs, release verification scripts, test configuration, and generated MCP artifact.";
      const analysis = analyzeTask(task);
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 12,
        budget: 6000,
        maxDrawers: 4
      });

      if (process.env.MULTI_SURFACE_ROUTING_REPORT === "1") {
        process.stdout.write(`${JSON.stringify({
          name: "advisory-multi-surface-0.4-alpha",
          taskType: evaluation.taskType,
          routeFiles: evaluation.route.files,
          changedFiles,
          changedFileCoverage: evaluation.coverage.changedFileCoverage,
          routeFocus: evaluation.coverage.routeFocus,
          confidence: evaluation.route.confidence,
          calibration: evaluation.calibration
        })}\n`);
      }

      expect(classifyTask(task)).toBe("refactor");
      expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining([
        "implementation",
        "shared",
        "test",
        "config",
        "docs",
        "mcp"
      ]));
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(12);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.9);
    });
  });

  it("keeps complete real-shaped multi-surface recall without filling the route with generic siblings", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/publication-intent.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/test/router.test.ts",
        "plugins/vertex-palace/mcp/server.cjs",
        "docs/research/MULTI_SURFACE_ROUTING_0_4_ALPHA.md",
        "docs/zh-CN/MULTI_SURFACE_ROUTING_0_4_ALPHA.md",
        "docs/research/evidence/advisory-multi-surface-routing-0.4-alpha.json"
      ];
      const sources = new Map<string, string>([
        ["packages/core/src/router/publication-intent.ts", "export function analyzePublicationIntent() { return { releaseArtifactReference: true }; }\n"],
        ["packages/core/src/router/route-planner.ts", "export function planMultiSurfaceRoute() { return ['implementation', 'test', 'docs', 'evidence', 'mcp']; }\n"],
        ["packages/core/test/router.test.ts", "describe('multi-surface route precision', () => it('preserves complete recall with a focused route', () => true));\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'multi-surface route precision';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        ["plugins/vertex-palace/mcp/server.cjs", "module.exports = { generated: true, routePrecision: '0.4-alpha' };\n"],
        ["docs/research/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# Multi-Surface Routing 0.4 Alpha\n\nCurrent role-aware routing research and release-verification artifact intent.\n"],
        ["docs/zh-CN/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# Multi-Surface Routing 0.4 Alpha - Simplified Chinese\n\nCurrent bilingual role-aware routing research.\n"],
        ["docs/research/evidence/advisory-multi-surface-routing-0.4-alpha.json", JSON.stringify({ schemaVersion: 1, routeFocus: 0.75, changedFileCoverage: 1 })],
        ["docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md", "# Historic Multi-Surface Evidence Routing\n\nOlder dense report about implementation, tests, bilingual docs, machine-readable evidence, generated MCP bundles, precision, and recall.\n"],
        ["docs/research/evidence/multi-surface-evidence-routing-0.3.0.json", JSON.stringify({ schemaVersion: 1, status: "historic", routeFocus: 0.58 })],
        ["packages/core/src/router/route-scorer.ts", "export function scoreRouteConfidence() { return 0.35; }\n"],
        ["packages/core/src/router/analyze-task.ts", "export function analyzeRoutingTask() { return ['precision', 'recall', 'confidence']; }\n"],
        ["packages/core/src/packer/context-packer.ts", "export function packRoutingContext() { return { routeLimit: 12 }; }\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Improve multi-surface routing and release-verification artifact intent; add role-aware implementation and focused regression tests, bilingual research records, record machine-readable evidence, and rebuild the generated MCP bundle.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 12,
        budget: 6000,
        maxDrawers: 4
      });

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(9);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.route.confidence).toBeGreaterThan(0.35);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("routes simultaneous planner and scorer work with its current bilingual precision evidence", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/route-planner.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/test/router.test.ts",
        "plugins/vertex-palace/mcp/server.cjs",
        "docs/research/ROUTE_PRECISION_0_4_ALPHA.md",
        "docs/zh-CN/ROUTE_PRECISION_0_4_ALPHA.md",
        "docs/research/evidence/route-precision-0.4-alpha.json"
      ];
      const sources = new Map<string, string>([
        ["packages/core/src/router/route-planner.ts", "export function planRoleRepresentatives() { return { routeLimit: 'ceiling' }; }\n"],
        ["packages/core/src/router/route-scorer.ts", "export function scoreBroadTaskConfidence() { return 'dynamic'; }\n"],
        ["packages/core/test/router.test.ts", "describe('route precision', () => it('covers planner and scorer', () => true));\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'route precision';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        ["plugins/vertex-palace/mcp/server.cjs", "module.exports = { generated: true, routePrecision: '0.4-alpha' };\n"],
        ["docs/research/ROUTE_PRECISION_0_4_ALPHA.md", "# Route Precision 0.4 Alpha\n\nCurrent planner, scorer, confidence, and route-focus research.\n"],
        ["docs/zh-CN/ROUTE_PRECISION_0_4_ALPHA.md", "# Route Precision 0.4 Alpha - Simplified Chinese\n\nCurrent bilingual route-precision research.\n"],
        ["docs/research/evidence/route-precision-0.4-alpha.json", JSON.stringify({ schemaVersion: 1, routeFocus: 0.78, routeConfidence: 0.76 })],
        ["docs/research/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# Multi-Surface Routing 0.4 Alpha\n\nEarlier multi-surface route planning report.\n"],
        ["docs/zh-CN/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# Multi-Surface Routing 0.4 Alpha - Simplified Chinese\n\nEarlier bilingual report.\n"],
        ["docs/research/evidence/advisory-multi-surface-routing-0.4-alpha.json", JSON.stringify({ schemaVersion: 1, routeFocus: 0.58 })],
        ["packages/core/src/router/analyze-task.ts", "export function analyzeTaskWords() { return ['broad-task', 'json']; }\n"],
        ["packages/core/src/indexer/index-palace.ts", "export function indexEvidenceDirectoryJson() { return true; }\n"],
        ["packages/core/src/packer/context-packer.ts", "export function packRouteContext() { return true; }\n"],
        ["packages/core/src/utils/stable-json.ts", "export function stableJson() { return '{}'; }\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Improve 0.4 Alpha route precision: make multi-surface routeLimit a ceiling, prioritize role representatives, recognize evidence-directory JSON, calibrate broad-task confidence dynamically, add regression tests and bilingual route-precision research evidence, and rebuild the generated MCP bundle.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 12,
        budget: 6000,
        maxDrawers: 4
      });

      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(9);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("routes a frozen cross-repository replication to its complete artifact family", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "scripts/verify-route-precision-cross-repositories.cjs",
        "docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
        "docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
        "docs/research/evidence/cross-repository-route-precision-0.4-alpha.json",
        "docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md"
      ];
      const sources = new Map<string, string>([
        ["scripts/verify-route-precision-cross-repositories.cjs", "export function verifyCrossRepositoryRoutePrecision() { return ['zod', 'requests', 'p-limit']; }\n"],
        ["docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md", "# Cross-Repository Route Precision Protocol 0.4 Alpha\n\nFreeze the replication gates before the first observation.\n"],
        ["docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md", "# 0.4 Alpha 跨仓库路由精度协议\n\n首次观察前冻结复制门槛。\n"],
        ["docs/research/evidence/cross-repository-route-precision-0.4-alpha.json", JSON.stringify({ schemaVersion: 1, status: "passed", repositories: 3 })],
        ["docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md", "# Cross-Repository Route Precision Result 0.4 Alpha\n\nReport the first replication observation.\n"],
        ["docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md", "# 0.4 Alpha 跨仓库路由精度结果\n\n记录首次复制结果。\n"],
        ["packages/core/src/router/route-scorer.ts", "export function scoreGenericRoute() { return 0.72; }\n"],
        ["tsconfig.base.json", JSON.stringify({ compilerOptions: { strict: true } })],
        ["docs/research/MEMORY_PREFLIGHT_0_4_ALPHA_RESULT.md", "# Memory Preflight Result\n\nAn older first evidence report.\n"],
        ["docs/zh-CN/MEMORY_PREFLIGHT_0_4_ALPHA_RESULT.md", "# 记忆预检旧结果\n\n旧的首次证据报告。\n"],
        ["docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md", "# Historic Multi-Surface Evidence Routing\n\nOld route evidence research.\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const tasks = [
        "Freeze and execute a cross-repository route precision replication across Zod, Requests, and p-limit; preserve the first JSON evidence and write English and Simplified Chinese result reports",
        "冻结并执行 Zod、Requests、p-limit 跨仓库路由精度复现实验，保留首次 JSON 证据并编写英文与简体中文结果报告"
      ];
      for (const task of tasks) {
        const analysis = analyzeTask(task);
        const evaluation = await evaluateRoute(root, task, {
          changedFiles,
          routeLimit: 9,
          budget: 6000,
          maxDrawers: 4
        });

        expect(classifyTask(task)).toBe("evaluation");
        expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining(["test", "docs", "evidence"]));
        expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
        expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
          "docs/research/MEMORY_PREFLIGHT_0_4_ALPHA_RESULT.md",
          "docs/zh-CN/MEMORY_PREFLIGHT_0_4_ALPHA_RESULT.md",
          "docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md"
        ]));
        expect(evaluation.route.fileCount).toBeLessThanOrEqual(8);
        expect(evaluation.coverage.changedFileCoverage).toBe(1);
        expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
        expect(evaluation.calibration.status).not.toBe("overconfident");
      }
    });
  });

  it("keeps a newly named recursive artifact family ahead of an older scope-matching family", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "scripts/verify-route-precision-after-ember-ledger.cjs",
        "docs/research/ROUTE_PRECISION_AFTER_EMBER_LEDGER_PROTOCOL_0_4_ALPHA.md",
        "docs/zh-CN/ROUTE_PRECISION_AFTER_EMBER_LEDGER_PROTOCOL_0_4_ALPHA.md",
        "docs/research/evidence/route-precision-after-ember-ledger-0.4-alpha.json",
        "docs/research/ROUTE_PRECISION_AFTER_EMBER_LEDGER_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/ROUTE_PRECISION_AFTER_EMBER_LEDGER_RESULT_0_4_ALPHA.md"
      ];
      const oldFamily = [
        "scripts/verify-cross-platform-route-precision.cjs",
        "docs/research/CROSS_PLATFORM_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
        "docs/zh-CN/CROSS_PLATFORM_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md",
        "docs/research/evidence/cross-platform-route-precision-0.4-alpha.json",
        "docs/research/CROSS_PLATFORM_ROUTE_PRECISION_RESULT_0_4_ALPHA.md",
        "docs/zh-CN/CROSS_PLATFORM_ROUTE_PRECISION_RESULT_0_4_ALPHA.md"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function verifyEmberLedgerRoutePrecision() { return 'recursive family'; }\n"],
        [changedFiles[1], "# Route Precision After Ember Ledger Protocol\n\nFreeze the recursive family before observation.\n"],
        [changedFiles[2], "# Route Precision After Ember Ledger Protocol - Simplified Chinese\n\nFrozen translation.\n"],
        [changedFiles[3], JSON.stringify({ schemaVersion: 1, family: "ember-ledger", status: "pending" })],
        [changedFiles[4], "# Route Precision After Ember Ledger Result\n\nReport the recursive observation.\n"],
        [changedFiles[5], "# Route Precision After Ember Ledger Result - Simplified Chinese\n\nTranslated result.\n"],
        [oldFamily[0], "export function verifyCrossPlatformRoutePrecision() { return 'older family'; }\n"],
        [oldFamily[1], "# Cross Platform Route Precision Protocol\n\nFreeze cross-platform routing replication evidence.\n"],
        [oldFamily[2], "# Cross Platform Route Precision Protocol - Simplified Chinese\n\nOlder translated protocol.\n"],
        [oldFamily[3], JSON.stringify({ schemaVersion: 1, family: "cross-platform", status: "passed" })],
        [oldFamily[4], "# Cross Platform Route Precision Result\n\nDense cross-platform replication result and evidence report.\n"],
        [oldFamily[5], "# Cross Platform Route Precision Result - Simplified Chinese\n\nOlder translated result.\n"],
        ["packages/core/src/router/route-scorer.ts", "export function scorePostEmberLedgerCrossPlatformConfidence() { return 0.91; }\n"],
        ["tsconfig.base.json", JSON.stringify({ compilerOptions: { strict: true } })]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Freeze and execute the post-ember-ledger cross-platform routing regression; preserve the first JSON evidence and write English and Simplified Chinese protocol and result reports.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(classifyTask(task)).toBe("evaluation");
      expect(requestedRouteSurfaces(analyzeTask(task))).not.toContain("implementation");
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining(oldFamily));
      expect(evaluation.route.files).not.toContain("packages/core/src/router/route-scorer.ts");
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(7);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.calibration.status).not.toBe("overconfident");

      const unresolvedTask = "Freeze and execute the post-cobalt-harbor cross-platform routing regression; preserve the first JSON evidence and write English and Simplified Chinese protocol and result reports.";
      const unresolved = await evaluateRoute(root, unresolvedTask, {
        changedFiles: [
          "scripts/verify-route-precision-after-cobalt-harbor.cjs",
          "docs/research/ROUTE_PRECISION_AFTER_COBALT_HARBOR_PROTOCOL_0_4_ALPHA.md",
          "docs/zh-CN/ROUTE_PRECISION_AFTER_COBALT_HARBOR_PROTOCOL_0_4_ALPHA.md",
          "docs/research/evidence/route-precision-after-cobalt-harbor-0.4-alpha.json",
          "docs/research/ROUTE_PRECISION_AFTER_COBALT_HARBOR_RESULT_0_4_ALPHA.md",
          "docs/zh-CN/ROUTE_PRECISION_AFTER_COBALT_HARBOR_RESULT_0_4_ALPHA.md"
        ],
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });
      expect(unresolved.coverage.changedFileCoverage).toBe(0);
      expect(unresolved.route.confidence).toBeLessThanOrEqual(0.15);
      expect(unresolved.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps both implementation concerns, focused tests, and generated MCP bundle in a compound bugfix", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/analyze-task.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/src/storage/status.ts",
        "packages/core/test/router.test.ts",
        "packages/core/test/context.test.ts",
        "plugins/vertex-palace/mcp/server.cjs"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function analyzeArtifactFamilyTask() { return ['family', 'freshness']; }\n"],
        [changedFiles[1], "export function planArtifactFamilyRoles() { return ['protocol', 'result', 'evidence']; }\n"],
        [changedFiles[2], "export function scoreArtifactFamilyConfidence() { return 'calibrated'; }\n"],
        [changedFiles[3], "export function appendGeneratedArtifactHashes() { return { stale: false }; }\n"],
        [changedFiles[4], "describe('artifact family route planning and confidence', () => it('keeps roles', () => true));\n"],
        [changedFiles[5], "describe('generated artifact index freshness', () => it('stays fresh', () => true));\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'artifact family freshness';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        [changedFiles[6], "module.exports = { generated: true, family: 'artifact-routing' };\n"],
        ["packages/core/src/indexer/index-palace.ts", "export function indexGenericRepository() { return true; }\n"],
        ["packages/core/src/packer/context-packer.ts", "export function packGenericContext() { return true; }\n"],
        ["packages/core/test/release-routing.test.ts", "describe('release routing', () => it('publishes packages', () => true));\n"],
        ["packages/core/test/route-expander.test.ts", "describe('route expansion', () => it('expands graph neighbors', () => true));\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Fix generated-artifact index freshness in storage status and generalize artifact-family task analysis, route planning, and confidence scoring while preserving mixed feature release coverage; add focused router and context regression tests and rebuild the generated MCP bundle.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(classifyTask(task)).toBe("bugfix");
      expect(requestedRouteSurfaces(analyzeTask(task))).not.toEqual(expect.arrayContaining(["package", "docs"]));
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
        "packages/mcp/src/server.ts",
        "packages/core/src/indexer/index-palace.ts",
        "packages/core/src/packer/context-packer.ts",
        "packages/core/test/release-routing.test.ts",
        "packages/core/test/route-expander.test.ts"
      ]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(7);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.75);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps release-vocabulary classification work ahead of adjacent analysis and evaluation modules", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "packages/core/src/router/classify-task.ts",
        "packages/core/src/router/publication-intent.ts",
        "packages/core/src/router/route-planner.ts",
        "packages/core/src/router/route-scorer.ts",
        "packages/core/test/router.test.ts",
        "packages/core/test/release-routing.test.ts",
        "plugins/vertex-palace/mcp/server.cjs"
      ];
      const sources = new Map<string, string>([
        [changedFiles[0], "export function classifyReleaseVocabularyAction() { return 'bugfix'; }\n"],
        [changedFiles[1], "export function analyzePublicationIntent() { return { releaseIntent: false }; }\n"],
        [changedFiles[2], "export function planRecursiveArtifactFamilyRoute() { return ['implementation', 'test', 'mcp']; }\n"],
        [changedFiles[3], "export function scoreRecursiveArtifactFamilyConfidence() { return 0.8; }\n"],
        [changedFiles[4], "describe('recursive artifact-family router', () => it('keeps classification concerns', () => true));\n"],
        [changedFiles[5], "describe('release vocabulary routing', () => it('preserves action intent', () => true));\n"],
        [changedFiles[6], "module.exports = { generated: true, releaseVocabulary: true };\n"],
        ["packages/mcp/src/server.ts", "export const startMcpServer = () => 'release vocabulary routing';\n"],
        ["tsup.plugin-mcp.config.ts", "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/mcp/src/server.ts' }, outDir: 'plugins/vertex-palace/mcp', outExtension: () => ({ js: '.cjs' }) });\n"],
        ["packages/core/src/router/analyze-task.ts", "export function analyzeArtifactFamilyTask() { return ['route', 'evidence']; }\n"],
        ["packages/core/src/evaluation/evaluate-route.ts", "export function evaluateArtifactFamilyRoute() { return { coverage: 1 }; }\n"],
        ["packages/core/test/context.test.ts", "describe('context evaluation', () => it('packs a route', () => true));\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Fix release-vocabulary action classification and publication intent so a mixed feature release mention does not override recursive artifact-family route planning and confidence scoring; add focused router and release-routing regressions and rebuild the generated MCP bundle.";
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        routeLimit: 9,
        budget: 6000,
        maxDrawers: 4
      });

      expect(classifyTask(task)).toBe("bugfix");
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
        "packages/core/src/router/analyze-task.ts",
        "packages/core/src/evaluation/evaluate-route.ts",
        "packages/core/test/context.test.ts"
      ]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(7);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBe(1);
      expect(evaluation.calibration.status).not.toBe("overconfident");
    });
  });

  it("keeps the current bilingual document pair when an older report has denser matching prose", async () => {
    await withFixture("ts-api", async (root) => {
      const sources = new Map<string, string>([
        ["docs/research/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# Multi-Surface Routing 0.4 Alpha\n\nCurrent advisory-safety routing research.\n"],
        ["docs/zh-CN/MULTI_SURFACE_ROUTING_0_4_ALPHA.md", "# 0.4 Alpha Multi-Surface Routing\n\nCurrent bilingual advisory-safety research.\n"],
        ["docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md", "# Multi-Surface Evidence Routing 0.3.0\n\nHistoric bilingual multi-surface routing research with advisory-safety machine evidence behavior, implementation details, focused regression tests, and generated MCP verification.\n"],
        ["docs/zh-CN/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md", "# 0.3.0 Multi-Surface Evidence Routing\n\nHistoric bilingual advisory-safety machine evidence and routing research.\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Improve bilingual multi-surface routing research docs while preserving advisory-safety machine evidence behavior.";
      const route = await routePalace(root, task, { routeLimit: 4, budget: 6000 });
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(classifyTask(task)).toBe("refactor");
      expect(routed).toEqual(expect.arrayContaining([
        "docs/research/MULTI_SURFACE_ROUTING_0_4_ALPHA.md",
        "docs/zh-CN/MULTI_SURFACE_ROUTING_0_4_ALPHA.md"
      ]));
    });
  });

  it("calibrates broad-task confidence from surface coverage and route focus", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);

      const route = await routePalace(
        root,
        "Improve Vertex Palace 0.3.0 focused bugfix routing precision, preserve recall, calibrate broad-task confidence, strengthen strict real-repository validation, and update generated MCP distribution",
        { routeLimit: 10 }
      );

      expect(route.confidence).toBeGreaterThan(0.35);
      expect(route.confidence).toBeLessThan(1);
    });
  });

  it("does not turn package parser or evidence-router implementation terms into artifact surfaces", () => {
    const analysis = analyzeTask(
      "Add structured package.json workspace metadata and machine-readable evidence routing with parser regressions"
    );

    expect(requestedRouteSurfaces(analysis)).not.toContain("package");
    expect(requestedRouteSurfaces(analysis)).not.toContain("evidence");
    expect(requestedRouteSurfaces(analyzeTask(
      "Preserve the current machine-readable evaluation evidence in the control-first report"
    ))).toContain("evidence");
  });

  it("routes bilingual evidence synchronization across its plan, generator, test, and documentation surfaces", async () => {
    await withFixture("ts-api", async (root) => {
      const changedFiles = [
        "src/commands/study.mjs",
        "test/study.test.mjs",
        "results/control-first-v3/plan.json",
        "docs/research/CONTROL_FIRST_V3_PREFLIGHT.md",
        "docs/research/PROTOCOL_V3.md",
        "docs/zh-CN/PROTOCOL_V3.md",
        "README.md",
        "docs/zh-CN/README.md"
      ];
      const sources = new Map<string, string>([
        ["src/commands/study.mjs", "export function buildControlFirstPlan() { return { frozen: false, sourceCommit: 'candidate' }; }\n"],
        ["test/study.test.mjs", "test('control-first source commit and frozen plan', () => true);\n"],
        ["results/control-first-v3/plan.json", JSON.stringify({ frozen: false, sourceCommit: "candidate", trials: 16 })],
        ["docs/research/CONTROL_FIRST_V3_PREFLIGHT.md", "# Control-First v3 Preflight\n\nProduct evidence commit and context ceiling gate.\n"],
        ["docs/research/PROTOCOL_V3.md", "# Protocol v3\n\nThe plan remains frozen false with zero outcomes.\n"],
        ["docs/zh-CN/PROTOCOL_V3.md", "# v3 协议\n\n计划保持 frozen false，公开结果为零。\n"],
        ["README.md", "# Benchmark\n\nControl-first product evidence and protocol summary.\n"],
        ["docs/zh-CN/README.md", "# 简体中文说明\n\nControl-first 产品证据与协议摘要。\n"],
        ["docs/research/PROTOCOL_V2.md", "# Protocol v2\n\nSuperseded control-first protocol.\n"],
        ["docs/research/PROTOCOL_V2_2.md", "# Protocol v2.2\n\nSuperseded memory protocol.\n"],
        ["docs/research/evidence/guarded-stale-memory-v2.2-trial01.json", JSON.stringify({ trial: 1, status: "historic" })],
        ["docs/research/evidence/guarded-stale-memory-v2.2-trial02.json", JSON.stringify({ trial: 2, status: "historic" })],
        [
          "docs/research/evidence/vertex-palace-0.3.0-sync-evaluation.json",
          JSON.stringify({ schemaVersion: 1, claimBoundary: "pin-sync route evaluation only", sourceCommit: "candidate" })
        ],
        ["results/adaptive-pilot-v2.2/README.md", "# Historic adaptive pilot\n\nSuperseded result notes.\n"],
        [".github/workflows/ci.yml", "name: CI\non: [push]\njobs: { test: { runs-on: ubuntu-latest } }\n"],
        ["analysis/paired-analysis.mjs", "export function reportedTokenPrecisionAnalysis() { return 'paired benchmark precision'; }\n"],
        ["analysis/power-analysis.mjs", "export function benchmarkPower() { return 'analysis only'; }\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "同步 Vertex Palace v0.3 最终源码与证据提交，更新严格真实仓库精度和高密度记忆预算验证，并保留 control-first 冻结边界与简体中文说明";
      const analysis = analyzeTask(task);
      const evaluation = await evaluateRoute(root, task, {
        changedFiles,
        budget: 5000,
        routeLimit: 6,
        maxDrawers: 4
      });

      expect(classifyTask(task)).toBe("evaluation");
      expect(classifyTask("修正多表面证据同步路由并排除旧协议")).toBe("bugfix");
      expect(analysis.keywords).toEqual(expect.arrayContaining([
        "implementation",
        "evidence",
        "precision",
        "memory",
        "context",
        "token",
        "protocol",
        "plan",
        "config",
        "docs",
        "readme",
        "bilingual"
      ]));
      expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining([
        "implementation",
        "test",
        "config",
        "docs"
      ]));
      expect(evaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(evaluation.route.files).not.toEqual(expect.arrayContaining([
        "analysis/paired-analysis.mjs",
        "analysis/power-analysis.mjs",
        "docs/research/PROTOCOL_V2.md",
        "docs/research/PROTOCOL_V2_2.md",
        "docs/research/evidence/guarded-stale-memory-v2.2-trial01.json",
        "docs/research/evidence/guarded-stale-memory-v2.2-trial02.json",
        "results/adaptive-pilot-v2.2/README.md",
        ".github/workflows/ci.yml"
      ]));
      expect(evaluation.route.fileCount).toBeLessThanOrEqual(10);
      expect(evaluation.coverage.changedFileCoverage).toBe(1);
      expect(evaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.8);
      expect(evaluation.route.confidence).toBeGreaterThan(0.35);
      expect(evaluation.calibration.status).not.toBe("overconfident");

      const pinTask = "同步 Vertex Palace 产品源码、研究证据与 CI 到 control-first v3 计划、英文协议、简体中文协议和 README；保留 frozen false 与零 Agent outcomes";
      const pinAnalysis = analyzeTask(pinTask);
      const pinEvaluation = await evaluateRoute(root, pinTask, {
        changedFiles,
        budget: 5000,
        routeLimit: 6,
        maxDrawers: 4
      });

      expect(classifyTask(pinTask)).toBe("evaluation");
      expect(requestedRouteSurfaces(pinAnalysis)).toEqual(expect.arrayContaining([
        "implementation",
        "test",
        "config",
        "docs",
        "ci"
      ]));
      expect(pinEvaluation.route.files).toEqual(expect.arrayContaining(changedFiles));
      expect(pinEvaluation.route.files).toContain(".github/workflows/ci.yml");
      expect(pinEvaluation.route.fileCount).toBeLessThanOrEqual(9);
      expect(pinEvaluation.coverage.changedFileCoverage).toBe(1);
      expect(pinEvaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.88);

      const postUpdateFiles = [
        ...changedFiles,
        "docs/research/evidence/vertex-palace-0.3.0-sync-evaluation.json"
      ];
      const postUpdateTask = "Pin Vertex Palace 0.3.0 in the control-first study generator, focused test, frozen plan, bilingual protocol and README; preserve the current machine-readable evaluation evidence while excluding historical v2.2 trials";
      const postUpdateAnalysis = analyzeTask(postUpdateTask);
      const postUpdateEvaluation = await evaluateRoute(root, postUpdateTask, {
        changedFiles: postUpdateFiles,
        budget: 5000,
        routeLimit: 6,
        maxDrawers: 4
      });

      expect(requestedRouteSurfaces(postUpdateAnalysis)).toEqual(expect.arrayContaining([
        "implementation",
        "test",
        "config",
        "docs",
        "evidence"
      ]));
      expect(postUpdateEvaluation.route.files).toEqual(expect.arrayContaining(postUpdateFiles));
      expect(postUpdateEvaluation.route.files).not.toEqual(expect.arrayContaining([
        "docs/research/evidence/guarded-stale-memory-v2.2-trial01.json",
        "docs/research/evidence/guarded-stale-memory-v2.2-trial02.json",
        "results/adaptive-pilot-v2.2/plan.json"
      ]));
      expect(postUpdateEvaluation.coverage.changedFileCoverage).toBe(1);
      expect(postUpdateEvaluation.coverage.routeFocus).toBeGreaterThanOrEqual(0.8);
    });
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

      if (process.env.RELEASE_ROUTING_REPORT === "1") {
        process.stdout.write(`${JSON.stringify({
          name: "R1-vertex-palace-replication",
          taskType: evaluation.taskType,
          routeFiles: evaluation.route.files,
          changedFileCoverage: evaluation.coverage.changedFileCoverage,
          routeFocus: evaluation.coverage.routeFocus,
          confidence: evaluation.route.confidence,
          calibration: evaluation.calibration
        })}\n`);
      }

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

  it("recognizes a Simplified Chinese research report as documentation evidence", () => {
    const analysis = analyzeTask("补齐英文与简体中文研究报告和机器证据，记录真实测试结果");

    expect(analysis.keywords).toEqual(expect.arrayContaining(["docs", "documentation", "evidence", "test"]));
    expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining(["docs", "evidence", "test"]));
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

  it("keeps configuration migration documents in focused bugfix routes", async () => {
    await withFixture("ts-api", async (root) => {
      const sources = new Map<string, string>([
        ["src/scheduler/batch-scheduler-v2.ts", "export function scheduleV2Batch() { return 'scheduler-v2'; }\n"],
        ["src/scheduler/batch-scheduler-v1.ts", "export function scheduleV1Batch() { return 'scheduler-v1 legacy'; }\n"],
        ["src/config/scheduler-config-loader.ts", "export function loadSchedulerV2Config() { return 'scheduler-v2'; }\n"],
        ["config/scheduler-v2.json", JSON.stringify({ schedulerVersion: 2, batchSize: 20 })],
        ["docs/configuration-migration.md", "# Scheduler configuration migration\n\nVersion 2 replaces the legacy scheduler-v1 keys.\n"],
        ["tests/batch-scheduler-v2.test.ts", "describe('scheduler v2 batch', () => it('loads migrated configuration', () => true));\n"]
      ]);
      for (const [relativePath, source] of sources) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const task = "Fix the v2 batch scheduler now that the configuration migration is complete.";
      const analysis = analyzeTask(task);
      const route = await routePalace(root, task, { routeLimit: 6 });
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(requestedRouteSurfaces(analysis)).toEqual(expect.arrayContaining(["config", "docs"]));
      expect(routed).toContain("src/scheduler/batch-scheduler-v2.ts");
      expect(routed).toContain("config/scheduler-v2.json");
      expect(routed).toContain("docs/configuration-migration.md");
      expect(routed).not.toContain("README.md");
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
