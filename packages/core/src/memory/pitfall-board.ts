import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MemoryInput } from "@vertex-palace/shared";
import { hashText } from "../scanner/file-hash";
import { writeJson } from "../storage/write-palace";
import { redactSecrets } from "./redact";

export type PitfallBoardEntry = {
  id: string;
  text: string;
  task: string;
  outcome: MemoryInput["outcome"];
  client?: string;
  source: "pitfall" | "failed-attempt";
  tags: string[];
  memoryPath: string;
  createdAt: string;
};

type PitfallBoardIndex = {
  entries: PitfallBoardEntry[];
};

type PitfallBoardPackOptions = {
  task?: string;
  taskType?: string;
  limit?: number;
};

export function pitfallBoardPath(root: string): string {
  return path.join(root, ".palace", "00-entrance", "pitfall-board.md");
}

export function pitfallIndexPath(root: string): string {
  return path.join(root, ".palace", "memory", "pitfall-board.json");
}

export async function ensurePitfallBoard(root: string): Promise<string> {
  const boardPath = pitfallBoardPath(root);
  const indexPath = pitfallIndexPath(root);
  await Promise.all([mkdir(path.dirname(boardPath), { recursive: true }), mkdir(path.dirname(indexPath), { recursive: true })]);

  const index = await readPitfallIndex(indexPath);
  await writeBoard(root, index.entries);
  await writeJson(root, ".palace/memory/pitfall-board.json", index);
  return boardPath;
}

export async function updatePitfallBoardFromMemory(
  root: string,
  input: MemoryInput & { root: string },
  paths: { now: string; ledgerMemoryPath: string }
): Promise<{ boardPath: string; indexPath: string; written: number }> {
  const boardPath = await ensurePitfallBoard(root);
  const indexPath = pitfallIndexPath(root);
  const candidates = collectPitfalls(input);
  if (!candidates.length) return { boardPath, indexPath, written: 0 };

  const existing = await readPitfallIndex(indexPath);
  const nextEntries = candidates.map((candidate) => {
    const text = redactSecrets(candidate.text.trim());
    const client = input.client ? redactSecrets(input.client) : undefined;
    return {
      id: `pitfall_${hashText([client ?? "default", text].join("\0")).slice(0, 16)}`,
      text,
      task: redactSecrets(input.task),
      outcome: input.outcome,
      client,
      source: candidate.source,
      tags: input.tags?.map(redactSecrets) ?? [],
      memoryPath: relativePalacePath(root, paths.ledgerMemoryPath),
      createdAt: paths.now
    } satisfies PitfallBoardEntry;
  });

  const nextIds = new Set(nextEntries.map((entry) => entry.id));
  const entries = [...nextEntries, ...existing.entries.filter((entry) => !nextIds.has(entry.id))].slice(0, 50);
  await writeJson(root, ".palace/memory/pitfall-board.json", { entries });
  await writeBoard(root, entries);
  return { boardPath, indexPath, written: nextEntries.length };
}

export async function readPitfallBoardForPack(root: string, options: PitfallBoardPackOptions = {}): Promise<string | undefined> {
  try {
    const index = await readPitfallIndex(pitfallIndexPath(root));
    const entries = selectPitfallsForPack(index.entries, options);
    if (!entries.length) return undefined;
    return renderPitfallBoard(entries).trim().slice(0, 4000);
  } catch {
    try {
      const content = await readFile(pitfallBoardPath(root), "utf8");
      if (!content.trim() || content.includes("- No pitfalls recorded yet.")) return undefined;
      return content.trim().slice(0, 1600);
    } catch {
      return undefined;
    }
  }
}

async function writeBoard(root: string, entries: PitfallBoardEntry[]): Promise<void> {
  await writeFile(pitfallBoardPath(root), renderPitfallBoard(entries), "utf8");
}

function renderPitfallBoard(entries: PitfallBoardEntry[]): string {
  const visible = entries.slice(0, 20);
  const lines = [
    "# Pitfall Board",
    "",
    "Read this before routing, packing, editing, or testing. These are project-specific mistakes that previous tasks hit.",
    "",
    "## Latest Pitfalls",
    ...(visible.length ? visible.flatMap(renderEntry) : ["- No pitfalls recorded yet."]),
    ""
  ];
  return lines.join("\n");
}

function renderEntry(entry: PitfallBoardEntry): string[] {
  return [
    `- ${entry.text}`,
    `  Task: ${entry.task}`,
    `  Scope: ${entry.client ?? "default"} | Outcome: ${entry.outcome} | Source: ${entry.source}`,
    `  Memory: ${entry.memoryPath}`
  ];
}

function selectPitfallsForPack(entries: PitfallBoardEntry[], options: PitfallBoardPackOptions): PitfallBoardEntry[] {
  const limit = options.limit ?? (options.taskType === "evaluation" ? 4 : 6);
  const taskTokens = tokenizeForPitfall(options.task ?? "");
  const scored = entries
    .map((entry, index) => ({ entry, index, score: pitfallRelevance(entry, taskTokens, options.taskType) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const maxScore = scored[0]?.score ?? 0;
  const relevant = scored.filter((item) => item.score > 0 && item.score === maxScore).map((item) => item.entry);
  return (relevant.length ? relevant : entries).slice(0, limit);
}

function pitfallRelevance(entry: PitfallBoardEntry, taskTokens: Set<string>, taskType?: string): number {
  const haystack = tokenizeForPitfall([entry.text, entry.task, entry.client, ...entry.tags].filter(Boolean).join(" "));
  let score = 0;
  for (const token of taskTokens) {
    if (haystack.has(token)) score += token.startsWith("client") ? 4 : 1;
  }
  if (taskType && haystack.has(taskType)) score += 2;
  return score;
}

function tokenizeForPitfall(value: string): Set<string> {
  return new Set(
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !["the", "and", "for", "with", "task", "route", "fix", "bug", "fresh", "test"].includes(token))
  );
}

async function readPitfallIndex(indexPath: string): Promise<PitfallBoardIndex> {
  try {
    const parsed = JSON.parse(await readFile(indexPath, "utf8")) as Partial<PitfallBoardIndex>;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries.filter(isPitfallEntry) : [] };
  } catch {
    return { entries: [] };
  }
}

function isPitfallEntry(value: unknown): value is PitfallBoardEntry {
  return Boolean(value && typeof value === "object" && typeof (value as PitfallBoardEntry).id === "string" && typeof (value as PitfallBoardEntry).text === "string");
}

function collectPitfalls(input: MemoryInput): Array<{ text: string; source: PitfallBoardEntry["source"] }> {
  return [
    ...(input.pitfalls ?? []).map((text) => ({ text, source: "pitfall" as const })),
    ...(input.failedAttempts ?? []).map((text) => ({ text, source: "failed-attempt" as const }))
  ].filter((item) => item.text.trim().length > 0);
}

function relativePalacePath(root: string, target: string): string {
  return path.relative(root, target).replace(/\\/g, "/");
}
