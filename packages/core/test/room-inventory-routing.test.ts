import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_OBJECT_RELATIONS_PER_NODE } from "../src/indexer/build-object-relations";
import { indexPalace } from "../src/indexer/index-palace";
import { readIndex } from "../src/storage/read-palace";
import { analyzeTask } from "../src/router/analyze-task";
import { classifyTask } from "../src/router/classify-task";
import { routePalace } from "../src/router/route-planner";
import { scoreNodes } from "../src/router/route-scorer";
import { withFixture } from "./test-utils";

describe("Room Inventory Phase 2 object routing", () => {
  it("adds owner and focused test relations on the existing node graph", async () => {
    await withFixture("room-inventory", async (root) => {
      await writeSource(
        root,
        "typescript/calculate.ts",
        "export function calculateInvoice(amount: number) { return amount * 2; }\n"
      );
      await writeSource(
        root,
        "typescript/calculate.test.ts",
        [
          "import { calculateInvoice } from './calculate';",
          "export function testCalculateInvoice() { return calculateInvoice(5) === 10; }",
          ""
        ].join("\n")
      );

      await indexPalace(root, { roomInventory: true });
      const index = await readIndex(root);
      const owner = objectNode(index.nodes, "typescript/payment-service.ts", "PaymentService");
      const member = objectNode(index.nodes, "typescript/payment-service.ts", "PaymentService.authorize");
      const implementation = objectNode(index.nodes, "typescript/calculate.ts", "calculateInvoice");
      const verification = objectNode(index.nodes, "typescript/calculate.test.ts", "testCalculateInvoice");

      expect(verification.object?.objectKind).toBe("test");
      expect(index.edges).toContainEqual(expect.objectContaining({
        from: owner.id,
        to: member.id,
        type: "contains"
      }));
      expect(index.edges).toContainEqual(expect.objectContaining({
        from: verification.id,
        to: implementation.id,
        type: "tests"
      }));
      expect(index.edges.filter((edge) => (
        edge.from === verification.id && edge.to === implementation.id && edge.type === "tests"
      ))).toHaveLength(1);
      expect(index.edges).toContainEqual(expect.objectContaining({
        from: implementation.id,
        to: verification.id,
        type: "tested_by"
      }));
    });
  });

  it("caps deterministic outgoing object calls at the frozen limit", async () => {
    await withFixture("room-inventory", async (root) => {
      const targets = Array.from({ length: 40 }, (_, index) => `targetAction${index}`);
      await writeSource(
        root,
        "typescript/fanout.ts",
        [
          ...targets.map((name, index) => `export function ${name}() { return ${index}; }`),
          `export function invokeAll() { return [${targets.map((name) => `${name}()`).join(", ")}]; }`,
          ""
        ].join("\n")
      );

      await indexPalace(root, { roomInventory: true });
      const index = await readIndex(root);
      const caller = objectNode(index.nodes, "typescript/fanout.ts", "invokeAll");
      const outgoingCalls = index.edges.filter((edge) => edge.from === caller.id && edge.type === "calls");

      expect(outgoingCalls).toHaveLength(MAX_OBJECT_RELATIONS_PER_NODE);
      const firstIds = outgoingCalls.map((edge) => edge.id);
      await indexPalace(root, { roomInventory: true });
      const repeated = await readIndex(root);
      expect(
        repeated.edges.filter((edge) => edge.from === caller.id && edge.type === "calls").map((edge) => edge.id)
      ).toEqual(firstIds);
    });
  });

  it("uses qualified identity to disambiguate same-named methods", async () => {
    await withFixture("room-inventory", async (root) => {
      await writeSource(
        root,
        "typescript/duplicate-services.ts",
        [
          "export class PaymentService { authorize() { return 'payment'; } }",
          "export class TokenService { authorize() { return 'token'; } }",
          ""
        ].join("\n")
      );

      await indexPalace(root, { roomInventory: true });
      const index = await readIndex(root);
      const exactTask = "Fix `PaymentService.authorize` so payment authorization returns the expected result";
      const exactAnalysis = analyzeTask(exactTask);
      const exactScores = scoreNodes(index.nodes, index.edges, exactAnalysis, classifyTask(exactTask), index.facts);
      const payment = scoredObject(exactScores, "PaymentService.authorize");
      const token = scoredObject(exactScores, "TokenService.authorize");

      expect(payment.score).toBeGreaterThan(token.score);
      expect(payment.reasons).toContain('exact Room Inventory object match "PaymentService.authorize"');

      const localTask = "Fix `authorize` so authorization returns the expected result";
      const localAnalysis = analyzeTask(localTask);
      const localScores = scoreNodes(index.nodes, index.edges, localAnalysis, classifyTask(localTask), index.facts);
      const localPayment = scoredObject(localScores, "PaymentService.authorize");
      const localToken = scoredObject(localScores, "TokenService.authorize");

      expect(localPayment.reasons).toContain('exact Room Inventory local object match "PaymentService.authorize"');
      expect(localToken.reasons).toContain('exact Room Inventory local object match "TokenService.authorize"');
    });
  });

  it("keeps object scoring absent by default and routes an enabled exact object first", async () => {
    await withFixture("room-inventory", async (root) => {
      const task = "Fix `PaymentService.authorize` so payment authorization rejects empty account IDs";
      await indexPalace(root, { roomInventory: false });
      const baseline = await readIndex(root);
      const analysis = analyzeTask(task);
      const baselineScores = scoreNodes(baseline.nodes, baseline.edges, analysis, classifyTask(task), baseline.facts);
      expect(baselineScores.flatMap((item) => item.reasons).some((reason) => reason.includes("Room Inventory"))).toBe(false);

      await indexPalace(root, { roomInventory: true });
      const route = await routePalace(root, task, { referencePolicy: "off", routeLimit: 6 });

      expect(route.route[0]?.sourcePath).toMatch(/^typescript\/payment-service\.ts:2-4$/);
      expect(route.route[0]?.reason).toContain("Room Inventory object match");
      expect(route.route[0]?.loadLevel).toBe("full_symbol");
    });
  });
});

async function writeSource(root: string, sourcePath: string, content: string): Promise<void> {
  const absolute = path.join(root, sourcePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content, "utf8");
}

function objectNode(nodes: Awaited<ReturnType<typeof readIndex>>["nodes"], sourcePath: string, qualifiedName: string) {
  const node = nodes.find((candidate) => (
    candidate.sourcePath === sourcePath && candidate.object?.qualifiedName === qualifiedName
  ));
  if (!node) throw new Error(`Expected object node ${sourcePath}:${qualifiedName}.`);
  return node;
}

function scoredObject(items: ReturnType<typeof scoreNodes>, qualifiedName: string) {
  const item = items.find((candidate) => candidate.node.object?.qualifiedName === qualifiedName);
  if (!item) throw new Error(`Expected scored object ${qualifiedName}.`);
  return item;
}
