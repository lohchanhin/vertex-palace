import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PalaceObjectKind, PalaceObjectParser, ParsedSymbol } from "@vertex-palace/shared";
import { describe, expect, it } from "vitest";
import {
  createPalaceObjectMetadata,
  normalizeObjectLanguage,
  normalizeObjectSource
} from "../src/palace/object-identity";
import { parseFile } from "../src/parser/parse-file";
import { indexPalace, isRoomInventoryEnabled, ROOM_INVENTORY_ENV } from "../src/indexer/index-palace";
import { readIndex } from "../src/storage/read-palace";
import { withFixture } from "./test-utils";

type InventoryFixture = {
  id: string;
  language: string;
  sourcePath: string;
  symbolName: string;
  objectKind: PalaceObjectKind;
  ownerName?: string;
  parser: PalaceObjectParser;
  parserConfidence: number;
  exported: boolean;
};

type InventoryContract = {
  schemaVersion: number;
  identityVersion: number;
  cases: InventoryFixture[];
};

describe("Room Inventory Phase 0 contract", () => {
  it("discovers the frozen cross-language objects without changing parser output", async () => {
    await withFixture("room-inventory", async (root) => {
      const contract = JSON.parse(
        await readFile(path.join(root, "contract.json"), "utf8")
      ) as InventoryContract;

      expect(contract).toMatchObject({ schemaVersion: 1, identityVersion: 1 });
      expect(new Set(contract.cases.map((entry) => normalizeObjectLanguage(entry.language)))).toEqual(
        new Set(["typescript", "javascript", "python", "go", "rust"])
      );

      for (const fixture of contract.cases) {
        const absolutePath = path.join(root, fixture.sourcePath);
        const baselineContent = await readFile(absolutePath, "utf8");
        const baselineParsed = await parseFile(root, fixture.sourcePath, fixture.language);
        const baselineSymbol = requiredSymbol(baselineParsed.symbols, fixture.symbolName);
        const baselineObject = metadataFor(fixture, baselineSymbol, baselineContent);

        expect(baselineSymbol.object, fixture.id).toBeUndefined();
        expect(baselineObject).toMatchObject({
          version: 1,
          objectKind: fixture.objectKind,
          qualifiedName: fixture.symbolName,
          exported: fixture.exported,
          parser: fixture.parser,
          parserConfidence: fixture.parserConfidence
        });
        expect(baselineObject.declarationKey).toMatch(/^object:v1:[a-f0-9]{24}$/);
        expect(baselineObject.semanticHash).toMatch(/^[a-f0-9]{64}$/);

        const comment = normalizeObjectLanguage(fixture.language) === "python"
          ? "# unrelated line shift\n\n"
          : "// unrelated line shift\n\n";
        await writeFile(absolutePath, `${comment}${baselineContent}`, "utf8");
        const shiftedContent = await readFile(absolutePath, "utf8");
        const shiftedParsed = await parseFile(root, fixture.sourcePath, fixture.language);
        const shiftedSymbol = requiredSymbol(shiftedParsed.symbols, fixture.symbolName);
        const shiftedObject = metadataFor(fixture, shiftedSymbol, shiftedContent);

        expect(shiftedSymbol.startLine, fixture.id).toBe(baselineSymbol.startLine + 2);
        expect(shiftedObject.declarationKey, fixture.id).toBe(baselineObject.declarationKey);
        expect(shiftedObject.semanticHash, fixture.id).toBe(baselineObject.semanticHash);
      }
    });
  });

  it("normalizes comments and whitespace while preserving comment-like string content", () => {
    expect(normalizeObjectSource(
      "return value + 1;",
      "typescript"
    )).toBe(normalizeObjectSource(
      "/* note */\nreturn   value + 1; // explanation",
      "ts"
    ));
    expect(normalizeObjectSource(
      "return/* note */value;",
      "typescript"
    )).toBe("return value;");
    expect(normalizeObjectSource(
      "return value.strip()",
      "python"
    )).toBe(normalizeObjectSource(
      "# note\nreturn   value.strip()",
      "py"
    ));
    expect(normalizeObjectSource(
      "return \"https://example.com/#anchor\";",
      "javascript"
    )).toContain("https://example.com/#anchor");
  });

  it("rejects invalid parser confidence", () => {
    expect(() => createPalaceObjectMetadata({
      sourcePath: "src/example.ts",
      language: "typescript",
      objectKind: "function",
      qualifiedName: "example",
      signature: "function example()",
      body: "function example() {}",
      parser: "ts-morph",
      parserConfidence: 1.1
    })).toThrow(/between 0 and 1/);
  });

  it("uses semantic identity as a rename candidate without merging declaration identity", () => {
    const alpha = createPalaceObjectMetadata({
      sourcePath: "src/example.ts",
      language: "typescript",
      objectKind: "function",
      qualifiedName: "alpha",
      signature: "function alpha()",
      body: "function alpha() { return 1; }",
      parser: "ts-morph",
      parserConfidence: 1
    });
    const beta = createPalaceObjectMetadata({
      sourcePath: "src/example.ts",
      language: "typescript",
      objectKind: "function",
      qualifiedName: "beta",
      signature: "function beta()",
      body: "function beta() { return 1; }",
      parser: "ts-morph",
      parserConfidence: 1
    });

    expect(beta.declarationKey).not.toBe(alpha.declarationKey);
    expect(beta.semanticHash).toBe(alpha.semanticHash);
  });
});

describe("Room Inventory Phase 1 index integration", () => {
  it("attaches frozen object metadata across five languages only when enabled", async () => {
    await withFixture("room-inventory", async (root) => {
      const contract = JSON.parse(
        await readFile(path.join(root, "contract.json"), "utf8")
      ) as InventoryContract;

      for (const fixture of contract.cases) {
        const baseline = await parseFile(root, fixture.sourcePath, fixture.language);
        const enriched = await parseFile(root, fixture.sourcePath, fixture.language, undefined, {
          roomInventory: true
        });
        const baselineSymbol = requiredSymbol(baseline.symbols, fixture.symbolName);
        const enrichedSymbol = requiredSymbol(enriched.symbols, fixture.symbolName);

        expect(baselineSymbol.object, fixture.id).toBeUndefined();
        expect(enrichedSymbol.object, fixture.id).toMatchObject({
          version: 1,
          objectKind: fixture.objectKind,
          qualifiedName: fixture.symbolName,
          ...(fixture.ownerName ? { ownerName: fixture.ownerName } : {}),
          exported: fixture.exported,
          parser: fixture.parser,
          parserConfidence: fixture.parserConfidence
        });
        expect(enrichedSymbol.object?.declarationKey, fixture.id).toMatch(/^object:v1:[a-f0-9]{24}$/);
        expect(enrichedSymbol.object?.semanticHash, fixture.id).toMatch(/^[a-f0-9]{64}$/);
      }
    });
  });

  it("retains object identity when unrelated lines shift in opt-in parser output", async () => {
    await withFixture("room-inventory", async (root) => {
      const contract = JSON.parse(
        await readFile(path.join(root, "contract.json"), "utf8")
      ) as InventoryContract;

      for (const fixture of contract.cases) {
        const absolutePath = path.join(root, fixture.sourcePath);
        const baselineContent = await readFile(absolutePath, "utf8");
        const baseline = requiredSymbol(
          (await parseFile(root, fixture.sourcePath, fixture.language, undefined, { roomInventory: true })).symbols,
          fixture.symbolName
        );
        const comment = normalizeObjectLanguage(fixture.language) === "python"
          ? "# unrelated line shift\n\n"
          : "// unrelated line shift\n\n";
        await writeFile(absolutePath, `${comment}${baselineContent}`, "utf8");
        const shifted = requiredSymbol(
          (await parseFile(root, fixture.sourcePath, fixture.language, undefined, { roomInventory: true })).symbols,
          fixture.symbolName
        );

        expect(shifted.startLine, fixture.id).toBe(baseline.startLine + 2);
        expect(shifted.object?.declarationKey, fixture.id).toBe(baseline.object?.declarationKey);
        expect(shifted.object?.semanticHash, fixture.id).toBe(baseline.object?.semanticHash);
      }
    });
  });

  it("persists optional objects without changing existing node routing fields", async () => {
    await withFixture("room-inventory", async (root) => {
      const contract = JSON.parse(
        await readFile(path.join(root, "contract.json"), "utf8")
      ) as InventoryContract;
      const baselineResult = await indexPalace(root, { roomInventory: false });
      const baseline = await readIndex(root);

      expect(baselineResult.roomInventoryEnabled).toBe(false);
      expect(baselineResult.objectCount).toBe(0);
      expect(baseline.nodes.every((node) => node.object === undefined)).toBe(true);

      const enabledResult = await indexPalace(root, { roomInventory: true });
      const enabled = await readIndex(root);

      expect(enabledResult.roomInventoryEnabled).toBe(true);
      expect(enabledResult.objectCount).toBeGreaterThanOrEqual(contract.cases.length);
      expect(routeProjection(enabled.nodes)).toEqual(routeProjection(baseline.nodes));
      for (const fixture of contract.cases) {
        const node = enabled.symbols.find(
          (candidate) => candidate.sourcePath === fixture.sourcePath && candidate.title === fixture.symbolName
        );
        expect(node?.object, fixture.id).toMatchObject({
          qualifiedName: fixture.symbolName,
          objectKind: fixture.objectKind,
          parser: fixture.parser
        });
      }
    });
  });

  it("keeps the environment switch explicit and lets options override it", () => {
    const enabledEnvironment = { [ROOM_INVENTORY_ENV]: "1" };
    expect(isRoomInventoryEnabled({}, enabledEnvironment)).toBe(true);
    expect(isRoomInventoryEnabled({ roomInventory: false }, enabledEnvironment)).toBe(false);
    expect(isRoomInventoryEnabled({ roomInventory: true }, {})).toBe(true);
    expect(isRoomInventoryEnabled({}, {})).toBe(false);
  });

  it("does not treat unrelated CommonJS symbols as exported", async () => {
    await withFixture("room-inventory", async (root) => {
      const sourcePath = "javascript/commonjs.js";
      await writeFile(
        path.join(root, sourcePath),
        [
          "function unrelated() { return false; }",
          "const hooks = { beforeRun() { return true; } };",
          "module.exports = hooks;",
          ""
        ].join("\n"),
        "utf8"
      );
      const parsed = await parseFile(root, sourcePath, "javascript", undefined, { roomInventory: true });

      expect(requiredSymbol(parsed.symbols, "hooks.beforeRun").object?.exported).toBe(true);
      expect(requiredSymbol(parsed.symbols, "unrelated").object?.exported).toBe(false);
    });
  });
});

function requiredSymbol(symbols: ParsedSymbol[], name: string): ParsedSymbol {
  const symbol = symbols.find((candidate) => candidate.name === name);
  if (!symbol) throw new Error(`Expected fixture symbol ${name}.`);
  return symbol;
}

function metadataFor(fixture: InventoryFixture, symbol: ParsedSymbol, content: string) {
  const lines = content.split(/\r?\n/);
  return createPalaceObjectMetadata({
    sourcePath: fixture.sourcePath,
    language: fixture.language,
    objectKind: fixture.objectKind,
    qualifiedName: fixture.symbolName,
    ownerName: fixture.ownerName,
    signature: symbol.signature,
    body: lines.slice(symbol.startLine - 1, symbol.endLine).join("\n"),
    exported: fixture.exported,
    parser: fixture.parser,
    parserConfidence: fixture.parserConfidence
  });
}

function routeProjection(nodes: Awaited<ReturnType<typeof readIndex>>["nodes"]) {
  return nodes.map(({ object: _object, createdAt: _createdAt, updatedAt: _updatedAt, ...node }) => node);
}
