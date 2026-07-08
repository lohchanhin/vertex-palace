import type { LoadLevel, OpenOutput } from "@context-palace/shared";
import { readIndex } from "../storage/read-palace";
import { assertPalace } from "../utils/errors";
import { estimateTokens } from "./token-estimator";
import { extractNodeContent } from "./snippet-extractor";

export async function openPalaceNode(root: string, input: { nodeId?: string; palacePath?: string; loadLevel?: LoadLevel }): Promise<OpenOutput> {
  const index = await readIndex(root);
  const node = index.nodes.find((candidate) => candidate.id === input.nodeId || candidate.palacePath === input.palacePath);
  assertPalace(node, "Node not found. Pass a valid nodeId or palacePath.", "PALACE_NODE_NOT_FOUND");
  const content = await extractNodeContent(root, node, input.loadLevel ?? "summary");
  return {
    node,
    content,
    estimatedTokens: estimateTokens(content)
  };
}
