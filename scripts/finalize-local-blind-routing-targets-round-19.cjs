const assert = require("node:assert/strict");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const {
  assertCandidateFreeze,
  sha256Bytes,
  validateRepositoryPool
} = require("./lib/local-blind-freeze.cjs");
const { finalizeReviewedTargets } = require("./lib/round19-target-selection.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-19-0.4-alpha";
const poolRelativePath = "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-19.json";
const freezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-19.json";
const poolPath = path.join(projectRoot, poolRelativePath);
const freezePath = path.join(projectRoot, freezeRelativePath);

if (require.main === module) {
  runMain().catch((error) => {
    process.stderr.write(`${summarizeError(error)}\n`);
    process.exitCode = 1;
  });
}

async function runMain() {
  const args = parseArguments(process.argv.slice(2));
  try {
    await main(args);
  } catch (error) {
    await preserveFailure(args.outputPath, error);
    throw error;
  }
}

async function main({ queuePath, reviewPath, outputPath }) {
  const { freeze, freezeSha256 } = await assertCandidateFreeze({
    root: projectRoot,
    freezePath,
    studyId
  });
  const poolBytes = await readFile(poolPath);
  const pool = JSON.parse(poolBytes.toString("utf8"));
  await validateRepositoryPool({
    root: projectRoot,
    pool,
    studyId,
    freezeRelativePath
  });

  const queueBytes = await readFile(queuePath);
  const queueSha256 = sha256Bytes(queueBytes);
  const queue = JSON.parse(queueBytes.toString("utf8"));
  const reviewBytes = await readFile(reviewPath);
  const reviewSha256 = sha256Bytes(reviewBytes);
  const reviewBundle = JSON.parse(reviewBytes.toString("utf8"));
  const queueRelativePath = repositoryRelativePath(queuePath);
  const reviewRelativePath = repositoryRelativePath(reviewPath);

  assert.equal(queue.candidateFreeze.path, freezeRelativePath);
  assert.equal(queue.candidateFreeze.sha256, freezeSha256);
  assert.equal(queue.repositoryPool.path, poolRelativePath);
  assert.equal(queue.repositoryPool.sha256, sha256Bytes(poolBytes));
  assert.equal(reviewBundle.queue.path, queueRelativePath);
  assert.equal(reviewBundle.queue.sha256, queueSha256);

  const finalized = finalizeReviewedTargets({ pool, queue, reviewBundle });
  const manifest = {
    schemaVersion: 1,
    studyId,
    generatedAt: new Date().toISOString(),
    status: finalized.status,
    claimBoundary: "Pre-route whole-target semantic selection only. Every selected target is the first coherent candidate in newest-first order for its repository, and the first two accepted repositories in frozen language-family order. This is not a Palace product result or public preregistration.",
    evidenceClass: "local-hash-frozen-task-coherent-target-selection",
    publicPreregistration: false,
    heldOutAgainstCandidate: true,
    candidate: freeze.candidate,
    comparisonBaseline: freeze.comparisonBaseline,
    localFreeze: {
      path: freezeRelativePath,
      sha256: freezeSha256,
      frozenAt: freeze.frozenAt,
      artifactHashesVerified: true
    },
    repositoryPool: {
      path: poolRelativePath,
      sha256: sha256Bytes(poolBytes)
    },
    candidateQueue: {
      path: queueRelativePath,
      sha256: queueSha256,
      palaceCallsOnCandidateTasks: queue.palaceCallsOnCandidateTasks
    },
    semanticReview: {
      path: reviewRelativePath,
      sha256: reviewSha256,
      boundary: reviewBundle.reviewBoundary,
      independent: reviewBundle.reviewer.independent,
      interRaterAgreementAvailable: reviewBundle.reviewer.interRaterAgreementAvailable,
      palaceCallsOnCandidateTasks: reviewBundle.timing.palaceCallsOnCandidateTasks
    },
    rules: {
      ...pool.rules,
      ...finalized.rules,
      outputCreateOnly: true
    },
    repositoryReports: finalized.repositoryReports,
    targets: finalized.selectedTargets
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: manifest.status,
    selectedTargets: manifest.targets.map(({ name, candidateId, languageFamily }) => ({
      name,
      candidateId,
      languageFamily
    })),
    selectedPerLanguageFamily: manifest.rules.selectedPerLanguageFamily,
    palaceCallsOnCandidateTasks: 0
  }, null, 2)}\n`);

  if (manifest.status !== "selected") process.exitCode = 1;
}

async function preserveFailure(outputPath, error) {
  try {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify({
      schemaVersion: 1,
      studyId,
      generatedAt: new Date().toISOString(),
      status: "target-finalization-failed",
      claimBoundary: "Unexpected target-finalization failure preserved before any Round 19 candidate task was sent to Palace.",
      palaceCallsOnCandidateTasks: 0,
      error: summarizeError(error)
    }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  } catch (preservationError) {
    process.stderr.write(`Could not preserve finalization failure: ${summarizeError(preservationError)}\n`);
  }
}

function parseArguments(args) {
  return {
    queuePath: requiredRepositoryPath(args, "--queue"),
    reviewPath: requiredRepositoryPath(args, "--reviews"),
    outputPath: requiredRepositoryPath(args, "--out")
  };
}

function requiredRepositoryPath(args, flag) {
  const index = args.indexOf(flag);
  assert.ok(index >= 0, `${flag} is required`);
  assert.ok(args[index + 1], `${flag} requires a repository-relative path`);
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), `${flag} must stay inside the repository`);
  return resolved;
}

function repositoryRelativePath(absolutePath) {
  const relative = path.relative(projectRoot, absolutePath);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  return relative.split(path.sep).join("/");
}

function summarizeError(error) {
  const text = error instanceof Error ? error.stack ?? error.message : String(error);
  return text.length <= 12_000 ? text : `${text.slice(0, 12_000)}\n...[truncated]`;
}

module.exports = { main, parseArguments };



