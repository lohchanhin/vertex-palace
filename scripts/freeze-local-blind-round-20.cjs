const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  hashSourceTree,
  sha256Bytes,
  sha256File,
  validateRepositoryPool
} = require("./lib/local-blind-freeze.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-20-0.4-stable-candidate";
const planRelativePath = "docs/research/evidence/local-blind-routing-repository-plan-0.4-stable-round-20.json";
const poolRelativePath = "docs/research/evidence/local-blind-routing-repository-pool-0.4-stable-round-20.json";
const headRelativePath = "docs/research/evidence/local-blind-routing-repository-head-verification-0.4-stable-round-20.json";
const freezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-stable-round-20.json";
const candidateVersion = "0.4.0-alpha.1";
const baselineVersion = "0.3.0";
const artifactPaths = [
  "docs/research/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_STABLE_ROUND_20.md",
  "docs/zh-CN/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_STABLE_ROUND_20.md",
  planRelativePath,
  poolRelativePath,
  headRelativePath,
  "scripts/freeze-local-blind-repository-pool-round-20.cjs",
  "scripts/freeze-local-blind-round-20.cjs",
  "scripts/prepare-local-blind-routing-candidates-round-20.cjs",
  "scripts/finalize-local-blind-routing-targets-round-20.cjs",
  "scripts/freeze-local-blind-validation-round-20.cjs",
  "scripts/verify-local-blind-routing-round-20.cjs",
  "scripts/lib/commit-task-classifier.cjs",
  "scripts/lib/held-out-file-surfaces.cjs",
  "scripts/lib/local-blind-freeze.cjs",
  "scripts/lib/round20-target-selection.cjs",
  "scripts/lib/task-diff-coherence.cjs",
  "scripts/test/round20-preregistration.test.cjs"
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const outputPath = outputArgument(process.argv.slice(2));
  const planBytes = await readFile(path.join(projectRoot, planRelativePath));
  const poolBytes = await readFile(path.join(projectRoot, poolRelativePath));
  const headBytes = await readFile(path.join(projectRoot, headRelativePath));
  const plan = JSON.parse(planBytes.toString("utf8"));
  const pool = JSON.parse(poolBytes.toString("utf8"));
  const head = JSON.parse(headBytes.toString("utf8"));

  assert.equal(plan.studyId, studyId);
  assert.equal(plan.publicPreregistration, true);
  assert.equal(pool.studyId, studyId);
  assert.equal(pool.publicPreregistration, true);
  assert.equal(head.studyId, studyId);
  assert.equal(head.status, "verified");
  assert.equal(head.commitHistoryInspected, false);
  assert.equal(head.candidateTaskInspected, false);
  assert.equal(head.palaceCallsOnCandidateTasks, 0);
  await validateRepositoryPool({ root: projectRoot, pool, studyId, freezeRelativePath });

  const researchCommit = run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim();
  assert.equal(run("git", ["status", "--porcelain"], { cwd: projectRoot }).stdout.trim(), "");
  const candidateProductCommit = run("git", ["rev-parse", "v0.4.0-alpha.1^{commit}"], { cwd: projectRoot }).stdout.trim();
  const baselineProductCommit = run("git", ["rev-parse", "v0.3.0^{commit}"], { cwd: projectRoot }).stdout.trim();
  const sourceTree = await hashSourceTree(projectRoot);
  const cliPath = "dist/palace.cjs";
  const generatedMcpPath = "plugins/vertex-palace/mcp/server.cjs";
  const localCliSha256 = await sha256File(path.join(projectRoot, cliPath));
  const localMcpSha256 = await sha256File(path.join(projectRoot, generatedMcpPath));

  const candidateRegistry = npmMetadata(candidateVersion);
  const baselineRegistry = npmMetadata(baselineVersion);
  assert.equal(candidateRegistry.version, candidateVersion);
  assert.equal(candidateRegistry.shasum, plan.products.candidate.npmShasum);
  assert.equal(baselineRegistry.version, baselineVersion);

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-round20-product-freeze-"));
  let candidateInstall;
  let baselineInstall;
  try {
    candidateInstall = await installPublicPackage(temporaryRoot, "candidate", candidateVersion);
    baselineInstall = await installPublicPackage(temporaryRoot, "baseline", baselineVersion);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  assert.equal(candidateInstall.cliSha256, localCliSha256, "Published alpha CLI differs from the frozen local CLI");
  assert.equal(candidateInstall.mcpSha256, localMcpSha256, "Published alpha MCP differs from the frozen local MCP");

  const artifacts = {};
  for (const relativePath of artifactPaths) {
    artifacts[relativePath] = await sha256File(path.join(projectRoot, relativePath));
  }

  const freeze = {
    schemaVersion: 1,
    studyId,
    status: "publicly-preregistered-product-freeze",
    frozenAt: new Date().toISOString(),
    publicPreregistration: true,
    claimBoundary: "The immutable public 0.4 alpha and 0.3 stable packages, product artifacts, repository pool, selectors, validator, gates, and execution order were frozen before any Round 20 commit history, task, diff, oracle, semantic review, or Palace result was inspected.",
    candidate: {
      role: "public-0.4-alpha-stable-candidate",
      package: `vertex-palace@${candidateVersion}`,
      version: candidateVersion,
      productCommit: candidateProductCommit,
      researchCommit,
      sourceState: "immutable-public-npm-package-matched-to-local-build",
      cliPath,
      cliSha256: localCliSha256,
      generatedMcpPath,
      generatedMcpSha256: localMcpSha256,
      sourceTree,
      registry: candidateRegistry,
      cleanInstall: candidateInstall
    },
    comparisonBaseline: {
      role: "public-0.3-stable-baseline",
      package: `vertex-palace@${baselineVersion}`,
      version: baselineVersion,
      productCommit: baselineProductCommit,
      cliPath: "dist/palace.cjs",
      cliSha256: baselineInstall.cliSha256,
      generatedMcpPath: "plugins/vertex-palace/mcp/server.cjs",
      generatedMcpSha256: baselineInstall.mcpSha256,
      registry: baselineRegistry,
      installContract: "public-registry-clean-install"
    },
    inputs: {
      plan: { path: planRelativePath, sha256: sha256Bytes(planBytes) },
      repositoryPool: { path: poolRelativePath, sha256: sha256Bytes(poolBytes) },
      headVerification: { path: headRelativePath, sha256: sha256Bytes(headBytes) }
    },
    artifacts,
    selectionRules: {
      candidateTaskHistoryObservedBeforeFreeze: false,
      candidateTaskDiffObservedBeforeFreeze: false,
      palaceCallsOnCandidateTasksBeforeFreeze: 0,
      mechanicalCandidatesPerRepositoryMaximum: pool.rules.maximumMechanicalCandidatesPerRepository,
      newestFirstReviewOrder: true,
      familyQuotaStopsLaterReviews: true,
      wholeTargetSemanticReviewRequired: true,
      uncertainHunkRejectsWholeTarget: true,
      partialOraclePruningForbidden: true,
      resultCreateOnly: true,
      productChangesForbiddenUntilFirstResultPreserved: true
    }
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(freeze, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: freeze.status,
    candidate: { version: candidateVersion, cliSha256: localCliSha256 },
    baseline: { version: baselineVersion, cliSha256: baselineInstall.cliSha256 },
    sourceTree,
    artifactCount: Object.keys(artifacts).length
  }, null, 2)}\n`);
}

function npmMetadata(version) {
  const result = runNpm(["view", `vertex-palace@${version}`, "version", "dist.shasum", "dist.integrity", "--json"], {
    cwd: projectRoot,
    timeout: 120_000
  });
  const parsed = JSON.parse(result.stdout);
  return {
    registry: "https://registry.npmjs.org/",
    version: parsed.version,
    shasum: parsed["dist.shasum"],
    integrity: parsed["dist.integrity"]
  };
}

async function installPublicPackage(temporaryRoot, name, version) {
  const root = path.join(temporaryRoot, name);
  await mkdir(root, { recursive: true });
  runNpm(["init", "-y"], { cwd: root });
  runNpm([
    "install",
    "--registry=https://registry.npmjs.org",
    "--prefer-online",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--cache", path.join(root, "npm-cache"),
    `vertex-palace@${version}`
  ], { cwd: root, timeout: 300_000 });
  const packageRoot = path.join(root, "node_modules", "vertex-palace");
  const installedVersion = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8")).version;
  assert.equal(installedVersion, version);
  return {
    version: installedVersion,
    cliSha256: await sha256File(path.join(packageRoot, "dist", "palace.cjs")),
    mcpSha256: await sha256File(path.join(packageRoot, "plugins", "vertex-palace", "mcp", "server.cjs"))
  };
}

function runNpm(args, options = {}) {
  if (process.platform !== "win32") return run("npm", args, options);
  const command = ["npm", ...args].map(quoteCmdArgument).join(" ");
  return run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", command], options);
}

function quoteCmdArgument(value) {
  const text = String(value);
  if (!/[\s"&|<>^()%!]/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0 && args[index + 1], "--out is required");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.equal(resolved, path.join(projectRoot, freezeRelativePath), "Round 20 freeze must use its canonical path");
  return resolved;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
    timeout: options.timeout ?? 120_000,
    windowsHide: true,
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(" ")}`,
      result.stdout?.trim(),
      result.stderr?.trim()
    ].filter(Boolean).join("\n"));
  }
  return result;
}
