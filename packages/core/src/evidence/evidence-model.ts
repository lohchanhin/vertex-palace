import type {
  EvidenceRole,
  EvidenceRoleAssignment,
  EvidenceScope,
  PalaceFloor,
  PalaceNode,
  PalaceNodeEvidence,
  PalaceNodeKind
} from "@vertex-palace/shared";

type EvidenceDescriptorInput = {
  sourcePath: string;
  floor: PalaceFloor;
  kind: PalaceNodeKind;
  title?: string;
  generated?: boolean;
};

export function describeNodeEvidence(input: EvidenceDescriptorInput): PalaceNodeEvidence {
  const sourcePath = input.sourcePath.replaceAll("\\", "/").toLowerCase();
  const documentation = isDocumentationArtifact(sourcePath, input.kind);
  const verification = input.kind === "test"
    || input.floor === "05-verification"
    || isVerificationArtifact(sourcePath, input.title)
    || isVerificationConfigArtifact(sourcePath)
    || isVerificationScript(sourcePath)
    || isMachineEvidenceArtifact(sourcePath);
  const tooling = !documentation && isToolingArtifact(sourcePath);
  const scope: EvidenceScope = documentation
    ? "documentation"
    : tooling
      ? "tooling"
      : isHistoryKind(input.kind)
        ? "project-history"
        : isProductKind(input.kind) || verification || input.generated
          ? "product"
          : "unknown";
  const roles: EvidenceRoleAssignment[] = [];

  if (input.kind === "directory") addRole(roles, "navigation", "artifact-kind", 1);
  if (documentation) addRole(roles, "documentation", input.kind === "doc" ? "artifact-kind" : "path-convention", input.kind === "doc" ? 1 : 0.9);
  if (verification) addRole(roles, "verification", input.kind === "test" || input.floor === "05-verification" ? "artifact-kind" : "path-convention", input.kind === "test" ? 1 : 0.85);
  if (input.kind === "config") addRole(roles, "configuration", "artifact-kind", 1);
  if (input.kind === "api" || input.kind === "interface" || input.kind === "type") {
    addRole(roles, "contract", "artifact-kind", 1);
  }
  if (input.kind === "runtime-log") addRole(roles, "runtime", "artifact-kind", 1);
  if (input.kind === "decision") addRole(roles, "decision", "history", 1);
  if (input.kind === "memory") addRole(roles, "memory", "history", 1);
  if (input.generated) addRole(roles, "generated", "declaration", 1);
  if (isImplementationKind(input.kind) && !documentation && !verification) {
    addRole(roles, "implementation", "artifact-kind", scope === "tooling" ? 0.9 : 1);
  }

  return { scope, roles };
}

export function nodeHasEvidenceRole(node: PalaceNode, role: EvidenceRole): boolean {
  return nodeEvidence(node).roles.some((assignment) => assignment.role === role);
}

export function nodeEvidenceScope(node: PalaceNode): EvidenceScope {
  return nodeEvidence(node).scope;
}

export function nodeEvidence(node: PalaceNode): PalaceNodeEvidence {
  return node.evidence ?? describeNodeEvidence({
    sourcePath: node.sourcePath,
    floor: node.floor,
    kind: node.kind,
    title: node.title,
    generated: node.tags.includes("generated-artifact")
  });
}

function addRole(
  assignments: EvidenceRoleAssignment[],
  role: EvidenceRole,
  basis: EvidenceRoleAssignment["basis"],
  confidence: number
): void {
  if (assignments.some((assignment) => assignment.role === role)) return;
  assignments.push({ role, basis, confidence });
}

function isDocumentationArtifact(sourcePath: string, kind: PalaceNodeKind): boolean {
  return kind === "doc"
    || /(^|\/)(?:doc|docs|documentation)(\/|$)/.test(sourcePath)
    || /(^|\/)(?:readme|build_week)\.[^/]+$/.test(sourcePath);
}

function isVerificationScript(sourcePath: string): boolean {
  return /(^|\/)scripts\/[^/]*(?:verify|verification|smoke|benchmark)[^/]*$/.test(sourcePath);
}

function isVerificationConfigArtifact(sourcePath: string): boolean {
  return /(^|\/)(?:tox\.ini|pytest\.ini|noxfile\.py|jest\.config\.[^/]+|vitest\.config\.[^/]+|playwright\.config\.[^/]+)$/.test(sourcePath);
}

function isMachineEvidenceArtifact(sourcePath: string): boolean {
  return /(^|\/)docs\/research\/evidence\/[^/]+\.json$/.test(sourcePath)
    || /(^|\/)evidence\/[^/]+\.json$/.test(sourcePath);
}

function isVerificationArtifact(sourcePath: string, title?: string): boolean {
  if (/(^|\/)(?:__tests__|bench|benches|benchmark|benchmarks|fixtures?|fuzz|fuzzing|snapshots?|spec|specs|test|testdata|tests|testing)(\/|$)/.test(sourcePath)) return true;
  const basename = sourcePath.split("/").at(-1) ?? sourcePath;
  if (/\.(?:test|spec)-d\.[cm]?ts$/.test(basename)) return true;
  if (/^(?:test|spec)\.[^/]+$|^test_[^/]+\.[^/]+$|[._-](?:test|spec)\.[^/]+$/.test(basename)) return true;
  if (!title) return false;
  const symbol = title.split(".").at(-1) ?? title;
  return /^(?:test(?:_|[A-Z])|Test[A-Z])/.test(symbol);
}

function isToolingArtifact(sourcePath: string): boolean {
  return /(^|\/)(?:\.circleci|\.github|\.gitlab|scripts|tools|tooling)(\/|$)/.test(sourcePath);
}

function isHistoryKind(kind: PalaceNodeKind): boolean {
  return kind === "decision" || kind === "memory";
}

function isProductKind(kind: PalaceNodeKind): boolean {
  return isImplementationKind(kind) || kind === "api" || kind === "test";
}

function isImplementationKind(kind: PalaceNodeKind): boolean {
  return ["file", "symbol", "function", "class", "interface", "type", "api"].includes(kind);
}
