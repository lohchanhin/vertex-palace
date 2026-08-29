import type {
  PalaceObjectKind,
  PalaceObjectParser,
  PalaceObjectVisibility,
  ParsedFile,
  ParsedSymbol
} from "@vertex-palace/shared";
import { createPalaceObjectMetadata, normalizeObjectLanguage } from "../palace/object-identity";

const SUPPORTED_LANGUAGES = new Set(["typescript", "javascript", "python", "go", "rust"]);
const MODIFIER_PATTERN = /\b(async|static|readonly|abstract|override|final|sealed|unsafe|extern|pub|public|protected|private)\b/g;

export function attachObjectMetadata(parsed: ParsedFile, content: string): ParsedFile {
  const language = normalizeObjectLanguage(parsed.language);
  if (!SUPPORTED_LANGUAGES.has(language) || parsed.symbols.length === 0) return parsed;

  const lines = content.split(/\r?\n/);
  return {
    ...parsed,
    symbols: parsed.symbols.map((symbol) => attachToSymbol(parsed.sourcePath, language, symbol, lines, content))
  };
}

function attachToSymbol(
  sourcePath: string,
  language: string,
  symbol: ParsedSymbol,
  lines: string[],
  content: string
): ParsedSymbol {
  const body = lines.slice(Math.max(0, symbol.startLine - 1), symbol.endLine).join("\n");
  const ownerName = ownerFor(symbol.name);
  const profile = parserProfile(language);

  try {
    return {
      ...symbol,
      object: createPalaceObjectMetadata({
        sourcePath,
        language,
        objectKind: objectKindFor(symbol.kind),
        qualifiedName: symbol.name,
        ...(ownerName ? { ownerName } : {}),
        signature: symbol.signature,
        body,
        exported: inferExported(language, symbol, content, body, ownerName),
        visibility: inferVisibility(language, symbol, body),
        modifiers: extractModifiers(symbol.signature),
        parser: profile.parser,
        parserConfidence: profile.confidence
      })
    };
  } catch {
    return symbol;
  }
}

function objectKindFor(kind: ParsedSymbol["kind"]): PalaceObjectKind {
  if (kind === "const") return "constant";
  return kind;
}

function ownerFor(qualifiedName: string): string | undefined {
  const separator = qualifiedName.lastIndexOf(".");
  return separator > 0 ? qualifiedName.slice(0, separator) : undefined;
}

function parserProfile(language: string): { parser: PalaceObjectParser; confidence: number } {
  if (language === "typescript" || language === "javascript") {
    return { parser: "ts-morph", confidence: 1 };
  }
  if (language === "python") return { parser: "python-structural", confidence: 0.75 };
  return { parser: "fallback-structural", confidence: 0.65 };
}

function inferExported(
  language: string,
  symbol: ParsedSymbol,
  content: string,
  body: string,
  ownerName?: string
): boolean {
  const localName = symbol.name.slice(symbol.name.lastIndexOf(".") + 1);
  if (language === "python") return false;
  if (language === "go") return /^[A-Z]/.test(localName);
  if (language === "rust") return /^\s*pub(?:\([^)]*\))?\s+/.test(symbol.signature);

  const exportName = ownerName ?? symbol.name;
  const escapedName = escapeRegExp(exportName);
  return new RegExp(`\\bexport\\s+(?:default\\s+)?(?:abstract\\s+)?(?:async\\s+)?(?:class|function|const|let|var|interface|type)\\s+${escapedName}\\b`).test(content)
    || new RegExp(`\\bexport\\s*\\{[^}]*\\b${escapedName}\\b[^}]*\\}`).test(content)
    || new RegExp(`\\bexport\\s+default\\s+${escapedName}\\b`).test(content)
    || new RegExp(`\\bmodule\\.exports\\s*=\\s*${escapedName}\\b`).test(content)
    || new RegExp(`\\b(?:module\\.exports|exports)\\.${escapedName}\\s*=`).test(content)
    || /^\s*export\b/.test(body);
}

function inferVisibility(
  language: string,
  symbol: ParsedSymbol,
  body: string
): PalaceObjectVisibility | undefined {
  if (/\bprivate\b/.test(symbol.signature)) return "private";
  if (/\bprotected\b/.test(symbol.signature)) return "protected";
  if (/\bpublic\b/.test(symbol.signature)) return "public";

  const localName = symbol.name.slice(symbol.name.lastIndexOf(".") + 1);
  if (language === "python") return localName.startsWith("_") ? "private" : "package";
  if (language === "go") return /^[A-Z]/.test(localName) ? "public" : "package";
  if (language === "rust") return /^\s*pub(?:\([^)]*\))?\s+/.test(body) ? "public" : "package";
  return undefined;
}

function extractModifiers(signature: string): string[] {
  return [...signature.matchAll(MODIFIER_PATTERN)].map((match) => match[1]);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
