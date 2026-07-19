import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  MemoryExclusionReason,
  MemoryInput,
  MemorySelectionTelemetry
} from "@vertex-palace/shared";
import { hashText } from "../scanner/file-hash";
import { estimateTokens } from "../packer/token-estimator";
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

export type GuardedMemoryItem = {
  id: string;
  text: string;
  scope: string;
  ageDays: number;
  confidence: number;
  risk: "low" | "medium" | "high";
  source: PitfallBoardEntry["source"];
  memoryPath: string;
  contradictionCheck: string;
};

export type GuardedMemoryResult = {
  items: GuardedMemoryItem[];
  estimatedTokens: number;
  telemetry: MemorySelectionTelemetry;
};

export type GuardedMemoryOptions = {
  task: string;
  taskType?: string;
  limit?: number;
  maxTokens?: number;
  maxAgeDays?: number;
  minRelevance?: number;
  now?: Date;
};

type MemoryScopeResolution = {
  enforce: boolean;
  allowedClients: Set<string>;
  inference?: NonNullable<MemorySelectionTelemetry["scopeInference"]>;
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
      id: `pitfall_${hashText([client ?? "default", normalizePitfallText(text)].join("\0")).slice(0, 16)}`,
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

export async function readGuardedMemory(
  root: string,
  options: GuardedMemoryOptions
): Promise<GuardedMemoryResult> {
  const limit = Math.max(0, Math.min(3, options.limit ?? 3));
  const maxTokens = Math.max(100, Math.min(600, options.maxTokens ?? 600));
  const maxAgeDays = Math.max(1, options.maxAgeDays ?? 90);
  const minRelevance = Math.max(1, options.minRelevance ?? 1);
  const now = options.now ?? new Date();
  const index = await readPitfallIndex(pitfallIndexPath(root));
  const taskTokens = tokenizeForPitfall(options.task);
  const candidates = index.entries
    .map((entry, index) => {
      const ageDays = ageInDays(entry.createdAt, now);
      return {
        entry,
        index,
        ageDays,
        score: pitfallRelevance(entry, taskTokens, options.taskType)
      };
    })
    .filter((candidate) => candidate.score >= minRelevance)
    .sort((a, b) => b.score - a.score || a.ageDays - b.ageDays || a.index - b.index);
  const scopeResolution = resolveMemoryScope(
    candidates.map((candidate) => candidate.entry),
    options.task,
    taskTokens
  );

  const items: GuardedMemoryItem[] = [];
  const excluded: Array<{ id: string; reason: MemoryExclusionReason }> = [];
  let estimatedTokens = 0;
  for (const candidate of candidates) {
    if (candidate.ageDays > maxAgeDays) {
      excluded.push({ id: candidate.entry.id, reason: "expired" });
      continue;
    }
    if (candidate.entry.client
        && scopeResolution.enforce
        && !scopeResolution.allowedClients.has(normalizeScope(candidate.entry.client))) {
      excluded.push({ id: candidate.entry.id, reason: "scope_mismatch" });
      continue;
    }
    if (items.length >= limit) {
      excluded.push({ id: candidate.entry.id, reason: "selection_limit_reached" });
      continue;
    }
    const item = toGuardedMemoryItem(candidate.entry, candidate.score, candidate.ageDays, options.task);
    const itemTokens = estimateTokens(renderGuardedMemoryItem(item));
    if (estimatedTokens + itemTokens > maxTokens) {
      excluded.push({ id: candidate.entry.id, reason: "token_budget_exceeded" });
      continue;
    }
    items.push(item);
    estimatedTokens += itemTokens;
  }

  return {
    items,
    estimatedTokens,
    telemetry: {
      memoryCandidates: candidates.length,
      memoryIncluded: items.length,
      memoryExcluded: excluded,
      candidateIds: candidates.map((candidate) => candidate.entry.id),
      includedIds: items.map((item) => item.id),
      ...(scopeResolution.inference ? { scopeInference: scopeResolution.inference } : {})
    }
  };
}

export function renderGuardedMemoryItem(item: GuardedMemoryItem): string {
  return [
    `- ${item.text}`,
    `  Scope: ${item.scope} | Age: ${item.ageDays}d | Confidence: ${item.confidence} | Risk: ${item.risk}`,
    `  Check: ${item.contradictionCheck}`,
    `  Evidence: ${item.memoryPath}`
  ].join("\n");
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
  const relevant = scored.filter((item) => item.score > 0).map((item) => item.entry);
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
  const ascii = value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !["the", "and", "for", "with", "task", "route", "fix", "bug", "fresh", "test"].includes(token));
  const cjkChunks = value.match(/[\u3400-\u9fff]+/g) ?? [];
  const cjk = cjkChunks.flatMap((chunk) => {
    const tokens = [chunk];
    for (let size = 2; size <= Math.min(4, chunk.length); size += 1) {
      for (let index = 0; index <= chunk.length - size; index += 1) tokens.push(chunk.slice(index, index + size));
    }
    return tokens;
  });
  return new Set([...ascii, ...cjk]);
}

function scopeDirectlyMatchesTask(client: string, task: string, taskTokens = tokenizeForPitfall(task)): boolean {
  const normalizedClient = normalizeScope(client);
  if (normalizedClient && normalizeScope(task).includes(normalizedClient)) return true;
  const identityTokens = [...tokenizeForPitfall(client)].filter((token) => !["client", "tenant", "project"].includes(token));
  return identityTokens.length > 0 && identityTokens.every((token) => taskTokens.has(token));
}

function resolveMemoryScope(
  entries: PitfallBoardEntry[],
  task: string,
  taskTokens: Set<string>
): MemoryScopeResolution {
  const scoped = entries.filter((entry): entry is PitfallBoardEntry & { client: string } => Boolean(entry.client));
  const directClients = new Set(
    scoped
      .filter((entry) => scopeDirectlyMatchesTask(entry.client, task, taskTokens))
      .map((entry) => normalizeScope(entry.client))
  );
  if (directClients.size) return { enforce: true, allowedClients: directClients };
  if (!hasScopeMarker(task)) return { enforce: false, allowedClients: new Set() };
  if (!requestsHistoricalScope(task)) return { enforce: true, allowedClients: new Set() };

  const byClient = new Map<string, { client: string; score: number; evidenceTokens: string[] }>();
  for (const entry of scoped) {
    const normalizedClient = normalizeScope(entry.client);
    const evidenceTokens = scopeAliasEvidence(entry, taskTokens);
    const existing = byClient.get(normalizedClient);
    if (!existing || evidenceTokens.length > existing.score) {
      byClient.set(normalizedClient, {
        client: entry.client,
        score: evidenceTokens.length,
        evidenceTokens
      });
    }
  }
  const ranked = [...byClient.values()].sort((first, second) => second.score - first.score);
  const winner = ranked[0];
  const runnerUp = ranked[1];
  if (!winner || winner.score < 3 || (runnerUp && winner.score - runnerUp.score < 2)) {
    return { enforce: true, allowedClients: new Set() };
  }
  return {
    enforce: true,
    allowedClients: new Set([normalizeScope(winner.client)]),
    inference: {
      client: winner.client,
      reason: "unique_historical_alias_match",
      evidenceTokens: winner.evidenceTokens
    }
  };
}

function scopeAliasEvidence(entry: PitfallBoardEntry, taskTokens: Set<string>): string[] {
  const generic = new Set([
    "api", "article", "client", "complete", "customer", "decision", "decisions", "every",
    "historical", "history", "keep", "memory", "other", "pass", "pitfall", "previous",
    "prior", "project", "public", "regression", "shared", "task", "tenant", "test", "tests",
    "text", "token"
  ]);
  const sourceTokens = tokenizeForPitfall([entry.text, entry.task, ...entry.tags].join(" "));
  return [...taskTokens]
    .filter((token) => !generic.has(token) && sourceTokens.has(token))
    .sort();
}

function requestsHistoricalScope(task: string): boolean {
  return /\b(?:histor(?:y|ical)|memory|pitfall|previous|prior|remember(?:ed)?|decision)\b/i.test(task)
    || /(?:历史|歷史|记忆|記憶|决定|決定|决策|決策|踩坑|之前|先前)/u.test(task);
}

function hasScopeMarker(task: string): boolean {
  return /\b(?:client|tenant|customer)\b/i.test(task)
    || /(?:客户|客戶|租户|租戶|专案|專案)/u.test(task);
}

function normalizeScope(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g, "");
}

function toGuardedMemoryItem(
  entry: PitfallBoardEntry,
  relevance: number,
  ageDays: number,
  task: string
): GuardedMemoryItem {
  const clientMatch = Boolean(entry.client && task.toLowerCase().includes(entry.client.toLowerCase()));
  const risk = entry.outcome === "failed" || entry.source === "failed-attempt"
    ? "high"
    : clientMatch || relevance >= 4
      ? "medium"
      : "low";
  const confidence = Math.max(0.35, Math.min(0.92, 0.4 + relevance * 0.08 - ageDays / 500));
  return {
    id: entry.id,
    text: entry.text,
    scope: entry.client ?? "project",
    ageDays,
    confidence: Number(confidence.toFixed(2)),
    risk,
    source: entry.source,
    memoryPath: entry.memoryPath,
    contradictionCheck: "Verify against current code and tests before applying."
  };
}

function ageInDays(createdAt: string, now: Date): number {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.floor((now.getTime() - created) / 86_400_000));
}

function normalizePitfallText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
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
