const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { hashSourceTree, sha256File } = require("./lib/local-blind-freeze.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-19-0.4-alpha";
const packageManagerCommand = process.platform === "win32"
  ? process.env.ComSpec || "cmd.exe"
  : "pnpm";
const packageManagerPrefix = process.platform === "win32" ? ["/d", "/s", "/c", "pnpm"] : [];
const commands = [
  {
    label: "round19-research-harness",
    command: "node",
    args: [
      "--test",
      "scripts/test/task-diff-coherence.test.cjs",
      "scripts/test/round19-task-diff-coherence-protocol.test.cjs",
      "scripts/test/round19-target-selection.test.cjs",
      "scripts/test/round19-candidate-queue.test.cjs",
      "scripts/test/round19-repository-pool.test.cjs"
    ]
  },
  {
    label: "core-full",
    command: packageManagerCommand,
    args: [...packageManagerPrefix, "--filter", "@vertex-palace/core", "test"]
  },
  {
    label: "cli-full",
    command: packageManagerCommand,
    args: [...packageManagerPrefix, "--filter", "@vertex-palace/cli", "test"]
  },
  {
    label: "mcp-full",
    command: packageManagerCommand,
    args: [...packageManagerPrefix, "--filter", "@vertex-palace/mcp", "test"]
  },
  {
    label: "workspace-build",
    command: packageManagerCommand,
    args: [...packageManagerPrefix, "build"]
  },
  {
    label: "mcp-smoke",
    command: "node",
    args: ["scripts/smoke-mcp.cjs"]
  }
];

main().catch((error) => {
  process.stderr.write(`${summarizeError(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const outputPath = outputArgument(process.argv.slice(2));
  const results = [];
  for (const specification of commands) {
    const startedAt = Date.now();
    const result = spawnSync(specification.command, specification.args, {
      cwd: projectRoot,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 1_200_000,
      windowsHide: true
    });
    const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join("\n");
    results.push({
      label: specification.label,
      command: [specification.command, ...specification.args].join(" "),
      status: result.error ? "execution-error" : result.status === 0 ? "passed" : "failed",
      exitCode: result.status,
      elapsedMs: Date.now() - startedAt,
      outputSha256: sha256(combinedOutput),
      outputTail: tail(combinedOutput, 8_000),
      error: result.error ? summarizeError(result.error) : null
    });
    if (result.error || result.status !== 0) break;
  }

  const allPassed = results.length === commands.length
    && results.every(({ status }) => status === "passed");
  const evidence = {
    schemaVersion: 1,
    studyId,
    generatedAt: new Date().toISOString(),
    status: allPassed ? "passed" : "failed",
    claimBoundary: "Local pre-freeze product and research-harness verification. This proves only that the frozen candidate and selection machinery pass their declared local checks; it is not a Round 19 routing result or Agent A/B result.",
    competitionFreeze: {
      noCommit: true,
      noPush: true,
      noTag: true,
      noNpmPublish: true
    },
    gitBaseCommit: runRequired("git", ["rev-parse", "HEAD"]).trim(),
    candidate: {
      sourceTree: await hashSourceTree(projectRoot),
      cliPath: "dist/palace.cjs",
      cliSha256: await sha256File(path.join(projectRoot, "dist/palace.cjs")),
      generatedMcpPath: "plugins/vertex-palace/mcp/server.cjs",
      generatedMcpSha256: await sha256File(path.join(projectRoot, "plugins/vertex-palace/mcp/server.cjs"))
    },
    results
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: evidence.status,
    commands: results.map(({ label, status, elapsedMs }) => ({ label, status, elapsedMs })),
    sourceTree: evidence.candidate.sourceTree,
    cliSha256: evidence.candidate.cliSha256,
    generatedMcpSha256: evidence.candidate.generatedMcpSha256
  }, null, 2)}\n`);
  if (!allPassed) process.exitCode = 1;
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required so pre-freeze verification cannot be overwritten");
  assert.ok(args[index + 1], "--out requires a repository-relative path");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), "Output must stay inside the repository");
  return resolved;
}

function runRequired(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: process.env,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function tail(value, maximumLength) {
  return value.length <= maximumLength ? value : `...[truncated]\n${value.slice(-maximumLength)}`;
}

function summarizeError(error) {
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  return text.length <= 4_000 ? text : `${text.slice(0, 4_000)}\n...[truncated]`;
}



