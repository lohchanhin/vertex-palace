const assert = require("node:assert/strict");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const {
  assertCandidateFreeze,
  sha256Bytes,
  validateRepositoryPool
} = require("../lib/local-blind-freeze.cjs");
const { finalizeReviewedTargets } = require("../lib/round11-target-selection.cjs");

const projectRoot = path.resolve(__dirname, "../..");
const studyId = "local-blind-routing-round-11-0.4-alpha";
const poolRelativePath = "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-11.json";
const freezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-11.json";

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const freezePath = path.join(projectRoot, freezeRelativePath);
  const { freezeSha256 } = await assertCandidateFreeze({ root: projectRoot, freezePath, studyId });
  const poolBytes = await readFile(path.join(projectRoot, poolRelativePath));
  const pool = JSON.parse(poolBytes.toString("utf8"));
  await validateRepositoryPool({ root: projectRoot, pool, studyId, freezeRelativePath });

  const queueBytes = await readFile(args.queuePath);
  const queue = JSON.parse(queueBytes.toString("utf8"));
  const draftBytes = await readFile(args.draftPath);
  const draft = JSON.parse(draftBytes.toString("utf8"));
  assert.equal(draft.studyId, studyId);

  const candidates = new Map();
  for (const report of queue.repositoryReports) {
    for (const candidate of report.candidates) {
      candidates.set(`${report.name}:${candidate.candidateId}`, candidate);
    }
  }
  const reviews = draft.reviews.map((entry) => {
    const candidate = candidates.get(`${entry.repository}:${entry.candidateId}`);
    assert.ok(candidate, `Draft references unknown candidate ${entry.repository}:${entry.candidateId}`);
    assert.equal(entry.packetSha256, candidate.coherencePacket.packetSha256);
    return {
      repository: entry.repository,
      candidateId: entry.candidateId,
      generatedArtifactAssessment: entry.generatedArtifactAssessment,
      review: {
        schemaVersion: 1,
        packetSha256: entry.packetSha256,
        reviewTiming: "pre-route",
        reviewPerformedAfterCandidateFreeze: true,
        reviewedWithoutPalaceOutput: true,
        palaceCallsOnCandidateTask: 0,
        targetDecision: entry.targetDecision,
        files: entry.files
      }
    };
  });

  const reviewBundle = {
    schemaVersion: 1,
    studyId,
    generatedAt: new Date().toISOString(),
    status: "review-complete",
    claimBoundary: "Developer-delegated, Codex-assisted semantic review performed after candidate freeze and before any Palace call on Round 11 tasks. The reviewer is not independent from product development, and no inter-rater agreement is available.",
    reviewBoundary: "single-developer-delegated-semantic-reviewer",
    publicPreregistration: false,
    candidateFreeze: {
      path: freezeRelativePath,
      sha256: freezeSha256
    },
    queue: {
      path: repositoryRelativePath(args.queuePath),
      sha256: sha256Bytes(queueBytes)
    },
    reviewer: {
      id: "developer-delegated-codex-semantic-reviewer-1",
      role: "product-developer-delegated-semantic-review",
      codexAssisted: true,
      independent: false,
      interRaterAgreementAvailable: false
    },
    timing: {
      candidateFrozenBeforeReview: true,
      reviewBeforeAnyPalaceCall: true,
      palaceCallsOnCandidateTasks: 0
    },
    limitations: [
      "The semantic reviewer is not independent from product development.",
      "No second reviewer or inter-rater agreement is available.",
      "Ambiguous hunks are rejected conservatively rather than adjudicated."
    ],
    materialization: {
      draftSha256: sha256Bytes(draftBytes),
      semanticDecisionsCopiedWithoutModification: true,
      frozenValidatorDryRunRequiredBeforeWrite: true,
      outputCreateOnly: true
    },
    reviews
  };

  const dryRun = finalizeReviewedTargets({ pool, queue, reviewBundle });
  assert.equal(dryRun.status, "selected");
  assert.equal(dryRun.selectedTargets.length, pool.rules.desiredTargets);
  reviewBundle.materialization.dryRun = {
    status: dryRun.status,
    reviewedCandidates: reviews.length,
    acceptedCandidates: reviews.filter(({ review }) => review.targetDecision === "accept").length,
    rejectedCandidates: reviews.filter(({ review }) => review.targetDecision === "reject").length,
    selectedTargets: dryRun.selectedTargets.map(({ name, candidateId }) => ({ name, candidateId })),
    selectedPerLanguageFamily: dryRun.rules.selectedPerLanguageFamily,
    generatedArtifactTargets: dryRun.rules.generatedArtifactTargets
  };

  await writeFile(args.outputPath, `${JSON.stringify(reviewBundle, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath: args.outputPath,
    status: reviewBundle.status,
    ...reviewBundle.materialization.dryRun,
    palaceCallsOnCandidateTasks: 0
  }, null, 2)}\n`);
}

function parseArguments(args) {
  return {
    queuePath: requiredPath(args, "--queue", true),
    draftPath: requiredPath(args, "--draft", false),
    outputPath: requiredPath(args, "--out", true)
  };
}

function requiredPath(args, flag, mustStayInRepository) {
  const index = args.indexOf(flag);
  assert.ok(index >= 0 && args[index + 1], `${flag} is required`);
  const resolved = path.resolve(projectRoot, args[index + 1]);
  if (mustStayInRepository) {
    assert.ok(resolved.startsWith(`${projectRoot}${path.sep}`), `${flag} must stay inside the repository`);
  }
  return resolved;
}

function repositoryRelativePath(absolutePath) {
  const relative = path.relative(projectRoot, absolutePath);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  return relative.split(path.sep).join("/");
}
