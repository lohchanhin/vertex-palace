const TOKEN_ALIASES = new Map<string, string>([
  ["authentication", "auth"],
  ["authenticated", "auth"],
  ["authorization", "auth"],
  ["authorisation", "auth"],
  ["decoded", "decode"],
  ["decodes", "decode"],
  ["decoding", "decode"],
  ["encoded", "encode"],
  ["encodes", "encode"],
  ["encoding", "encode"],
  ["preserved", "preserve"],
  ["preserving", "preserve"],
  ["redirected", "redirect"],
  ["redirecting", "redirect"],
  ["redirects", "redirect"],
  ["stripped", "strip"],
  ["stripping", "strip"],
  ["upgraded", "upgrade"],
  ["upgrades", "upgrade"]
]);

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
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
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

export function extractSearchTerms(value: string, limit = 160): string {
  return [...tokenizeLexical(value)]
    .filter((token) => token.length > 1 && !CODE_STOP_WORDS.has(token))
    .slice(0, limit)
    .join(" ");
}
