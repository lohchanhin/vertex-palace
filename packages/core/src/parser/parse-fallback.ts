import type { ParsedFile, ParsedSymbol } from "@vertex-palace/shared";

export function parseFallback(sourcePath: string, language: string, content: string): ParsedFile {
  const lines = content.split(/\r?\n/);
  const symbols: ParsedSymbol[] = [];

  lines.forEach((line, index) => {
    const functionMatch = line.match(/\b(?:function|def|fn)\s+([A-Za-z_][\w-]*)/);
    const classMatch = line.match(/\bclass\s+([A-Za-z_][\w-]*)/);
    const match = functionMatch ?? classMatch;
    if (match?.[1]) {
      symbols.push({
        name: match[1],
        kind: classMatch ? "class" : "function",
        startLine: index + 1,
        endLine: Math.min(lines.length, index + 8),
        signature: line.trim().slice(0, 160)
      });
    }
  });

  return {
    sourcePath,
    language,
    imports: extractImportLikeLines(lines),
    exports: [],
    symbols,
    summarySeed: lines
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5)
      .join(" ")
      .slice(0, 500)
  };
}

function extractImportLikeLines(lines: string[]): string[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => /^(import|from|require|include|using)\b/.test(line))
    .slice(0, 50);
}
