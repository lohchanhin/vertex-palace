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
