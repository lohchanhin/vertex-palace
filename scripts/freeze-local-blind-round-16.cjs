const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const {
  hashSourceTree,
  sha256Bytes,
  sha256File,
  validateRepositoryPool
} = require("./lib/local-blind-freeze.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-16-0.4-alpha";
const freezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-16.json";
const poolRelativePath = "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-16.json";
const failedHeadEvidenceRelativePaths = [
  "docs/research/evidence/local-blind-routing-repository-head-verification-attempt-1-failure-0.4-alpha-round-16.json",
  "docs/research/evidence/local-blind-routing-repository-head-verification-attempt-2-failure-0.4-alpha-round-16.json"
];
const headEvidenceRelativePath = "docs/research/evidence/local-blind-routing-repository-head-verification-0.4-alpha-round-16.json";
const failedVerificationRelativePaths = [];
const verificationRelativePath = "docs/research/evidence/local-blind-routing-prefreeze-verification-0.4-alpha-round-16.json";
const round12FreezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-12.json";
const artifactPaths = [
  "docs/research/LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_16.md",
  "docs/zh-CN/LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_16.md",
  "docs/research/evidence/local-blind-routing-repository-plan-0.4-alpha-round-16.json",
  poolRelativePath,
  ...failedHeadEvidenceRelativePaths,
  headEvidenceRelativePath,
  ...failedVerificationRelativePaths,
  verificationRelativePath,
  "scripts/freeze-local-blind-repository-pool-round-16.cjs",
  "scripts/prepare-local-blind-routing-candidates-round-16.cjs",
  "scripts/finalize-local-blind-routing-targets-round-16.cjs",
  "scripts/verify-round16-prefreeze.cjs",
  "scripts/freeze-local-blind-round-16.cjs",
  "scripts/lib/commit-task-classifier.cjs",
  "scripts/lib/held-out-file-surfaces.cjs",
  "scripts/lib/task-diff-coherence.cjs",
  "scripts/lib/local-blind-freeze.cjs",
  "scripts/lib/round16-target-selection.cjs",
  "scripts/test/task-diff-coherence.test.cjs",
  "scripts/test/round16-task-diff-coherence-protocol.test.cjs",
  "scripts/test/round16-target-selection.test.cjs",
  "scripts/test/round16-candidate-queue.test.cjs",
  "scripts/test/round16-repository-pool.test.cjs",
  "scripts/test/round16-local-blind-selection-freeze.test.cjs",
  "docs/research/CONFIDENCE_EVIDENCE_GATE_ROUND_15_RESULT_0_4_ALPHA.md",
  "docs/zh-CN/CONFIDENCE_EVIDENCE_GATE_ROUND_15_RESULT_0_4_ALPHA.md",
  "docs/research/evidence/confidence-evidence-gate-round-15-self-audit-0.4-alpha.json",
  "scripts/test/round15-confidence-evidence-gate.test.cjs"
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const outputPath = outputArgument(process.argv.slice(2));
  const poolBytes = await readFile(path.join(projectRoot, poolRelativePath));
  const pool = JSON.parse(poolBytes.toString("utf8"));
  await validateRepositoryPool({
    root: projectRoot,
    pool,
    studyId,
    freezeRelativePath
  });

  const headEvidenceBytes = await readFile(path.join(projectRoot, headEvidenceRelativePath));
  const headEvidence = JSON.parse(headEvidenceBytes.toString("utf8"));
  assert.equal(headEvidence.status, "verified");
  assert.equal(headEvidence.commitHistoryInspected, false);
  assert.equal(headEvidence.candidateTaskInspected, false);
  assert.equal(headEvidence.palaceCallsOnCandidateTasks, 0);
  assert.equal(headEvidence.repositories.length, pool.repositoryPool.length);
  for (let index = 0; index < pool.repositoryPool.length; index += 1) {
    assert.equal(headEvidence.repositories[index].name, pool.repositoryPool[index].name);
    assert.equal(headEvidence.repositories[index].observedHead, pool.repositoryPool[index].pinnedHead);
    assert.equal(headEvidence.repositories[index].matchedFrozenPool, true);
    assert.ok(headEvidence.repositories[index].attempts >= 1);
    assert.ok(headEvidence.repositories[index].attempts <= 3);
  }
  const failedHeadEvidence = [];
  for (const failedPath of failedHeadEvidenceRelativePaths) {
    const bytes = await readFile(path.join(projectRoot, failedPath));
    const evidence = JSON.parse(bytes.toString("utf8"));
    assert.equal(evidence.status, "verification-failed");
    assert.equal(evidence.commitHistoryInspected, false);
    assert.equal(evidence.candidateTaskInspected, false);
    assert.equal(evidence.palaceCallsOnCandidateTasks, 0);
    failedHeadEvidence.push({ path: failedPath, bytes, evidence });
  }

  const verificationBytes = await readFile(path.join(projectRoot, verificationRelativePath));
  const verification = JSON.parse(verificationBytes.toString("utf8"));
  assert.equal(verification.status, "passed");
  assert.equal(verification.results.length, 6);
  assert.ok(verification.results.every(({ status }) => status === "passed"));
  const failedVerifications = [];
  for (const failedPath of failedVerificationRelativePaths) {
    const bytes = await readFile(path.join(projectRoot, failedPath));
    const evidence = JSON.parse(bytes.toString("utf8"));
    assert.equal(evidence.status, "failed");
    assert.equal(evidence.results[0].status, "passed");
    assert.equal(evidence.results[1].status, "execution-error");
    failedVerifications.push({ path: failedPath, bytes, evidence });
  }

  const baseCommit = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  assert.equal(baseCommit, verification.gitBaseCommit);
  const sourceTree = await hashSourceTree(projectRoot);
  const cliPath = "dist/palace.cjs";
  const generatedMcpPath = "plugins/vertex-palace/mcp/server.cjs";
  const cliSha256 = await sha256File(path.join(projectRoot, cliPath));
  const generatedMcpSha256 = await sha256File(path.join(projectRoot, generatedMcpPath));
  assert.deepEqual(sourceTree, verification.candidate.sourceTree);
  assert.equal(cliSha256, verification.candidate.cliSha256);
  assert.equal(generatedMcpSha256, verification.candidate.generatedMcpSha256);

  const round12FreezeBytes = await readFile(path.join(projectRoot, round12FreezeRelativePath));
  const round12Freeze = JSON.parse(round12FreezeBytes.toString("utf8"));
  assert.equal(round12Freeze.comparisonBaseline.productCommit, baseCommit);
  run("git", ["cat-file", "-e", `${round12Freeze.comparisonBaseline.productCommit}^{commit}`]);

  const artifacts = {};
  for (const relativePath of artifactPaths) {
    artifacts[relativePath] = await sha256File(path.join(projectRoot, relativePath));
  }

  const freeze = {
    schemaVersion: 1,
    studyId,
    status: "locally-frozen",
    frozenAt: new Date().toISOString(),
    publicPreregistration: false,
    claimBoundary: "Tamper-evident local freeze created after URL-and-HEAD-only pool verification and before any Round 16 repository history, subject, diff, task, coherence review, oracle, or Palace result was inspected. It is not public preregistration and cannot establish Agent correctness, Token savings, tool-call reduction, or wall-time improvement.",
    competitionFreeze: {
      noCommit: true,
      noPush: true,
      noTag: true,
      noNpmPublish: true,
      reason: "Do not alter submitted project materials until competition results are announced."
    },
    candidate: {
      role: "post-round-15-evidence-closure-candidate",
      baseCommit,
      sourceState: "uncommitted-local-working-tree-frozen-by-content-hash",
      cliPath,
      cliSha256,
      generatedMcpPath,
      generatedMcpSha256,
      sourceTree,
      buildCommand: "pnpm build"
    },
    comparisonBaseline: {
      ...round12Freeze.comparisonBaseline,
      provenance: {
        path: round12FreezeRelativePath,
        sha256: sha256Bytes(round12FreezeBytes)
      }
    },
    preFreezeEvidence: {
      repositoryHeads: {
        path: headEvidenceRelativePath,
        sha256: sha256Bytes(headEvidenceBytes),
        matchedRepositories: headEvidence.repositories.length,
        failedAttempts: failedHeadEvidence.map(({ path: failedPath, bytes }) => ({
          path: failedPath,
          sha256: sha256Bytes(bytes),
          category: JSON.parse(bytes.toString("utf8")).category,
          commitHistoryInspected: false,
          palaceCallsOnCandidateTasks: 0
        }))
      },
      verification: {
        path: verificationRelativePath,
        sha256: sha256Bytes(verificationBytes),
        commandsPassed: verification.results.length
      },
      failedAttempts: failedVerifications.map(({ path: failedPath, bytes }, index) => ({
        path: failedPath,
        sha256: sha256Bytes(bytes),
        category: index === 0
          ? "windows-package-manager-command-not-found-harness-error"
          : "windows-direct-cmd-spawn-einval-harness-error",
        productCommandsStarted: 0
      }))
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
  await writeFile(outputPath, `${JSON.stringify(freeze, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: freeze.status,
    frozenAt: freeze.frozenAt,
    sourceTree,
    cliSha256,
    generatedMcpSha256,
    artifactCount: Object.keys(artifacts).length,
    competitionFreeze: freeze.competitionFreeze
  }, null, 2)}\n`);
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0, "--out is required");
  assert.ok(args[index + 1], "--out requires a repository-relative path");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.equal(resolved, path.join(projectRoot, freezeRelativePath), "Round 16 freeze must use its canonical path");
  return resolved;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
    timeout: 120_000,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([result.stdout?.trim(), result.stderr?.trim()].filter(Boolean).join("\n"));
  }
  return result;
}

