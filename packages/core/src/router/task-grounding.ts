import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type {
  PalaceNode,
  PalaceReferencePolicy,
  PalaceTaskGrounding,
  PalaceTaskGroundingResolutionStatus,
  PalaceTaskReference
} from "@vertex-palace/shared";
import { hashText } from "../scanner/file-hash";
import { writeJson } from "../storage/write-palace";
import { analyzeTask } from "./analyze-task";

const execFileAsync = promisify(execFile);
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_BODY_CHARS = 8 * 1024;
const MAX_REFERENCES = 2;

const GENERIC_GROUNDING_TERMS = new Set([
  "bugfix",
  "change",
  "confidence",
  "failure",
  "feature",
  "github",
  "implementation",
  "incident",
  "investigate",
  "issue",
  "problem",
  "regression",
  "route",
  "test",
  "tests",
  "verification"
]);

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type GroundTaskOptions = {
  referencePolicy?: PalaceReferencePolicy;
  fetchImpl?: FetchLike;
  now?: () => Date;
  remoteUrl?: string;
  timeoutMs?: number;
};

export type GroundedTask = {
  effectiveTask: string;
  grounding: PalaceTaskGrounding;
};

type GitHubRepository = {
  owner: string;
  repo: string;
};

type GitHubReferenceCandidate = GitHubRepository & {
  kind: "issue" | "pull";
  number: number;
};

type CachedGitHubReference = {
  schemaVersion: 1;
  fetchedAt: string;
  expiresAt: string;
  reference: PalaceTaskReference;
  bodyExcerpt: string;
  labels: string[];
};

type ResolvedReference = {
  reference: PalaceTaskReference;
  bodyExcerpt?: string;
  labels?: string[];
};

export async function groundTask(
  root: string,
  task: string,
  nodes: PalaceNode[],
  options: GroundTaskOptions = {}
): Promise<GroundedTask> {
  const referencePolicy = options.referencePolicy ?? "auto";
  const locallyIdentifiable = isTaskLocallyIdentifiable(task, nodes);
  const explicitReferences = collectGitHubReferences(task).slice(0, MAX_REFERENCES);
  if (locallyIdentifiable && (referencePolicy === "off" || !explicitReferences.length)) {
    return localGrounding(task);
  }
  if (referencePolicy === "off") {
    return unresolvedGrounding(task, "disabled", [], "Remote task-reference resolution is disabled.");
  }

  const repository = parseGitHubRemote(options.remoteUrl ?? await readOriginRemote(root));
  const candidates = locallyIdentifiable
    ? explicitReferences
    : collectGitHubReferences(task, repository).slice(0, MAX_REFERENCES);
  if (!candidates.length) {
    if (locallyIdentifiable) return localGrounding(task);
    return unresolvedGrounding(
      task,
      "unsupported-remote",
      [],
      "The task is not locally identifiable and contains no supported GitHub issue or pull-request reference."
    );
  }

  const resolved: ResolvedReference[] = [];
  for (const candidate of candidates) {
    resolved.push(await resolveGitHubReference(root, candidate, options));
  }

  const usable = resolved.filter((item) => item.reference.title);
  if (!usable.length) {
    const resolutionStatus = aggregateResolutionStatus(resolved.map((item) => item.reference.resolutionStatus));
    if (locallyIdentifiable) {
      return localGrounding(
        task,
        resolutionStatus,
        resolved.map((item) => item.reference),
        `Explicit GitHub metadata could not be enriched (${resolutionStatus}); local task evidence remains sufficient.`
      );
    }
    return unresolvedGrounding(
      task,
      resolutionStatus,
      resolved.map((item) => item.reference),
      `GitHub metadata could not ground the task (${resolutionStatus}).`
    );
  }

  const metadata = usable.map(renderReferenceEvidence).join("\n\n");
  const effectiveTask = `${task}\n\nResolved GitHub task metadata:\n${metadata}`;
  const resolutionStatus = aggregateResolutionStatus(usable.map((item) => item.reference.resolutionStatus));
  if (!locallyIdentifiable && !isTaskLocallyIdentifiable(effectiveTask, nodes)) {
    return unresolvedGrounding(
      task,
      resolutionStatus,
      resolved.map((item) => item.reference),
      "GitHub metadata was retrieved, but it still contains no vocabulary that identifies local product evidence."
    );
  }

  return {
    effectiveTask,
    grounding: {
      status: "resolved",
      decision: "route",
      resolutionStatus,
      references: resolved.map((item) => item.reference),
      reasons: [
        `Resolved ${usable.length} GitHub task reference(s) before routing.`,
        "Only normalized issue or pull-request metadata was used; repository source was not sent remotely."
      ]
    }
  };
}

function renderReferenceEvidence(item: ResolvedReference): string {
  const title = stripReferenceIdentity(item.reference, item.reference.title ?? "");
  const body = stripReferenceIdentity(item.reference, item.bodyExcerpt ?? "");
  const labels = (item.labels ?? [])
    .map((label) => stripReferenceIdentity(item.reference, label).trim())
    .filter(Boolean);
  return [
    `${item.reference.kind === "pull" ? "Pull request" : "Issue"} evidence: ${title}`,
    body,
    labels.length ? `Labels: ${labels.join(", ")}` : ""
  ].filter(Boolean).join("\n");
}

function stripReferenceIdentity(reference: PalaceTaskReference, value: string): string {
  const identities = ["github", "github.com", ...reference.repository.split("/")]
    .map((identity) => identity.trim())
    .filter((identity) => identity.length > 1)
    .sort((left, right) => right.length - left.length);
  return identities.reduce((text, identity) => {
    const escaped = identity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  }, value).replace(/[ \t]{2,}/g, " ").trim();
}

export function isTaskLocallyIdentifiable(task: string, nodes: PalaceNode[]): boolean {
  const withoutReferences = stripReferenceSyntax(task);
  if (hasExplicitFilePath(withoutReferences)) return true;
  const analysis = analyzeTask(withoutReferences);
  if (analysis.identifiers.some((identifier) => isStrongCodeIdentifier(identifier, withoutReferences))) return true;
  const terms = [...new Set([...analysis.keywords, ...analysis.entities])]
    .map((term) => term.toLowerCase())
    .filter((term) => term.length > 2 && !GENERIC_GROUNDING_TERMS.has(term));
  if (!terms.length) return false;
  return nodes.some((node) => isProductEvidence(node) && terms.some((term) => nodeSearchText(node).includes(term)));
}

function isStrongCodeIdentifier(identifier: string, task: string): boolean {
  if (/^\d+$/.test(identifier)) return false;
  if (task.includes(`\`${identifier}\``)) return true;
  return /[._$-]|\d|[a-z][A-Z]|^[A-Z]{2,}/.test(identifier);
}

export function parseGitHubRemote(remoteUrl: string | undefined): GitHubRepository | undefined {
  if (!remoteUrl) return undefined;
  const trimmed = remoteUrl.trim().replace(/\.git$/i, "");
  const match = trimmed.match(/^(?:https?:\/\/github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)([^/]+)\/([^/]+)$/i);
  if (!match?.[1] || !match[2]) return undefined;
  return { owner: match[1], repo: match[2] };
}

export function collectGitHubReferences(
  task: string,
  defaultRepository?: GitHubRepository
): GitHubReferenceCandidate[] {
  const candidates: GitHubReferenceCandidate[] = [];
  const seen = new Set<string>();
  const append = (candidate: GitHubReferenceCandidate | undefined) => {
    if (!candidate || !Number.isSafeInteger(candidate.number) || candidate.number <= 0) return;
    const key = `${candidate.owner.toLowerCase()}/${candidate.repo.toLowerCase()}#${candidate.number}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(candidate);
  };

  for (const match of task.matchAll(/https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/(issues|pull)\/(\d+)/gi)) {
    append({
      owner: match[1],
      repo: match[2],
      kind: match[3].toLowerCase() === "pull" ? "pull" : "issue",
      number: Number(match[4])
    });
  }

  if (defaultRepository) {
    for (const match of task.matchAll(/\b(issue|pull\s*request|pull|pr)\s*#?\s*(\d+)\b/gi)) {
      append({
        ...defaultRepository,
        kind: /pull|pr/i.test(match[1]) ? "pull" : "issue",
        number: Number(match[2])
      });
    }
    for (const match of task.matchAll(/#(\d+)\b/g)) {
      append({ ...defaultRepository, kind: "issue", number: Number(match[1]) });
    }
  }

  return candidates;
}

async function resolveGitHubReference(
  root: string,
  candidate: GitHubReferenceCandidate,
  options: GroundTaskOptions
): Promise<ResolvedReference> {
  const now = (options.now ?? (() => new Date()))();
  const repository = `${candidate.owner}/${candidate.repo}`;
  const apiUrl = `https://api.github.com/repos/${candidate.owner}/${candidate.repo}/issues/${candidate.number}`;
  const canonicalUrl = `https://github.com/${candidate.owner}/${candidate.repo}/${candidate.kind === "pull" ? "pull" : "issues"}/${candidate.number}`;
  const cachePath = referenceCachePath(candidate);
  const cached = await readCache(root, cachePath, now);
  if (cached) {
    return {
      reference: { ...cached.reference, resolutionStatus: "cache-hit" },
      bodyExcerpt: cached.bodyExcerpt,
      labels: cached.labels
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? FETCH_TIMEOUT_MS);
  try {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    const response = await (options.fetchImpl ?? fetch)(apiUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "vertex-palace",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!response.ok) {
      return {
        reference: unresolvedReference(
          candidate,
          canonicalUrl,
          responseStatus(response.status, response.headers.get("x-ratelimit-remaining"))
        )
      };
    }

    const payload = await response.json() as Record<string, unknown>;
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (!title) return { reference: unresolvedReference(candidate, canonicalUrl, "not-found") };
    const bodyExcerpt = typeof payload.body === "string" ? payload.body.slice(0, MAX_BODY_CHARS) : "";
    const labels = Array.isArray(payload.labels)
      ? payload.labels.flatMap((label) => {
          if (typeof label === "string") return [label];
          if (label && typeof label === "object" && typeof (label as { name?: unknown }).name === "string") {
            return [(label as { name: string }).name];
          }
          return [];
        }).slice(0, 20)
      : [];
    const kind = payload.pull_request ? "pull" : candidate.kind;
    const url = typeof payload.html_url === "string" ? payload.html_url : canonicalUrl;
    const contentHash = hashText(`${title}\n${bodyExcerpt}\n${labels.join("\n")}`);
    const reference: PalaceTaskReference = {
      provider: "github",
      kind,
      repository,
      number: candidate.number,
      url,
      resolutionStatus: "fetched",
      title,
      contentHash
    };
    const cache: CachedGitHubReference = {
      schemaVersion: 1,
      fetchedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CACHE_TTL_MS).toISOString(),
      reference,
      bodyExcerpt,
      labels
    };
    await writeJson(root, cachePath, cache);
    return { reference, bodyExcerpt, labels };
  } catch {
    return { reference: unresolvedReference(candidate, canonicalUrl, "network-error") };
  } finally {
    clearTimeout(timeout);
  }
}

async function readOriginRemote(root: string): Promise<string | undefined> {
  try {
    const result = await execFileAsync("git", ["config", "--get", "remote.origin.url"], {
      cwd: root,
      encoding: "utf8",
      timeout: 2_000,
      windowsHide: true
    });
    return result.stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function readCache(
  root: string,
  relativePath: string,
  now: Date
): Promise<CachedGitHubReference | undefined> {
  try {
    const value = JSON.parse(await readFile(path.join(root, relativePath), "utf8")) as CachedGitHubReference;
    if (value.schemaVersion !== 1 || Date.parse(value.expiresAt) <= now.getTime()) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function referenceCachePath(candidate: GitHubReferenceCandidate): string {
  const key = hashText(`${candidate.owner.toLowerCase()}/${candidate.repo.toLowerCase()}#${candidate.number}`).slice(0, 24);
  return `.palace/cache/references/github-${key}.json`;
}

function stripReferenceSyntax(task: string): string {
  return task
    .replace(/https?:\/\/github\.com\/[^\s]+/gi, " ")
    .replace(/\b(?:issue|pull\s*request|pull|pr)\s*#?\s*\d+\b/gi, " ")
    .replace(/#\d+\b/g, " ")
    .replace(/[()\[\]]/g, " ");
}

function hasExplicitFilePath(task: string): boolean {
  return /(?:^|\s|[`'"])(?:\.?\.?[\\/])?[A-Za-z0-9_.@+-]+(?:[\\/][A-Za-z0-9_.@+-]+)*\.[A-Za-z0-9]{1,10}(?=$|\s|[`'":,])/i.test(task);
}

function isProductEvidence(node: PalaceNode): boolean {
  return node.evidence?.scope === "product"
    || ["02-interface", "03-implementation", "04-data", "05-verification"].includes(node.floor);
}

function nodeSearchText(node: PalaceNode): string {
  return [node.sourcePath, node.title, node.summary, ...node.tags].join(" ").toLowerCase();
}

function responseStatus(status: number, remaining: string | null): PalaceTaskGroundingResolutionStatus {
  if (status === 404) return "not-found";
  if (status === 429 || (status === 403 && remaining === "0")) return "rate-limited";
  if (status === 401 || status === 403) return "unauthorized";
  return "network-error";
}

function unresolvedReference(
  candidate: GitHubReferenceCandidate,
  url: string,
  resolutionStatus: PalaceTaskGroundingResolutionStatus
): PalaceTaskReference {
  return {
    provider: "github",
    kind: candidate.kind,
    repository: `${candidate.owner}/${candidate.repo}`,
    number: candidate.number,
    url,
    resolutionStatus
  };
}

function unresolvedGrounding(
  task: string,
  resolutionStatus: PalaceTaskGroundingResolutionStatus,
  references: PalaceTaskReference[],
  reason: string
): GroundedTask {
  return {
    effectiveTask: task,
    grounding: {
      status: "unresolved",
      decision: "abstain",
      resolutionStatus,
      references,
      reasons: [
        reason,
        "Provide the issue or pull-request body, expected behavior, a symbol, or a file path before routing."
      ]
    }
  };
}

function localGrounding(
  task: string,
  resolutionStatus: PalaceTaskGroundingResolutionStatus = "not-needed",
  references: PalaceTaskReference[] = [],
  reason = "The task contains local file, symbol, or product-vocabulary evidence."
): GroundedTask {
  return {
    effectiveTask: task,
    grounding: {
      status: "local",
      decision: "route",
      resolutionStatus,
      references,
      reasons: [reason]
    }
  };
}

function aggregateResolutionStatus(
  statuses: PalaceTaskGroundingResolutionStatus[]
): PalaceTaskGroundingResolutionStatus {
  if (statuses.includes("fetched")) return "fetched";
  if (statuses.length > 0 && statuses.every((status) => status === "cache-hit")) return "cache-hit";
  return statuses[0] ?? "network-error";
}
