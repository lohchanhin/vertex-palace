import type { PalaceEvidenceFact, PalaceNode, ParsedFile } from "@vertex-palace/shared";
import { nodeEvidenceScope } from "../evidence/evidence-model";
import { hashText } from "../scanner/file-hash";

export function buildFacts(parsedFiles: ParsedFile[], nodes: PalaceNode[]): PalaceEvidenceFact[] {
  const fileNodeByPath = new Map(
    nodes
      .filter((node) => !node.startLine && node.kind !== "directory")
      .map((node) => [node.sourcePath, node])
  );
  const facts = parsedFiles.flatMap((parsed): PalaceEvidenceFact[] => {
    const fileNode = fileNodeByPath.get(parsed.sourcePath);
    if (!fileNode) return [];
    return (parsed.facts ?? []).map((fact) => ({
      ...fact,
      id: `fact_${hashText(`${parsed.sourcePath}:${fact.kind}:${fact.startLine}:${fact.endLine}:${fact.name}`).slice(0, 16)}`,
      sourcePath: parsed.sourcePath,
      scope: nodeEvidenceScope(fileNode),
      provenance: {
        extractor: `${parsed.language}-parser`,
        directness: "direct"
      }
    }));
  });
  return [...new Map(facts.map((fact) => [fact.id, fact])).values()]
    .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)
      || left.startLine - right.startLine
      || left.name.localeCompare(right.name));
}
