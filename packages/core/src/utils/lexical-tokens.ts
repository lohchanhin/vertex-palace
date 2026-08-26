const TOKEN_ALIASES = new Map<string, string>([
  ["authentication", "auth"],
  ["authenticated", "auth"],
  ["authorization", "auth"],
  ["authorisation", "auth"],
  ["decoded", "decode"],
  ["decodes", "decode"],
  ["decoding", "decode"],
  ["dedup", "dedupe"],
  ["deduplicate", "dedupe"],
  ["deduplicated", "dedupe"],
  ["deduplicates", "dedupe"],
  ["deduplicating", "dedupe"],
  ["dupe", "dedupe"],
  ["dupes", "dedupe"],
  ["duplicate", "dedupe"],
  ["duplicated", "dedupe"],
  ["duplicates", "dedupe"],
  ["encoded", "encode"],
  ["encodes", "encode"],
  ["encoding", "encode"],
  ["preserved", "preserve"],
  ["preserving", "preserve"],
  ["redirected", "redirect"],
  ["redirecting", "redirect"],
  ["redirects", "redirect"],
  ["req", "request"],
  ["rows", "row"],
  ["statuses", "status"],
  ["stripped", "strip"],
  ["stripping", "strip"],
  ["upgraded", "upgrade"],
  ["upgrades", "upgrade"]
]);

const SINGULAR_S_TOKENS = new Set(["status"]);

const CODE_STOP_WORDS = new Set([
  "any",
  "as",
  "async",
  "await",
  "class",
  "const",
  "else",
  "export",
  "extends",
  "false",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "interface",
  "let",
  "new",
  "null",
  "number",
  "object",
  "readonly",
  "return",
  "string",
  "this",
  "true",
  "type",
  "undefined",
  "var",
  "void"
]);

export function normalizeLexicalToken(value: string): string {
  const token = value.toLowerCase();
  const alias = TOKEN_ALIASES.get(token);
  if (alias) return alias;
  if (SINGULAR_S_TOKENS.has(token)) return token;
  const inflected = normalizeInflectedToken(token);
  if (inflected !== token) return TOKEN_ALIASES.get(inflected) ?? inflected;
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

function normalizeInflectedToken(token: string): string {
  const suffixLength = token.length > 5 && token.endsWith("ing")
    ? 3
    : token.length > 4 && token.endsWith("ed")
      ? 2
      : 0;
  if (!suffixLength) return token;

  let stem = token.slice(0, -suffixLength);
  if (!/[aeiouy]/.test(stem)) return token;
  let normalized = false;
  if (stem.length <= 6 && /([^aeioulsz])\1$/.test(stem)) {
    stem = stem.slice(0, -1);
    normalized = true;
  }
  if (
    !normalized
    && suffixLength === 3
    && (/(?:at|bl|iz)$/.test(stem) || isShortConsonantVowelConsonantStem(stem))
  ) {
    stem += "e";
    normalized = true;
  }
  return normalized ? stem : token;
}

function isShortConsonantVowelConsonantStem(value: string): boolean {
  return value.length >= 3
    && /[^aeiou][aeiouy][^aeiouwxy]$/.test(value)
    && vowelConsonantMeasure(value) === 1;
}

function vowelConsonantMeasure(value: string): number {
  let measure = 0;
  let previousWasVowel = false;
  for (const character of value) {
    const vowel = /[aeiouy]/.test(character);
    if (previousWasVowel && !vowel) measure += 1;
    previousWasVowel = vowel;
  }
  return measure;
}

export function tokenizeLexical(value: string): Set<string> {
  return new Set(
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map(normalizeLexicalToken)
      .filter(Boolean)
  );
}

export function extractCodeIdentifiers(value: string): string[] {
  const candidates = [
    ...[...value.matchAll(/`([^`\r\n]+)`/g)].flatMap((match) =>
      match[1]?.match(/[A-Za-z_$][A-Za-z0-9_$]*(?:[._-][A-Za-z0-9_$]+)*/g) ?? []
    ),
    ...(value.match(
      /[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)+|[A-Za-z0-9$]+(?:[-_][A-Za-z0-9$]+)+|[a-z_$][a-z0-9_$]*(?:[A-Z][A-Za-z0-9_$]*)+|[A-Z][a-z0-9_$]+(?:[A-Z][A-Za-z0-9_$]*)+|[A-Z]{2,}[A-Za-z0-9_$]*[a-z][A-Za-z0-9_$]*|(?=[A-Z0-9]*\d)[A-Z][A-Z0-9]{1,}|[A-Z][a-z0-9_$]{2,}/g
    ) ?? [])
  ];
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const normalized = compactCodeIdentifier(candidate);
    if (normalized.length < 2 || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function extractCodeIdentifierCompacts(value: string): Set<string> {
  const compacts = new Set<string>();
  for (const identifier of extractCodeIdentifiers(value)) {
    const full = compactCodeIdentifier(identifier);
    if (full) compacts.add(full);
    for (const segment of identifier.split(/[._-]+/)) {
      const compactSegment = compactCodeIdentifier(segment);
      if (compactSegment.length > 1) compacts.add(compactSegment);
    }
  }
  return compacts;
}

export function compactCodeIdentifier(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9$]+/g, "");
}

export function extractSearchTerms(value: string, limit = 160): string {
  return [...tokenizeLexical(value)]
    .filter((token) => token.length > 1 && !CODE_STOP_WORDS.has(token))
    .slice(0, limit)
    .join(" ");
}
