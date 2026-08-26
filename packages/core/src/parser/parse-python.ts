import type { ParsedFile, ParsedSymbol } from "@vertex-palace/shared";
import { extractSearchTerms } from "../utils/lexical-tokens";

type PythonDefinition = {
  name: string;
  kind: "class" | "function";
  indent: number;
  startLine: number;
  endLine: number;
  signature: string;
};

export function parsePython(sourcePath: string, content: string): ParsedFile {
  const lines = content.split(/\r?\n/);
  const definitions = collectDefinitions(lines);
  const symbols = [
    ...definitions.map((definition) => toSymbol(definition, definitions, lines)),
    ...collectModuleAssignments(lines)
  ].sort((left, right) => left.startLine - right.startLine || left.name.localeCompare(right.name));
  const imports = lines.flatMap(extractPythonImport).slice(0, 80);

  return {
    sourcePath,
    language: "python",
    imports,
    exports: [],
    symbols,
    summarySeed: [
      imports.length ? `Imports: ${imports.join(", ")}` : "",
      symbols.length ? `Symbols: ${symbols.map((symbol) => symbol.name).join(", ")}` : ""
    ]
      .filter(Boolean)
      .join(". ")
      .slice(0, 1200)
  };
}

function collectModuleAssignments(lines: string[]): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(.*)$/);
    if (!match) continue;
    const endIndex = assignmentEndIndex(lines, index, match[2]);
    symbols.push({
      name: match[1],
      kind: "const",
      startLine: index + 1,
      endLine: endIndex + 1,
      signature: line.trim().slice(0, 240),
      searchText: extractSearchTerms(lines.slice(index, endIndex + 1).join("\n"))
    });
    index = endIndex;
  }
  return symbols;
}

function assignmentEndIndex(lines: string[], startIndex: number, initialValue: string): number {
  let depth = delimiterDepth(initialValue);
  let index = startIndex;
  while (
    index + 1 < lines.length
    && (depth > 0 || lines[index].trimEnd().endsWith("\\"))
  ) {
    index += 1;
    depth += delimiterDepth(lines[index]);
  }
  return index;
}

function delimiterDepth(value: string): number {
  let depth = 0;
  let quote: "'" | '"' | undefined;
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "#") break;
    if (character === "(" || character === "[" || character === "{") depth += 1;
    if (character === ")" || character === "]" || character === "}") depth -= 1;
  }
  return depth;
}

function collectDefinitions(lines: string[]): PythonDefinition[] {
  const definitions: PythonDefinition[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^(\s*)(?:(async)\s+)?(def|class)\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (!match) continue;
    definitions.push({
      name: match[4],
      kind: match[3] === "class" ? "class" : "function",
      indent: indentation(match[1]),
      startLine: index + 1,
      endLine: lines.length,
      signature: line.trim().slice(0, 240)
    });
  }

  for (let index = 0; index < definitions.length; index += 1) {
    const current = definitions[index];
    const next = definitions.slice(index + 1).find((candidate) => candidate.indent <= current.indent);
    current.endLine = trimTrailingBlankLines(lines, current.startLine, (next?.startLine ?? lines.length + 1) - 1);
  }
  return definitions;
}

function toSymbol(definition: PythonDefinition, definitions: PythonDefinition[], lines: string[]): ParsedSymbol {
  const searchText = extractSearchTerms(lines.slice(definition.startLine - 1, definition.endLine).join("\n"));
  if (definition.kind === "class") {
    return {
      name: definition.name,
      kind: "class",
      startLine: definition.startLine,
      endLine: definition.endLine,
      signature: definition.signature,
      searchText
    };
  }

  const owner = [...definitions]
    .reverse()
    .find(
      (candidate) =>
        candidate.kind === "class" &&
        candidate.startLine < definition.startLine &&
        candidate.endLine >= definition.endLine &&
        candidate.indent < definition.indent
    );
  return {
    name: owner ? `${owner.name}.${definition.name}` : definition.name,
    kind: owner ? "method" : "function",
    startLine: definition.startLine,
    endLine: definition.endLine,
    signature: definition.signature,
    searchText
  };
}

function extractPythonImport(line: string): string[] {
  const trimmed = line.trim();
  const fromMatch = trimmed.match(/^from\s+([^\s]+)\s+import\s+/);
  if (fromMatch) return [fromMatch[1]];
  const importMatch = trimmed.match(/^import\s+(.+)$/);
  if (!importMatch) return [];
  return importMatch[1]
    .split(",")
    .map((entry) => entry.trim().split(/\s+as\s+/)[0])
    .filter(Boolean);
}

function indentation(value: string): number {
  return [...value].reduce((total, character) => total + (character === "\t" ? 4 : 1), 0);
}

function trimTrailingBlankLines(lines: string[], startLine: number, endLine: number): number {
  let result = Math.max(startLine, endLine);
  while (result > startLine && !lines[result - 1]?.trim()) result -= 1;
  return result;
}
