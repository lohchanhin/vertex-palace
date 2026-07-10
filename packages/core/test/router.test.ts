import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { indexPalace } from "../src/indexer/index-palace";
import { analyzeTask } from "../src/router/analyze-task";
import { classifyTask } from "../src/router/classify-task";
import { routePalace } from "../src/router/route-planner";
import { withFixture } from "./test-utils";

describe("routePalace", () => {
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
