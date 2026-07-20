const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, readdir, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const packageJson = require(path.join(projectRoot, "package.json"));
const outputPath = outputArgument(process.argv.slice(2));
const packageSourceCommit = "209c6e2ac5196ed30cf148b8a11a88b13bcc675d";
const task = "Fix currency formatting so negative zero is rendered as $0.00. Keep the public API stable.";

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-release-candidate-"));
  const packRoot = path.join(temporaryRoot, "pack");
  const installRoot = path.join(temporaryRoot, "install");
  const fixtureRoot = path.join(temporaryRoot, "fixture");
  const memoryScopeRoot = path.join(temporaryRoot, "memory-scope-fixture");
  const memoryDensityRoot = path.join(temporaryRoot, "memory-density-fixture");

  try {
    await Promise.all([
      mkdir(packRoot),
      mkdir(installRoot),
      mkdir(fixtureRoot),
      mkdir(memoryScopeRoot),
      mkdir(memoryDensityRoot)
    ]);
    const packResult = runNpm(
      ["pack", "--json", "--ignore-scripts", "--pack-destination", packRoot],
      { cwd: projectRoot }
    );
    const metadata = parsePackMetadata(packResult.stdout);
    assert.equal(metadata.name, packageJson.name);
    assert.equal(metadata.version, packageJson.version);
    assert.equal(metadata.files.length, 7);

    const tarballPath = path.join(packRoot, metadata.filename);
    const tarball = await readFile(tarballPath);
    const shasum = createHash("sha1").update(tarball).digest("hex");
    assert.equal(shasum, metadata.shasum);

    await writeFile(
      path.join(installRoot, "package.json"),
      `${JSON.stringify({ name: "vertex-palace-release-candidate", private: true }, null, 2)}\n`,
      "utf8"
    );
    runNpm(
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error", tarballPath],
      { cwd: installRoot }
    );

    const cliPath = path.join(installRoot, "node_modules", packageJson.name, "dist", "palace.cjs");
    const mcpPath = path.join(
      installRoot,
      "node_modules",
      packageJson.name,
      "plugins",
      "vertex-palace",
      "mcp",
      "server.cjs"
    );
    const version = runNode([cliPath, "--version"], { cwd: fixtureRoot }).stdout.trim();
    assert.equal(version, packageJson.version);

    await createLargeFixture(fixtureRoot);
    initializeGitFixture(fixtureRoot);
    const bypassTrials = [];
    for (let trial = 1; trial <= 4; trial += 1) {
      const raw = runNode(
        [cliPath, "context", task, "--auto", "--format", "json", "--budget", "6000"],
        { cwd: fixtureRoot }
      ).stdout;
      const output = JSON.parse(raw);
      assert.deepEqual(Object.keys(output), ["mode", "primaryCandidate", "reason"]);
      assert.equal(output.mode, "bypass");
      assert.equal(output.primaryCandidate, "src/format-currency.mjs");
      bypassTrials.push({
        trial,
        mode: output.mode,
        primaryCandidate: output.primaryCandidate,
        fields: Object.keys(output).length,
        bytes: Buffer.byteLength(raw, "utf8")
      });
    }
    const excludePath = path.join(fixtureRoot, ".git", "info", "exclude");
    const excludeSource = await readFile(excludePath, "utf8");
    const excludeEntries = excludeSource.match(/^\/\.palace\/$/gm) ?? [];
    const fixtureGitStatus = run(
      "git",
      ["status", "--short", "--untracked-files=all"],
      { cwd: fixtureRoot }
    ).stdout.trim();
    const ignoreSource = run(
      "git",
      ["check-ignore", "--verbose", ".palace/palace.yml"],
      { cwd: fixtureRoot }
    ).stdout.trim();
    assert.equal(excludeEntries.length, 1);
    assert.equal(fixtureGitStatus, "");
    assert.match(ignoreSource, /info\/exclude:\d+:\/\.palace\//);

    runNode([
      cliPath,
      "memory",
      "write",
      "--root",
      fixtureRoot,
      "--task",
      "currency formatting negative zero",
      "--outcome",
      "partial",
      "--pitfall",
      "Currency formatting must preserve the accounting sign policy for negative zero.",
      "--tag",
      "currency",
      "formatting",
      "negative",
      "zero"
    ], { cwd: fixtureRoot });

    const fullRaw = runNode(
      [cliPath, "context", task, "--auto", "--format", "json", "--budget", "6000"],
      { cwd: fixtureRoot }
    ).stdout;
    const full = JSON.parse(fullRaw);
    const boundaries = full.executionBoundaries;
    const boundaryFields = [
      "primary",
      "support",
      "deferred",
      "excluded",
      "requiredEvidence",
      "doNot",
      "stopCondition",
      "conflictSummary"
    ];
    assert.equal(full.mode, "full-palace");
    assert.equal(full.memoryTelemetry.memoryIncluded, 1);
    assert.equal(full.payload.memoryItemCount, 1);
    assert.deepEqual(Object.keys(boundaries), boundaryFields);
    assert.equal(full.payload.contextBytes, Buffer.byteLength(fullRaw, "utf8"));
    assert.ok(full.payload.contextEstimatedTokens <= full.selection.maxContextTokens);

    await createMemoryScopeFixture(memoryScopeRoot);
    runNode([cliPath, "init"], { cwd: memoryScopeRoot });
    runNode([cliPath, "index"], { cwd: memoryScopeRoot });
    runNode([
      cliPath,
      "memory",
      "write",
      "--task",
      "Record the independently governed launch tenant article-token ownership decision",
      "--outcome",
      "partial",
      "--client",
      "aurora",
      "--changed-file",
      "clients/aurora/article-tokens.mjs",
      "--pitfall",
      "A prior launch contrast fix changed the shared article token. Keep the launch-only change in Aurora.",
      "--failed-attempt",
      "Changing the shared fallback expanded the launch page fix to tenants outside the approved scope.",
      "--tag",
      "launch-tenant",
      "article-token",
      "tenant-ownership",
      "accessibility"
    ], { cwd: memoryScopeRoot });
    const scopeTask = "Fix the article body text contrast regression for the independently governed launch tenant. Historical project decisions define which tenant owns this token. Keep the shared token and every other tenant unchanged.";
    const scopeRaw = runNode(
      [cliPath, "context", scopeTask, "--auto", "--format", "json", "--budget", "6000"],
      { cwd: memoryScopeRoot }
    ).stdout;
    const scope = JSON.parse(scopeRaw);
    assert.equal(scope.mode, "guarded-memory-palace");
    assert.equal(scope.memoryTelemetry.memoryCandidates, 2);
    assert.equal(scope.memoryTelemetry.memoryIncluded, 2);
    assert.deepEqual(scope.memoryTelemetry.memoryExcluded, []);
    assert.deepEqual(scope.memoryTelemetry.scopeInference, {
      client: "aurora",
      reason: "unique_historical_alias_match",
      evidenceTokens: ["contrast", "governed", "independently", "launch"]
    });
    assert.deepEqual(scope.executionBoundaries.primary, ["clients/aurora/article-tokens.mjs"]);
    assert.ok(scope.executionBoundaries.support.includes("src/themes/shared-article-tokens.mjs"));
    assert.equal(scope.payload.contextBytes, Buffer.byteLength(scopeRaw, "utf8"));
    assert.ok(scope.payload.contextEstimatedTokens <= scope.selection.maxContextTokens);

    await createMemoryDensityFixture(memoryDensityRoot);
    runNode([cliPath, "init"], { cwd: memoryDensityRoot });
    runNode([cliPath, "index"], { cwd: memoryDensityRoot });
    await writeDenseMemoryBoard(memoryDensityRoot);
    const densityTask = "Use historical project decisions to fix guarded memory telemetry context ceiling across the payload packer and all regression validation surfaces";
    const densityArguments = [
      cliPath,
      "context",
      densityTask,
      "--mode",
      "guarded-memory-palace",
      "--budget",
      "5000",
      "--route-limit",
      "10",
      "--max-drawers",
      "5"
    ];
    const densityRaw = runNode([...densityArguments, "--format", "json"], { cwd: memoryDensityRoot }).stdout;
    const density = JSON.parse(densityRaw);
    assert.equal(density.mode, "guarded-memory-palace");
    assert.equal(density.memoryTelemetry.memoryCandidates, 50);
    assert.equal(density.memoryTelemetry.memoryIncluded, 3);
    assert.equal(density.memoryTelemetry.candidateIds.length, 50);
    assert.equal(density.memoryTelemetry.memoryExcluded.length, 47);
    assert.ok(density.memoryTelemetry.memoryExcluded.every((item) => item.reason === "selection_limit_reached"));
    assert.equal(density.payload.contextBytes, Buffer.byteLength(densityRaw, "utf8"));
    assert.ok(density.payload.contextEstimatedTokens <= density.selection.maxContextTokens);

    const densityMarkdownRaw = runNode(
      [...densityArguments, "--format", "markdown"],
      { cwd: memoryDensityRoot }
    ).stdout;
    const densityMarkdown = parseMarkdownPayloadMetrics(densityMarkdownRaw);
    assert.equal(densityMarkdown.contextBytes, Buffer.byteLength(densityMarkdownRaw, "utf8"));
    assert.ok(densityMarkdown.contextEstimatedTokens <= densityMarkdown.maxContextTokens);

    const mcp = runNode([path.join(projectRoot, "scripts", "smoke-mcp.cjs"), mcpPath], { cwd: fixtureRoot });
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      claimBoundary: "Product packaging and context-contract validation only; not an Agent performance benchmark.",
      sourceCommit: packageSourceCommit,
      validationHarnessCommit: run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim(),
      package: `${metadata.name}@${metadata.version}`,
      files: metadata.files.length,
      shasum,
      integrity: metadata.integrity,
      cleanInstallVersion: version,
      gitIsolation: {
        statusCleanAfterContext: fixtureGitStatus === "",
        localExcludeEntries: excludeEntries.length,
        ignoreSource: ignoreSource.replace(/^.*?\.git\//, ".git/")
      },
      distractorFiles: 240,
      bypassTrials,
      relevantMemory: {
        mode: full.mode,
        candidates: full.memoryTelemetry.memoryCandidates,
        included: full.memoryTelemetry.memoryIncluded,
        excluded: full.memoryTelemetry.memoryExcluded.length,
        boundaryFields: Object.keys(boundaries).length,
        estimatedTokens: full.payload.contextEstimatedTokens,
        maxContextTokens: full.selection.maxContextTokens
      },
      historicalScopeAlias: {
        mode: scope.mode,
        candidates: scope.memoryTelemetry.memoryCandidates,
        included: scope.memoryTelemetry.memoryIncluded,
        excluded: scope.memoryTelemetry.memoryExcluded.length,
        inferredClient: scope.memoryTelemetry.scopeInference.client,
        inferenceReason: scope.memoryTelemetry.scopeInference.reason,
        primary: scope.executionBoundaries.primary,
        sharedTier: scope.executionBoundaries.support.includes("src/themes/shared-article-tokens.mjs")
          ? "support"
          : "missing",
        estimatedTokens: scope.payload.contextEstimatedTokens,
        maxContextTokens: scope.selection.maxContextTokens
      },
      denseMemoryCeiling: {
        candidates: density.memoryTelemetry.memoryCandidates,
        included: density.memoryTelemetry.memoryIncluded,
        excluded: density.memoryTelemetry.memoryExcluded.length,
        json: {
          contextBytes: density.payload.contextBytes,
          estimatedTokens: density.payload.contextEstimatedTokens,
          maxContextTokens: density.selection.maxContextTokens,
          loadedDrawers: density.context.length,
          deferredReferences: density.deferredReferences.length
        },
        markdown: densityMarkdown
      },
      installedMcp: mcp.stdout.trim()
    };
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (outputPath) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, serialized, "utf8");
    }
    process.stdout.write(serialized);
  } finally {
    if (process.env.KEEP_RELEASE_CANDIDATE_TEMP === "1") {
      process.stderr.write(`Kept release-candidate fixture at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

async function createMemoryDensityFixture(root) {
  const payloadRoot = path.join(root, "src", "payload");
  await mkdir(payloadRoot, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "memory-density-fixture", private: true, type: "module" }, null, 2)}\n`,
      "utf8"
    ),
    ...Array.from({ length: 10 }, (_, index) => writeFile(
      path.join(payloadRoot, `context-${index}.ts`),
      `export function fitMemoryTelemetry${index}() {\n${`  const payloadBudget${index} = "guarded memory telemetry context ceiling route evidence ${index}";\n`.repeat(45)}  return payloadBudget${index};\n}\n`,
      "utf8"
    ))
  ]);
}

async function writeDenseMemoryBoard(root) {
  const entries = Array.from({ length: 50 }, (_, index) => ({
    id: `memory-${String(index).padStart(2, "0")}`,
    text: `Guarded memory telemetry context ceiling warning ${index}.`,
    task: "Guarded memory telemetry context ceiling",
    outcome: "partial",
    source: "pitfall",
    tags: ["guarded", "memory", "telemetry", "context", "ceiling"],
    memoryPath: `.palace/memory/memory-${index}.md`,
    createdAt: "2026-07-18T00:00:00.000Z"
  }));
  await writeFile(
    path.join(root, ".palace", "memory", "pitfall-board.json"),
    `${JSON.stringify({ entries }, null, 2)}\n`,
    "utf8"
  );
}

async function createMemoryScopeFixture(root) {
  const files = new Map([
    ["package.json", `${JSON.stringify({ name: "memory-scope-fixture", private: true, type: "module" }, null, 2)}\n`],
    ["clients/aurora/article-tokens.mjs", "export const auroraArticleTokens = { text: '#94a3b8' };\n"],
    ["clients/borealis/article-tokens.mjs", "export const borealisArticleTokens = { text: '#94a3b8' };\n"],
    ["src/themes/shared-article-tokens.mjs", "export const sharedArticleTokens = { text: '#475569' };\n"],
    ["src/rendering/article-tokens.mjs", "export function resolveArticleTokens(tokens) { return tokens; }\n"],
    ["test/article-tokens.test.mjs", "// Public contract test intentionally omits tenant ownership.\n"]
  ]);
  await Promise.all([...files].map(async ([relative, source]) => {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source, "utf8");
  }));
}

async function createLargeFixture(root) {
  const sourceRoot = path.join(root, "src");
  const noiseRoot = path.join(root, "noise");
  await Promise.all([mkdir(sourceRoot, { recursive: true }), mkdir(noiseRoot, { recursive: true })]);
  await Promise.all([
    writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "currency-fixture", private: true, type: "module" }, null, 2)}\n`,
      "utf8"
    ),
    writeFile(
      path.join(sourceRoot, "format-currency.mjs"),
      "export function formatCurrency(value) { return `$${value.toFixed(2)}`; }\n",
      "utf8"
    ),
    ...Array.from({ length: 240 }, (_, index) => writeFile(
      path.join(noiseRoot, `module-${String(index).padStart(3, "0")}.ts`),
      `export const unrelatedValue${index} = ${index};\n`,
      "utf8"
    ))
  ]);
  const noiseFiles = await readdir(noiseRoot);
  assert.equal(noiseFiles.length, 240);
}

function initializeGitFixture(root) {
  run("git", ["init", "--initial-branch=main"], { cwd: root });
  run("git", ["add", "--all"], { cwd: root });
  run(
    "git",
    [
      "-c",
      "user.name=Vertex Palace Release Candidate",
      "-c",
      "user.email=release-candidate@example.invalid",
      "commit",
      "-m",
      "fixture baseline"
    ],
    { cwd: root }
  );
}

function parsePackMetadata(stdout) {
  const start = stdout.indexOf("[");
  const end = stdout.lastIndexOf("]");
  assert.ok(start >= 0 && end >= start, `npm pack did not return JSON: ${stdout}`);
  const entries = JSON.parse(stdout.slice(start, end + 1));
  assert.equal(entries.length, 1);
  return entries[0];
}

function parseMarkdownPayloadMetrics(markdown) {
  const payload = markdown.match(/Calls: \d+ \| Bytes: (\d+) \| Estimated tokens: (\d+)/);
  const ceiling = markdown.match(/Estimated context cost: \d+ \/ (\d+) token ceiling/);
  assert.ok(payload, "Markdown output is missing measured payload metrics.");
  assert.ok(ceiling, "Markdown output is missing its selected context ceiling.");
  return {
    contextBytes: Number(payload[1]),
    contextEstimatedTokens: Number(payload[2]),
    maxContextTokens: Number(ceiling[1])
  };
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  if (index < 0) return undefined;
  assert.ok(args[index + 1], "--out requires a repository-relative path.");
  const target = path.resolve(projectRoot, args[index + 1]);
  assert.ok(target.startsWith(`${projectRoot}${path.sep}`), "--out must stay inside the repository.");
  return target;
}

function runNpm(args, options) {
  if (process.platform === "win32") {
    const commandLine = `npm ${args.map(quoteCmdArgument).join(" ")}`;
    return run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], options);
  }
  return run("npm", args, options);
}

function runNode(args, options) {
  return run(process.execPath, args, options);
}

function quoteCmdArgument(value) {
  const text = String(value);
  assert.ok(!text.includes('"'), "Release-candidate command arguments must not contain quotes.");
  return /\s/.test(text) ? `"${text}"` : text;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    shell: options.shell ?? false,
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(" ")}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join("\n"));
  }
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}
