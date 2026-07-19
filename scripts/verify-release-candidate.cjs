const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, readdir, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const packageJson = require(path.join(projectRoot, "package.json"));
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

  try {
    await Promise.all([mkdir(packRoot), mkdir(installRoot), mkdir(fixtureRoot)]);
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

    const mcp = runNode([path.join(projectRoot, "scripts", "smoke-mcp.cjs"), mcpPath], { cwd: fixtureRoot });
    const report = {
      package: `${metadata.name}@${metadata.version}`,
      files: metadata.files.length,
      shasum,
      cleanInstallVersion: version,
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
      installedMcp: mcp.stdout.trim()
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    if (process.env.KEEP_RELEASE_CANDIDATE_TEMP === "1") {
      process.stderr.write(`Kept release-candidate fixture at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
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

function parsePackMetadata(stdout) {
  const start = stdout.indexOf("[");
  const end = stdout.lastIndexOf("]");
  assert.ok(start >= 0 && end >= start, `npm pack did not return JSON: ${stdout}`);
  const entries = JSON.parse(stdout.slice(start, end + 1));
  assert.equal(entries.length, 1);
  return entries[0];
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
