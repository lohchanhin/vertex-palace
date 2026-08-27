import type {
  PalaceObjectKind,
  PalaceObjectMetadata,
  PalaceObjectParser,
  PalaceObjectVisibility
} from "@vertex-palace/shared";
import { hashText } from "../scanner/file-hash";
import { normalizeRelativePath } from "../utils/path-utils";

export type PalaceObjectIdentityInput = {
  sourcePath: string;
  language: string;
  objectKind: PalaceObjectKind;
  qualifiedName: string;
  ownerName?: string;
  signature: string;
  body: string;
  exported?: boolean;
  visibility?: PalaceObjectVisibility;
  modifiers?: string[];
  parser: PalaceObjectParser;
  parserConfidence: number;
};

export function createPalaceObjectMetadata(input: PalaceObjectIdentityInput): PalaceObjectMetadata {
  const sourcePath = normalizeRelativePath(input.sourcePath);
  const language = normalizeObjectLanguage(input.language);
  const qualifiedName = input.qualifiedName.trim();
  const signatureShape = normalizeObjectSource(input.signature, language);

  if (!sourcePath) throw new Error("Palace object sourcePath is required.");
  if (!qualifiedName) throw new Error("Palace object qualifiedName is required.");
  if (!signatureShape) throw new Error("Palace object signature is required.");
  assertConfidence(input.parserConfidence, "parserConfidence");

  const declarationKey = `object:v1:${hashText(JSON.stringify([
    language,
    sourcePath,
    input.objectKind,
    qualifiedName,
    signatureShape
  ])).slice(0, 24)}`;
  const semanticHash = hashText(JSON.stringify([
    language,
    input.objectKind,
    implementationShape(input.body, signatureShape, language)
  ]));

  return {
    version: 1,
    declarationKey,
    signatureShape,
    semanticHash,
    objectKind: input.objectKind,
    qualifiedName,
    ...(input.ownerName?.trim() ? { ownerName: input.ownerName.trim() } : {}),
    exported: input.exported ?? false,
    ...(input.visibility ? { visibility: input.visibility } : {}),
    modifiers: [...new Set((input.modifiers ?? []).map((modifier) => modifier.trim()).filter(Boolean))].sort(),
    parser: input.parser,
    parserConfidence: input.parserConfidence
  };
}

export function normalizeObjectLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (["ts", "tsx", "typescript"].includes(normalized)) return "typescript";
  if (["js", "jsx", "javascript"].includes(normalized)) return "javascript";
  if (["py", "python"].includes(normalized)) return "python";
  if (["rs", "rust"].includes(normalized)) return "rust";
  return normalized;
}

export function normalizeObjectSource(source: string, language: string): string {
  return stripComments(source, normalizeObjectLanguage(language)).replace(/\s+/g, " ").trim();
}

function implementationShape(body: string, signatureShape: string, language: string): string {
  const normalizedBody = normalizeObjectSource(body, language);
  return normalizedBody.startsWith(signatureShape)
    ? normalizedBody.slice(signatureShape.length).trim()
    : normalizedBody;
}

function assertConfidence(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be between 0 and 1.`);
  }
}

function stripComments(source: string, language: string): string {
  const hashComments = language === "python";
  let result = "";
  let quote: "'" | "\"" | "`" | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
        result += "\n";
      }
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === "\"" || character === "`") {
      quote = character;
      result += character;
      continue;
    }
    if (character === "/" && next === "/") {
      result += " ";
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      result += " ";
      blockComment = true;
      index += 1;
      continue;
    }
    if (hashComments && character === "#") {
      result += " ";
      lineComment = true;
      continue;
    }
    result += character;
  }

  return result;
}
