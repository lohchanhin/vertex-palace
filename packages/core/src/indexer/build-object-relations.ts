import type { PalaceEdge, PalaceNode, ParsedFile } from "@vertex-palace/shared";
import { hashText } from "../scanner/file-hash";
import {
  compactCodeIdentifier,
  extractCodeIdentifierCompacts,
  tokenizeLexical
} from "../utils/lexical-tokens";

export const MAX_OBJECT_RELATIONS_PER_NODE = 32;

type RelationCandidate = PalaceEdge & {
  priority: number;
};

const REFERENCE_NOISE = new Set([
  "data",
  "item",
  "main",
  "object",
  "result",
  "test",
  "value"
]);

export function buildObjectRelations(
  nodes: PalaceNode[],
  parsedFiles: ParsedFile[],
  now: string
): PalaceEdge[] {
  const objectNodes = nodes.filter((node) => node.object);
  if (objectNodes.length === 0) return [];

  const candidates: RelationCandidate[] = [];
  const nodeByDeclaration = new Map(
    objectNodes.map((node) => [declarationLookupKey(node.sourcePath, node.object!.qualifiedName), node])
  );

  for (const member of objectNodes) {
    const ownerName = member.object?.ownerName;
    if (!ownerName) continue;
    const owner = nodeByDeclaration.get(declarationLookupKey(member.sourcePath, ownerName));
    if (!owner || owner.id === member.id) continue;
    candidates.push(makeCandidate(
      owner.id,
      member.id,
      "contains",
      1,
      300,
      `${owner.object?.qualifiedName} owns ${member.object?.qualifiedName}`,
      now
    ));
  }

  const uniqueDeclarations = uniqueDeclarationsByReferenceKey(objectNodes);
  for (const parsed of parsedFiles) {
    for (const symbol of parsed.symbols) {
      const source = nodeByDeclaration.get(declarationLookupKey(parsed.sourcePath, symbol.name));
      if (!source?.object || !symbol.searchText) continue;
      const references = referenceProfile(symbol.searchText);
      const relatedTargets = new Map<string, PalaceNode>();
      for (const key of referenceKeys(references)) {
        const target = uniqueDeclarations.get(key);
        if (target) relatedTargets.set(target.id, target);
      }

      for (const target of relatedTargets.values()) {
        if (target.id === source.id || !target.object) continue;

        const testRelation = source.object.objectKind === "test";
        const confidence = relationWeight(source, target, testRelation);
        if (testRelation) {
          candidates.push(makeCandidate(
            source.id,
            target.id,
            "tests",
            confidence,
            260,
            `${source.object.qualifiedName} references ${target.object.qualifiedName}`,
            now
          ));
          candidates.push(makeCandidate(
            target.id,
            source.id,
            "tested_by",
            confidence,
            250,
            `${target.object.qualifiedName} is referenced by ${source.object.qualifiedName}`,
            now
          ));
        } else {
          candidates.push(makeCandidate(
            source.id,
            target.id,
            "calls",
            confidence,
            180,
            `${source.object.qualifiedName} references ${target.object.qualifiedName}`,
            now
          ));
        }
      }
    }
  }

  return capRelations(candidates);
}

function uniqueDeclarationsByReferenceKey(nodes: PalaceNode[]): Map<string, PalaceNode> {
  const grouped = new Map<string, PalaceNode[]>();
  for (const node of nodes) {
    const localName = compactCodeIdentifier(localObjectName(node.object!.qualifiedName));
    if (localName.length < 3 || REFERENCE_NOISE.has(localName)) continue;
    grouped.set(localName, [...(grouped.get(localName) ?? []), node]);
  }
  return new Map(
    [...grouped].flatMap(([key, declarations]) => declarations.length === 1 ? [[key, declarations[0]]] : [])
  );
}

function referenceProfile(value: string): { compacts: Set<string>; tokens: Set<string> } {
  return {
    compacts: extractCodeIdentifierCompacts(value),
    tokens: tokenizeLexical(value)
  };
}

function referenceKeys(references: ReturnType<typeof referenceProfile>): Set<string> {
  return new Set([
    ...references.compacts,
    ...[...references.tokens].filter((token) => token.length >= 3 && !REFERENCE_NOISE.has(token))
  ]);
}

function relationWeight(source: PalaceNode, target: PalaceNode, testRelation: boolean): number {
  const confidence = Math.min(
    source.object?.parserConfidence ?? 0,
    target.object?.parserConfidence ?? 0
  );
  const floor = testRelation ? 0.75 : 0.65;
  const range = testRelation ? 0.24 : 0.3;
  return Number((floor + range * confidence).toFixed(3));
}

function capRelations(candidates: RelationCandidate[]): PalaceEdge[] {
  const unique = new Map<string, RelationCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.from}:${candidate.to}:${candidate.type}`;
    const current = unique.get(key);
    if (!current || relationOrder(candidate, current) < 0) unique.set(key, candidate);
  }

  const bySource = new Map<string, RelationCandidate[]>();
  for (const candidate of unique.values()) {
    bySource.set(candidate.from, [...(bySource.get(candidate.from) ?? []), candidate]);
  }

  return [...bySource.values()]
    .flatMap((relations) => relations.sort(relationOrder).slice(0, MAX_OBJECT_RELATIONS_PER_NODE))
    .map(({ priority: _priority, ...edge }) => edge)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function relationOrder(left: RelationCandidate, right: RelationCandidate): number {
  return right.priority - left.priority
    || right.weight - left.weight
    || left.to.localeCompare(right.to)
    || left.id.localeCompare(right.id);
}

function makeCandidate(
  from: string,
  to: string,
  type: PalaceEdge["type"],
  weight: number,
  priority: number,
  evidence: string,
  now: string
): RelationCandidate {
  return {
    id: `edge_${hashText(`${from}:${to}:${type}:${evidence}`).slice(0, 16)}`,
    from,
    to,
    type,
    weight,
    evidence,
    createdAt: now,
    priority
  };
}

function declarationLookupKey(sourcePath: string, qualifiedName: string): string {
  return `${sourcePath}:${qualifiedName}`;
}

function localObjectName(qualifiedName: string): string {
  return qualifiedName.slice(qualifiedName.lastIndexOf(".") + 1);
}
