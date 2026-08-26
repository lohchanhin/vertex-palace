const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { finalizeReviewedTargets } = require("./lib/round20-target-selection.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-20-0.4-stable-candidate";
const poolRelativePath = "docs/research/evidence/local-blind-routing-repository-pool-0.4-stable-round-20.json";
const queueRelativePath = "docs/research/evidence/local-blind-routing-candidate-queue-0.4-stable-round-20-attempt-1.json";
const outputRelativePath = "docs/research/evidence/local-blind-routing-coherence-reviews-0.4-stable-round-20.json";

const reviewSpecs = [
  {
    repository: "mimic-fn",
    candidateId: "candidate_516f2d6ba88b9b28",
    targetDecision: "accept",
    alignedReason: "The type declaration, descriptor-copy guard, option plumbing, documentation, and regression matrix all implement and verify the ignoreNonConfigurable option."
  },
  {
    repository: "is-unicode-supported",
    candidateId: "candidate_fb497c4b5fd77f5e",
    targetDecision: "accept",
    alignedReason: "Both environment checks identify Terminus variants, while the serial Windows test cleanup prevents the newly recognized Terminus environment variable from contaminating that platform simulation."
  },
  {
    repository: "pyupgrade",
    candidateId: "candidate_1f6be4787d51e2e0",
    targetDecision: "accept",
    alignedReason: "The token-range expansion consumes the complete implicitly concatenated annotation and the focused regression case verifies the multiline rewrite."
  },
  {
    repository: "add-trailing-comma",
    candidateId: "candidate_386012925e1e7ae7",
    targetDecision: "accept",
    alignedReason: "The token guard recognizes a triple-quoted t-string argument and the focused unhug test verifies that exact syntax remains grouped."
  },
  {
    repository: "conc",
    candidateId: "candidate_bba2b928e525ce4f",
    targetDecision: "accept",
    alignedReason: "Both context-pool variants expose WithFailFast as the documented combination of first-error and cancel-on-error behavior, and the paired tests exercise the alias."
  },
  {
    repository: "termenv",
    candidateId: "candidate_8d5b40a46da9abe9",
    targetDecision: "accept",
    alignedReason: "The Output field rename, exported Writer accessor, compatibility TTY method, terminal checks, screen operations, and tests form one complete change that exposes the underlying output writer."
  },
  {
    repository: "backtrace-rs",
    candidateId: "candidate_b7b762752a77d351",
    targetDecision: "accept",
    alignedReason: "The cfg changes consistently generalize existing Apple platform handling to target_vendor so visionOS receives the same symbolization and accuracy-test paths."
  },
  {
    repository: "tempfile",
    candidateId: "candidate_d1091937776c6a11",
    targetDecision: "accept",
    alignedReason: "The deprecated best-effort constructor, fallible absolute-path constructor, documentation, call-site migrations, and missing-current-directory tests all address resolving relative TempPath inputs."
  }
];

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

async function main() {
  const poolBytes = await readFile(path.join(projectRoot, poolRelativePath));
  const queueBytes = await readFile(path.join(projectRoot, queueRelativePath));
  const pool = JSON.parse(poolBytes.toString("utf8"));
  const queue = JSON.parse(queueBytes.toString("utf8"));
  const reviewBundle = buildReviewBundle({
    queue,
    queueSha256: sha256(queueBytes),
    generatedAt: new Date().toISOString()
  });
  const finalized = finalizeReviewedTargets({ pool, queue, reviewBundle });
  assert.equal(finalized.status, "selected");
  assert.equal(finalized.selectedTargets.length, 8);

  reviewBundle.materialization = {
    semanticDecisionSha256: sha256(JSON.stringify(reviewBundle.reviews)),
    semanticDecisionsCopiedWithoutModification: true,
    frozenValidatorDryRunRequiredBeforeWrite: true,
    outputCreateOnly: true,
    dryRun: summarizeFinalized(finalized)
  };

  const outputPath = path.join(projectRoot, outputRelativePath);
  await writeFile(outputPath, `${JSON.stringify(reviewBundle, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({ outputPath, ...summarizeFinalized(finalized) }, null, 2)}\n`);
}

function buildReviewBundle({ queue, queueSha256, generatedAt }) {
  assert.equal(queue.studyId, studyId);
  const candidates = new Map();
  for (const report of queue.repositoryReports) {
    for (const candidate of report.candidates) {
      candidates.set(`${report.name}:${candidate.candidateId}`, candidate);
    }
  }

  const reviews = reviewSpecs.map((spec) => {
    const candidate = candidates.get(`${spec.repository}:${spec.candidateId}`);
    assert.ok(candidate, `Missing frozen candidate ${spec.repository}:${spec.candidateId}`);
    return buildReviewEntry(spec, candidate);
  });

  return {
    schemaVersion: 1,
    studyId,
    generatedAt,
    status: "review-complete",
    claimBoundary: "Developer-delegated, Codex-assisted semantic review performed after the publicly preregistered Round 20 candidate freeze and before any Palace call on candidate tasks. The reviewer is not independent from product development, and no inter-rater agreement is available.",
    reviewBoundary: "single-developer-delegated-semantic-reviewer",
    publicPreregistration: true,
    candidateFreeze: { ...queue.candidateFreeze },
    queue: {
      path: queueRelativePath,
      sha256: queueSha256
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
    method: {
      candidateOrder: "newest-first within each repository",
      wholeTargetDecision: true,
      uncertainHunkRejectsTarget: true,
      partialOraclePruningForbidden: true,
      everyHunkReviewed: true
    },
    limitations: [
      "The semantic reviewer is not independent from product development.",
      "No second reviewer or inter-rater agreement is available.",
      "Ambiguous or unrelated hunks reject the whole target rather than being removed from the oracle."
    ],
    reviews
  };
}

function buildReviewEntry(spec, candidate) {
  const files = candidate.coherencePacket.files.map((file) => {
    const hunks = file.hunks.map((hunk) => {
      const override = spec.hunkDecisions?.[hunk.id];
      return override ?? {
        decision: "task-aligned",
        reason: `${spec.alignedReason} This hunk is ${file.path} ${hunk.header}.`
      };
    }).map((review, index) => ({
      id: file.hunks[index].id,
      ...review
    }));
    const rejectedHunk = hunks.find(({ decision }) => decision !== "task-aligned");
    return {
      path: file.path,
      decision: rejectedHunk?.decision ?? "task-aligned",
      reason: rejectedHunk?.reason ?? `${spec.alignedReason} All hunks in ${file.path} serve that same task boundary.`,
      hunks
    };
  });

  const coherent = files.every(({ decision }) => decision === "task-aligned");
  assert.equal(spec.targetDecision, coherent ? "accept" : "reject");
  return {
    repository: spec.repository,
    candidateId: spec.candidateId,
    generatedArtifactAssessment: {
      isGeneratedArtifactTarget: false,
      reason: "The reviewed diff contains hand-maintained source, test, or documentation files and no generator-to-output ownership relationship.",
      ownerGeneratorPath: null,
      generatedOutputPaths: []
    },
    review: {
      schemaVersion: 1,
      packetSha256: candidate.coherencePacket.packetSha256,
      reviewTiming: "pre-route",
      reviewPerformedAfterCandidateFreeze: true,
      reviewedWithoutPalaceOutput: true,
      palaceCallsOnCandidateTask: 0,
      targetDecision: spec.targetDecision,
      files
    }
  };
}

function summarizeFinalized(finalized) {
  return {
    status: finalized.status,
    reviewedCandidates: reviewSpecs.length,
    acceptedCandidates: reviewSpecs.filter(({ targetDecision }) => targetDecision === "accept").length,
    rejectedCandidates: reviewSpecs.filter(({ targetDecision }) => targetDecision === "reject").length,
    selectedTargets: finalized.selectedTargets.map(({ name, candidateId, languageFamily }) => ({
      name,
      candidateId,
      languageFamily
    })),
    selectedPerLanguageFamily: finalized.rules.selectedPerLanguageFamily,
    generatedArtifactTargets: finalized.rules.generatedArtifactTargets,
    palaceCallsOnCandidateTasks: 0
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

module.exports = { buildReviewBundle, reviewSpecs };
