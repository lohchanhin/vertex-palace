import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MemoryInput } from "@vertex-palace/shared";
import { hashText } from "../scanner/file-hash";

export async function writeMemory(input: MemoryInput & { root: string }): Promise<{ ok: boolean; memoryPath: string }> {
  const now = new Date().toISOString();
  const safeTask = redactSecrets(input.task);
  const slug = `${now.replace(/[:.]/g, "-")}-${hashText(safeTask).slice(0, 8)}.md`;
  const folder = input.outcome === "success" ? "successful-routes" : input.outcome === "failed" ? "failed-routes" : "task-summaries";
  const memoryDir = input.client
    ? path.join(input.root, ".palace", "07-memory", "clients", safeSegment(input.client), folder)
    : path.join(input.root, ".palace", "07-memory", folder);
  await mkdir(memoryDir, { recursive: true });
  const memoryPath = path.join(memoryDir, slug);
  await writeFile(memoryPath, renderMemory({ ...input, task: safeTask }, now), "utf8");
  return { ok: true, memoryPath };
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

function safeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "default";
}
