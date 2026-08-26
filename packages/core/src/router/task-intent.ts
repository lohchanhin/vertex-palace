import type { EvidenceRole, EvidenceScope, TaskIntent, TaskIntentTerm, TaskType } from "@vertex-palace/shared";
import { extractCodeIdentifierCompacts, tokenizeLexical } from "../utils/lexical-tokens";
import type { TaskAnalysis } from "./analyze-task";
import { isTypeDeclarationIntent, type RouteSurface } from "./route-scorer";

const INTENT_NOISE = new Set([
  "add",
  "bug",
  "build",
  "calibrate",
  "change",
  "code",
  "create",
  "feature",
  "fix",
  "implement",
  "improve",
  "let",
  "project",
  "refactor",
  "repository",
  "test",
  "update",
  "without"
]);

const ARTIFACT_OUTPUT_QUALIFIERS = new Set([
  "bilingual",
  "chinese",
  "english",
  "json",
  "localized",
  "localization",
  "machine",
  "machine-readable",
  "machinereadable",
  "markdown",
  "readable",
  "simplified",
  "traditional"
]);

export function buildTaskIntent(
  analysis: TaskAnalysis,
  action: TaskType,
  requestedSurfaces: RouteSurface[]
): TaskIntent {
  const requestedRoles = rolesForSurfaces(requestedSurfaces);
  const verificationRequired = ["bugfix", "feature", "refactor", "review", "test"].includes(action);
  const requiredRoles = requiredRolesFor(action, requestedRoles, verificationRequired);
  const preferredScopes = preferredScopesFor(action, requestedRoles);
  const outcomes = clauseTerms(analysis.raw, "outcome");
  const constraints = clauseTerms(analysis.raw, "constraint");

  return {
    action,
    implementationBoundary: isTypeDeclarationIntent(analysis) ? "declaration" : "runtime",
    subjects: subjectTerms(analysis, constraints),
    outcomes,
    constraints,
    requestedRoles,
    requiredRoles,
    preferredScopes,
    verificationRequired
  };
}

function subjectTerms(
  analysis: TaskAnalysis,
  constraints: TaskIntentTerm[]
): TaskIntentTerm[] {
  const constraintCompacts = new Set(
    constraints.flatMap((term) => [
      compact(term.value),
      ...extractCodeIdentifierCompacts(term.value),
      ...[...tokenizeLexical(term.value)].map(compact)
    ])
  );
  const constraintTokens = new Set(
    constraints.flatMap((term) => [...tokenizeLexical(term.value)])
  );
  const belongsOnlyToConstraint = (value: string): boolean => {
    const normalized = compact(value);
    if (constraintCompacts.has(normalized)) return true;
    const tokens = [...tokenizeLexical(value)];
    return tokens.length > 0 && tokens.every((token) => constraintTokens.has(token));
  };
  const explicit = analysis.identifiers
    .filter((value) => !belongsOnlyToConstraint(value))
    .filter((value) => !isLeadingIntentAction(value, analysis.raw))
    .filter((value) => !isArtifactOutputQualifierIdentifier(value, analysis.raw))
    .map((value): TaskIntentTerm => ({
      value,
      normalized: compact(value),
      kind: "identifier",
      source: "explicit"
    }));
  const explicitNormalized = new Set(explicit.map((term) => term.normalized));
  const inferred = [...analysis.entities, ...analysis.keywords]
    .filter((value) => value.length > 2 && !INTENT_NOISE.has(value))
    .filter((value) => !belongsOnlyToConstraint(value))
    .filter((value) => !isArtifactOutputQualifierIdentifier(value, analysis.raw))
    .filter((value) => !explicitNormalized.has(compact(value)))
    .map((value): TaskIntentTerm => ({
      value,
      normalized: compact(value),
      kind: "concept",
      source: "inferred"
    }));
  return dedupeTerms([...explicit, ...inferred]);
}

function isLeadingIntentAction(value: string, task: string): boolean {
  const normalized = value.toLowerCase();
  if (!INTENT_NOISE.has(normalized)) return false;
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`^\\s*${escaped}\\b`, "i").test(task)) return false;
  const explicitCodeUse = new RegExp(`(?:\\.|\\b)${escaped}\\s*\\(`, "i").test(task)
    || new RegExp(`\`${escaped}\``, "i").test(task);
  return !explicitCodeUse;
}

function isArtifactOutputQualifierIdentifier(value: string, task: string): boolean {
  const normalized = value.toLowerCase();
  const normalizedCompact = compact(value);
  if (!ARTIFACT_OUTPUT_QUALIFIERS.has(normalized) && !ARTIFACT_OUTPUT_QUALIFIERS.has(normalizedCompact)) {
    return false;
  }
  const clauses = task
    .split(/[,;，；。]+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.toLowerCase().includes(normalized) || compact(clause).includes(normalizedCompact));
  if (!clauses.length) return false;
  return clauses.every((clause) => {
    const artifactAction = /\b(?:add|document|generate|localize|preserve|produce|publish|record|translate|update|write)\b/i.test(clause)
      || /(?:记录|記錄|编写|編寫|写入|寫入|生成|更新|翻译|翻譯|本地化|保留)/.test(clause);
    const artifactNoun = /\b(?:artifact|documentation|docs?|evidence|json|markdown|readme|record|reports?|results?)\b/i.test(clause)
      || /(?:证据|證據|报告|報告|结果|結果|文档|文檔|说明|說明)/.test(clause);
    return artifactAction && artifactNoun;
  });
}

function clauseTerms(task: string, kind: "outcome" | "constraint"): TaskIntentTerm[] {
  const patterns = kind === "outcome"
    ? [/(?:\bso\s+that\b|\bto\s+ensure\b|\bensure\b)\s+(.+?)(?=\bwithout\b|\bwhile\s+preserving\b|\bmust\s+not\b|\bdo\s+not\b|\.(?=\s|$)|;|$)/gi]
    : [
        /(?:\bwithout\b|\bwhile\s+preserving\b|\bpreserve\b|\bmust\s+not\b|\bdo\s+not\b)\s+(.+?)(?=\.(?=\s|$)|;|$)/gi,
        /\bonly\s+when\s+(.+?)(?=\.(?=\s|$)|;|$)/gi
      ];
  const terms = patterns.flatMap((pattern) => [...task.matchAll(pattern)].flatMap((match) => {
    const value = match[1]?.trim();
    if (!value) return [];
    return [{
      value,
      normalized: [...tokenizeLexical(value)].join(" "),
      kind,
      source: "explicit"
    } satisfies TaskIntentTerm];
  }));
  return dedupeTerms(terms);
}

function rolesForSurfaces(surfaces: RouteSurface[]): EvidenceRole[] {
  const roles = new Set<EvidenceRole>();
  for (const surface of surfaces) {
    if (surface === "test" || surface === "evidence") roles.add("verification");
    if (surface === "docs") roles.add("documentation");
    if (["config", "ci", "package", "plugin"].includes(surface)) roles.add("configuration");
    if (surface === "shared") roles.add("contract");
    if (surface === "tooling") roles.add("implementation");
    if (["implementation", "cli", "mcp"].includes(surface)) roles.add("implementation");
  }
  return [...roles];
}

function requiredRolesFor(
  action: TaskType,
  requestedRoles: EvidenceRole[],
  verificationRequired: boolean
): EvidenceRole[] {
  const roles = new Set<EvidenceRole>(requestedRoles);
  if (["bugfix", "feature", "refactor", "review"].includes(action)) roles.add("implementation");
  if (action === "test") roles.add("implementation");
  if (action === "explain" && roles.size === 0) roles.add("implementation");
  if (action === "unknown" && roles.size === 0) roles.add("implementation");
  if (action === "release") {
    roles.add("configuration");
    roles.add("verification");
  }
  if (verificationRequired) roles.add("verification");
  return [...roles];
}

function preferredScopesFor(action: TaskType, requestedRoles: EvidenceRole[]): EvidenceScope[] {
  const scopes = new Set<EvidenceScope>();
  if (requestedRoles.includes("documentation")) scopes.add("documentation");
  if (["bugfix", "feature", "refactor", "review", "test", "explain", "unknown"].includes(action)) scopes.add("product");
  if (["evaluation", "release"].includes(action)) scopes.add("tooling");
  if (scopes.size === 0) scopes.add("unknown");
  return [...scopes];
}

function dedupeTerms(terms: TaskIntentTerm[]): TaskIntentTerm[] {
  const seen = new Set<string>();
  return terms.filter((term) => {
    const key = `${term.kind}:${term.normalized}`;
    if (!term.normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
