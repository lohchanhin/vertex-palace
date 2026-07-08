import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MemoryInput } from "@vertex-palace/shared";
import { hashText } from "../scanner/file-hash";
import { writeJson } from "../storage/write-palace";

type MemoryLedger = {
  entries: MemoryLedgerEntry[];
};

type MemoryLedgerEntry = {
  id: string;
  task: string;
  outcome: MemoryInput["outcome"];
  client?: string;
  routeId?: string;
  changedFiles: string[];
  tags: string[];
  createdAt: string;
  floorMemoryPath: string;
  ledgerMemoryPath: string;
};

export async function writeMemory(input: MemoryInput & { root: string }): Promise<{
  ok: boolean;
  memoryPath: string;
  ledgerMemoryPath: string;
  latestPath: string;
  logPath: string;
  indexPath: string;
}> {
  const now = new Date().toISOString();
  const safeTask = redactSecrets(input.task);
  const slug = `${now.replace(/[:.]/g, "-")}-${hashText(safeTask).slice(0, 8)}.md`;
  const folder = folderForOutcome(input.outcome);
  const clientSegment = input.client ? safeSegment(input.client) : undefined;
  const floorMemoryDir = clientSegment
    ? path.join(input.root, ".palace", "07-memory", "clients", clientSegment, folder)
    : path.join(input.root, ".palace", "07-memory", folder);
  const ledgerRoot = clientSegment ? path.join(input.root, ".palace", "memory", "clients", clientSegment) : path.join(input.root, ".palace", "memory");
  const ledgerMemoryDir = path.join(ledgerRoot, folder);
  await Promise.all([mkdir(floorMemoryDir, { recursive: true }), mkdir(ledgerMemoryDir, { recursive: true })]);

  const safeInput = { ...input, task: safeTask };
  const rendered = renderMemory(safeInput, now);
  const memoryPath = path.join(floorMemoryDir, slug);
  const ledgerMemoryPath = path.join(ledgerMemoryDir, slug);
  const latestPath = path.join(ledgerRoot, "latest-task.md");
  const logPath = path.join(ledgerRoot, "task-log.md");
  const indexPath = path.join(ledgerRoot, "index.json");
  await Promise.all([writeFile(memoryPath, rendered, "utf8"), writeFile(ledgerMemoryPath, rendered, "utf8"), writeFile(latestPath, rendered, "utf8")]);

  const entry = createLedgerEntry(input.root, safeInput, {
    id: slug.replace(/\.md$/, ""),
    now,
    memoryPath,
    ledgerMemoryPath
  });
  await appendFile(logPath, renderLogEntry(entry), "utf8");
  await updateLedgerIndex(input.root, indexPath, entry);

  if (clientSegment) {
    const globalRoot = path.join(input.root, ".palace", "memory");
    const globalLatestPath = path.join(globalRoot, "latest-task.md");
    const globalLogPath = path.join(globalRoot, "task-log.md");
    const globalIndexPath = path.join(globalRoot, "index.json");
    await mkdir(globalRoot, { recursive: true });
    await writeFile(globalLatestPath, rendered, "utf8");
    await appendFile(globalLogPath, renderLogEntry(entry), "utf8");
    await updateLedgerIndex(input.root, globalIndexPath, entry);
  }

  return { ok: true, memoryPath, ledgerMemoryPath, latestPath, logPath, indexPath };
}

export function redactSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "[REDACTED_OPENAI_KEY]")
    .replace(/AKIA[0-9A-Z]{16}/g, "[REDACTED_AWS_KEY]")
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]")
    .replace(/Authorization:\s*Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Authorization: Bearer [REDACTED]")
    .replace(/password\s*=\s*[^&\s]+/gi, "password=[REDACTED]")
    .replace(/token\s*=\s*[^&\s]+/gi, "token=[REDACTED]");
}

function renderMemory(input: MemoryInput & { root: string }, now: string): string {
  const lines = [
    `# ${input.outcome} route memory`,
    "",
    `Client: ${input.client ? redactSecrets(input.client) : "default"}`,
    `Task: ${redactSecrets(input.task)}`,
    `Route: ${input.routeId ?? "unknown"}`,
    `Created: ${now}`,
    `Tags: ${input.tags?.length ? input.tags.map(redactSecrets).join(", ") : "none"}`,
    "",
    "## Changed Files",
    ...(input.changedFiles?.length ? input.changedFiles.map((file) => `- ${file}`) : ["- None recorded"]),
    "",
    "## Tests Run",
    ...(input.testsRun?.length ? input.testsRun.map((test) => `- ${test.command}: ${test.status}${test.summary ? ` - ${redactSecrets(test.summary)}` : ""}`) : ["- None recorded"]),
    "",
    "## Decisions",
    ...(input.decisions?.length ? input.decisions.map((decision) => `- ${redactSecrets(decision)}`) : ["- None recorded"]),
    "",
    "## Failed Attempts",
    ...(input.failedAttempts?.length ? input.failedAttempts.map((attempt) => `- ${redactSecrets(attempt)}`) : ["- None recorded"]),
    "",
    "## Notes",
    redactSecrets(input.notes ?? "None recorded"),
    ""
  ];
  return lines.join("\n");
}

function folderForOutcome(outcome: MemoryInput["outcome"]): string {
  return outcome === "success" ? "successful-routes" : outcome === "failed" ? "failed-routes" : "task-summaries";
}

function createLedgerEntry(
  root: string,
  input: MemoryInput & { root: string },
  paths: { id: string; now: string; memoryPath: string; ledgerMemoryPath: string }
): MemoryLedgerEntry {
  return {
    id: paths.id,
    task: redactSecrets(input.task),
    outcome: input.outcome,
    client: input.client ? redactSecrets(input.client) : undefined,
    routeId: input.routeId,
    changedFiles: input.changedFiles ?? [],
    tags: input.tags?.map(redactSecrets) ?? [],
    createdAt: paths.now,
    floorMemoryPath: relativePalacePath(root, paths.memoryPath),
    ledgerMemoryPath: relativePalacePath(root, paths.ledgerMemoryPath)
  };
}

async function updateLedgerIndex(root: string, indexPath: string, entry: MemoryLedgerEntry): Promise<void> {
  const existing = await readLedger(indexPath);
  const entries = [entry, ...existing.entries.filter((item) => item.id !== entry.id)].slice(0, 200);
  await writeJson(root, relativePalacePath(root, indexPath), { entries });
}

async function readLedger(indexPath: string): Promise<MemoryLedger> {
  try {
    const parsed = JSON.parse(await readFile(indexPath, "utf8")) as Partial<MemoryLedger>;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch {
    return { entries: [] };
  }
}

function renderLogEntry(entry: MemoryLedgerEntry): string {
  return [`## ${entry.createdAt} - ${entry.outcome}`, "", `Task: ${entry.task}`, `Client: ${entry.client ?? "default"}`, `Route: ${entry.routeId ?? "unknown"}`, `Memory: ${entry.ledgerMemoryPath}`, ""].join("\n");
}

function relativePalacePath(root: string, target: string): string {
  return path.relative(root, target).replace(/\\/g, "/");
}

function safeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "default";
}
