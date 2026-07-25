import type { ParsedFile, ParsedSymbol } from "@vertex-palace/shared";
import { extractSearchTerms } from "../utils/lexical-tokens";

type FallbackSymbol = Pick<ParsedSymbol, "name" | "kind">;

export function parseFallback(sourcePath: string, language: string, content: string): ParsedFile {
  const lines = content.split(/\r?\n/);
  const symbols: ParsedSymbol[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const definition = fallbackSymbolFor(lines[index], language);
    if (!definition) continue;
    const endLine = findSymbolEnd(lines, index);
    const body = lines.slice(index, endLine).join("\n");
    symbols.push({
      ...definition,
      startLine: index + 1,
      endLine,
      signature: lines[index].trim().slice(0, 240),
      searchText: fallbackSearchText(body)
    });
  }

  return {
    sourcePath,
    language,
    imports: extractImports(lines, language),
    exports: [],
    symbols: dedupeSymbols(symbols),
    summarySeed: lines
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5)
      .join(" ")
      .slice(0, 500)
  };
}

function fallbackSymbolFor(line: string, language: string): FallbackSymbol | undefined {
  const trimmed = line.trim();
  if (!trimmed || /^(?:\/\/|#|\/\*|\*)/.test(trimmed)) return undefined;

  if (language === "go") {
    const receiverMatch = line.match(/^\s*func\s+\(\s*[^)]*?\*?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (receiverMatch) return { name: `${receiverMatch[1]}.${receiverMatch[2]}`, kind: "method" };
    const functionMatch = line.match(/^\s*func\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (functionMatch) return { name: functionMatch[1], kind: "function" };
  }

  const functionMatch = line.match(
    /^\s*(?:(?:pub(?:\([^)]*\))?|export|async|unsafe|extern\s+"[^"]+")\s+)*(?:function|def|fn)\s+([A-Za-z_][A-Za-z0-9_-]*)\b/
  );
  if (functionMatch) return { name: functionMatch[1], kind: "function" };

  const classMatch = line.match(/^\s*(?:(?:pub(?:\([^)]*\))?|export|abstract)\s+)*class\s+([A-Za-z_][A-Za-z0-9_-]*)\b/);
  if (classMatch) return { name: classMatch[1], kind: "class" };

  const typeMatch = line.match(
    /^\s*(?:(?:pub(?:\([^)]*\))?|export)\s+)*(struct|enum|type|trait|interface)\s+([A-Za-z_][A-Za-z0-9_-]*)\b/
  );
  if (typeMatch) {
    return {
      name: typeMatch[2],
      kind: typeMatch[1] === "trait" || typeMatch[1] === "interface" ? "interface" : "type"
    };
  }

  const constMatch = line.match(/^\s*(?:(?:pub(?:\([^)]*\))?|export)\s+)*(?:const|static)\s+([A-Za-z_][A-Za-z0-9_-]*)\b/);
  if (constMatch) return { name: constMatch[1], kind: "const" };
  return undefined;
}

function findSymbolEnd(lines: string[], startIndex: number): number {
  let depth = 0;
  let sawOpeningBrace = false;
  let inBlockComment = false;

  for (let index = startIndex; index < lines.length; index += 1) {
    const braces = countStructuralBraces(lines[index], inBlockComment);
    inBlockComment = braces.inBlockComment;
    if (braces.open > 0) sawOpeningBrace = true;
    depth += braces.open - braces.close;
    if (sawOpeningBrace && depth <= 0) return index + 1;
    if (!sawOpeningBrace && /;\s*(?:\/\/.*)?$/.test(lines[index])) return index + 1;
    if (!sawOpeningBrace && index - startIndex >= 12) return index + 1;
  }

  return lines.length;
}

function countStructuralBraces(
  line: string,
  startsInBlockComment: boolean
): { open: number; close: number; inBlockComment: boolean } {
  let open = 0;
  let close = 0;
  let quote = "";
  let escaped = false;
  let inBlockComment = startsInBlockComment;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (inBlockComment) {
      if (character === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "/") break;
    if (character === "\"" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "'" && isCharacterLiteralStart(line, index)) {
      quote = character;
      continue;
    }
    if (character === "{") open += 1;
    else if (character === "}") close += 1;
  }

  return { open, close, inBlockComment };
}

function isCharacterLiteralStart(line: string, startIndex: number): boolean {
  const closingQuote = line.indexOf("'", startIndex + 1);
  return closingQuote > startIndex + 1 && closingQuote - startIndex <= 4;
}

function fallbackSearchText(value: string): string {
  const phrases: string[] = [];
  const seen = new Set<string>();
  for (const match of value.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*\b/g)) {
    const phrase = extractSearchTerms(match[0], 12);
    if (!phrase.includes(" ") || seen.has(phrase)) continue;
    seen.add(phrase);
    phrases.push(phrase);
  }
  return [extractSearchTerms(value, 240), ...phrases].filter(Boolean).join(" ");
}

function extractImports(lines: string[], language: string): string[] {
  if (language === "rs" || language === "rust") return extractRustImports(lines);
  if (language === "go") return extractGoImports(lines);
  return lines
    .map((line) => line.trim())
    .filter((line) => /^(import|from|require|include|using)\b/.test(line))
    .slice(0, 80);
}

function extractRustImports(lines: string[]): string[] {
  const imports: string[] = [];
  let pendingUse = "";

  for (const line of lines) {
    const trimmed = line.trim();
    const moduleMatch = trimmed.match(/^(?:pub(?:\([^)]*\))?\s+)?mod\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/);
    if (moduleMatch) imports.push(`self::${moduleMatch[1]}`);

    if (pendingUse) {
      pendingUse += ` ${trimmed}`;
      if (trimmed.includes(";")) {
        imports.push(...normalizeRustUse(pendingUse));
        pendingUse = "";
      }
      continue;
    }

    const useMatch = trimmed.match(/^(?:pub(?:\([^)]*\))?\s+)?use\s+(.+)$/);
    if (!useMatch) continue;
    if (useMatch[1].includes(";")) imports.push(...normalizeRustUse(useMatch[1]));
    else pendingUse = useMatch[1];
  }

  for (const line of lines) {
    for (const match of line.matchAll(/\b(?:crate|self|super)(?:::[A-Za-z_][A-Za-z0-9_]*)+\b/g)) {
      imports.push(match[0]);
    }
  }

  return [...new Set(imports)].slice(0, 80);
}

function normalizeRustUse(value: string): string[] {
  const clean = value
    .replace(/;.*$/, "")
    .replace(/\s+as\s+[A-Za-z_][A-Za-z0-9_]*\s*$/, "")
    .replace(/\s+/g, "");
  return [...new Set(expandRustUseTree(clean))].filter(Boolean).slice(0, 40);
}

function expandRustUseTree(value: string): string[] {
  const braceIndex = value.indexOf("{");
  if (braceIndex < 0) return value ? [value.replace(/::$/, "")] : [];
  const closeIndex = matchingBraceIndex(value, braceIndex);
  if (closeIndex < 0) return [value.slice(0, braceIndex).replace(/::$/, "")].filter(Boolean);

  const prefix = value.slice(0, braceIndex).replace(/::$/, "");
  const imports = prefix ? [prefix] : [];
  const entries = splitTopLevel(value.slice(braceIndex + 1, closeIndex));
  for (const entry of entries) {
    if (!entry) continue;
    if (entry === "self") {
      if (prefix) imports.push(prefix);
      continue;
    }
    const combined = prefix ? `${prefix}::${entry}` : entry;
    imports.push(...expandRustUseTree(combined));
  }
  return imports;
}

function matchingBraceIndex(value: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < value.length; index += 1) {
    if (value[index] === "{") depth += 1;
    else if (value[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function splitTopLevel(value: string): string[] {
  const entries: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "{") depth += 1;
    else if (value[index] === "}") depth -= 1;
    else if (value[index] === "," && depth === 0) {
      entries.push(value.slice(start, index));
      start = index + 1;
    }
  }
  entries.push(value.slice(start));
  return entries.map((entry) => entry.trim()).filter(Boolean);
}

function extractGoImports(lines: string[]): string[] {
  const imports: string[] = [];
  let inImportBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^import\s*\($/.test(trimmed)) {
      inImportBlock = true;
      continue;
    }
    if (inImportBlock && trimmed === ")") {
      inImportBlock = false;
      continue;
    }
    if (!inImportBlock && !/^import\b/.test(trimmed)) continue;
    const match = trimmed.match(/["`]([^"`]+)["`]/);
    if (match) imports.push(match[1]);
  }
  return [...new Set(imports)].slice(0, 80);
}

function dedupeSymbols(symbols: ParsedSymbol[]): ParsedSymbol[] {
  const seen = new Set<string>();
  return symbols.filter((symbol) => {
    const key = `${symbol.name}:${symbol.startLine}:${symbol.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
