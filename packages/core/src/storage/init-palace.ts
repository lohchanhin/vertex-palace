import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDefaultConfig, PALACE_FLOORS } from "../config/defaults";
import { configPath, writeConfigYaml } from "../config/palace-config";
import { ensurePitfallBoard } from "../memory/pitfall-board";
import { exists } from "./read-palace";
import { writeJson } from "./write-palace";

export async function initPalace(root: string): Promise<{
  root: string;
  palaceRoot: string;
  created: boolean;
  configPath: string;
  gitExcludePath: string | null;
  gitExcludeUpdated: boolean;
}> {
  const palaceRoot = path.join(root, ".palace");
  const alreadyInitialized = await exists(configPath(root));
  const gitExclude = await ensureGitExclude(root);
  await mkdir(palaceRoot, { recursive: true });

  for (const floor of PALACE_FLOORS) {
    await mkdir(path.join(palaceRoot, floor), { recursive: true });
  }

  await Promise.all([
    mkdir(path.join(palaceRoot, "indexes"), { recursive: true }),
    mkdir(path.join(palaceRoot, "rooms"), { recursive: true }),
    mkdir(path.join(palaceRoot, "routes"), { recursive: true }),
    mkdir(path.join(palaceRoot, "evaluations"), { recursive: true }),
    mkdir(path.join(palaceRoot, "cache"), { recursive: true }),
    mkdir(path.join(palaceRoot, "memory"), { recursive: true }),
    mkdir(path.join(palaceRoot, "07-memory", "decisions"), { recursive: true }),
    mkdir(path.join(palaceRoot, "07-memory", "successful-routes"), { recursive: true }),
    mkdir(path.join(palaceRoot, "07-memory", "failed-routes"), { recursive: true }),
    mkdir(path.join(palaceRoot, "07-memory", "task-summaries"), { recursive: true })
  ]);

  if (!alreadyInitialized) {
    const config = createDefaultConfig(path.basename(root));
    await writeFile(configPath(root), writeConfigYaml(config), "utf8");
    await writeFloorReadmes(root);
    await writeJson(root, ".palace/indexes/routes.json", []);
  }
  await ensurePitfallBoard(root);

  return {
    root,
    palaceRoot,
    created: !alreadyInitialized,
    configPath: configPath(root),
    gitExcludePath: gitExclude.path,
    gitExcludeUpdated: gitExclude.updated
  };
}

async function ensureGitExclude(root: string): Promise<{ path: string | null; updated: boolean }> {
  const gitDirectory = await resolveGitDirectory(root);
  if (!gitDirectory) return { path: null, updated: false };

  const excludePath = path.join(gitDirectory, "info", "exclude");
  let source = "";
  try {
    source = await readFile(excludePath, "utf8");
  } catch (error) {
    if (!isMissing(error)) throw error;
  }

  const equivalentEntries = new Set([".palace", ".palace/", "/.palace", "/.palace/"]);
  if (source.split(/\r?\n/).some((line) => equivalentEntries.has(line.trim()))) {
    return { path: excludePath, updated: false };
  }

  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const separator = source.length > 0 && !source.endsWith("\n") ? newline : "";
  await mkdir(path.dirname(excludePath), { recursive: true });
  await appendFile(excludePath, `${separator}/.palace/${newline}`, "utf8");
  return { path: excludePath, updated: true };
}

async function resolveGitDirectory(root: string): Promise<string | null> {
  const dotGit = path.join(root, ".git");
  let metadata;
  try {
    metadata = await stat(dotGit);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }

  let gitDirectory = dotGit;
  if (metadata.isFile()) {
    const pointer = await readFile(dotGit, "utf8");
    const match = /^gitdir:\s*(.+)\s*$/im.exec(pointer);
    if (!match) return null;
    gitDirectory = path.resolve(root, match[1]);
  } else if (!metadata.isDirectory()) {
    return null;
  }

  try {
    const commonDirectory = (await readFile(path.join(gitDirectory, "commondir"), "utf8")).trim();
    if (commonDirectory) return path.resolve(gitDirectory, commonDirectory);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  return gitDirectory;
}

function isMissing(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function writeFloorReadmes(root: string): Promise<void> {
  const summaries: Record<string, string> = {
    "00-entrance": "Project entry points, rules, commands, and directory overview.",
    "01-business": "Business concepts, user flows, requirements, and product rules.",
    "02-interface": "APIs, DTOs, schemas, events, and message contracts.",
    "03-implementation": "Source code, functions, classes, services, controllers, and components.",
    "04-data": "Database schemas, migrations, models, cache, queue, and storage.",
    "05-verification": "Tests, mocks, fixtures, and CI rules.",
    "06-runtime": "Errors, stack traces, terminal output, and recent failures.",
    "07-memory": "Decisions, successful routes, failed routes, and task summaries."
  };

  await Promise.all(
    Object.entries(summaries).map(([floor, summary]) => writeFile(path.join(root, ".palace", floor, "README.md"), `# ${floor}\n\n${summary}\n`, "utf8"))
  );
  await writeFile(path.join(root, ".palace", "00-entrance", "project-summary.md"), "# Project Summary\n\nGenerated by Vertex Palace.\n", "utf8");
  await writeFile(
    path.join(root, ".palace", "00-entrance", "commands.md"),
    "# Commands\n\n- palace context \"fix login bug\"\n- palace evaluate \"fix login bug\" --changed-file src/auth.ts\n- palace memory write --task \"fix login bug\" --outcome success\n\nAdvanced diagnosis:\n\n- palace status\n- palace index\n- palace route \"fix login bug\"\n- palace pack \"fix login bug\"\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".palace", "00-entrance", "rules.md"),
    "# Rules\n\nVertex Palace stores indexes, summaries, routes, and memory only.\n\nRead `pitfall-board.md` before routing or editing so repeated mistakes are avoided.\n",
    "utf8"
  );
  await writeFile(path.join(root, ".palace", "00-entrance", "directory-map.md"), "# Directory Map\n\nRun `palace index` to generate the directory tree.\n", "utf8");
  await writeFile(
    path.join(root, ".palace", "memory", "README.md"),
    "# Memory Ledger\n\nTask memory written by `palace memory write` appears here as `latest-task.md`, `task-log.md`, and `index.json`. Floor-based archives are also kept under `07-memory/`.\n",
    "utf8"
  );
  await writeFile(path.join(root, ".palace", "06-runtime", "recent-errors.md"), "# Recent Errors\n\nNo runtime errors recorded.\n", "utf8");
  await writeFile(path.join(root, ".palace", "06-runtime", "failed-test-output.md"), "# Failed Test Output\n\nNo failed test output recorded.\n", "utf8");
}
