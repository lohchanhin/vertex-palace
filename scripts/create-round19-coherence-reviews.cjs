const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { finalizeReviewedTargets } = require("./lib/round19-target-selection.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-19-0.4-alpha";
const poolRelativePath = "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-19.json";
const queueRelativePath = "docs/research/evidence/local-blind-routing-candidate-queue-0.4-alpha-round-19-attempt-2.json";
const outputRelativePath = "docs/research/evidence/local-blind-routing-coherence-reviews-0.4-alpha-round-19.json";

const reviewSpecs = [
  {
    repository: "cors",
    candidateId: "candidate_32a96f45d24b4e39",
    targetDecision: "accept",
    alignedReason: "The changelog entry, maxAge conversion guard, and regression test all address preserving the numeric zero option without another behavior change."
  },
  {
    repository: "hoek",
    candidateId: "candidate_9c1da3bb6a972b14",
    targetDecision: "accept",
    alignedReason: "The structured-clone guard excludes legacy Util.inherit error subclasses, the adjacent spacing follows that edited branch, and the tests exercise ordinary and legacy error cloning."
  },
  {
    repository: "jaraco-path",
    candidateId: "candidate_3606ee38fd7fd442",
    targetDecision: "accept",
    alignedReason: "Every edit resolves the stated Ruff findings: warning stack level, missing test assertions, or explicit exception chaining."
  },
  {
    repository: "iniconfig",
    candidateId: "candidate_6b971c131e163482",
    targetDecision: "reject",
    alignedReason: "The SectionWrapper proxy and its assertions directly implement and verify lineof delegation.",
    hunkDecisions: {
      hunk_61d8a41556334cfd: {
        decision: "uncertain",
        reason: "Changing the public __version__ value from 0.2.dev0 to 0.2.dev2 is release metadata with observable behavior and is not required to add the lineof proxy."
      }
    }
  },
  {
    repository: "iniconfig",
    candidateId: "candidate_48b7458ede97d311",
    targetDecision: "reject",
    alignedReason: "Removing the bracket rejection and adjusting its positive and negative parser cases directly allows a closing bracket at the end of a value.",
    hunkDecisions: {
      hunk_a9c158326d4187fc: {
        decision: "unrelated",
        reason: "Deleting the README placeholder about a dictionary interface neither documents nor implements allowing a closing bracket at the end of a parsed value."
      }
    }
  },
  {
    repository: "iniconfig",
    candidateId: "candidate_26ef0eeb502a5921",
    targetDecision: "accept",
    alignedReason: "The implementation changes displayed parser line numbers from zero-based to the common one-based convention and the paired test updates that exact expectation."
  },
  {
    repository: "pretty",
    candidateId: "candidate_6abe040c5620a2b3",
    targetDecision: "accept",
    alignedReason: "The source retains the formatted buffer, isolates duplicate-key values, removes obsolete debug output, and the tests verify deterministic value ordering for duplicate keys.",
    hunkDecisions: {
      hunk_c3db4e4c7f3dc9d9: {
        decision: "task-aligned",
        reason: "This removes the blank separator left when the adjacent duplicate-key debug-print block is replaced; it is coupled formatting inside the same sorting repair."
      }
    }
  },
  {
    repository: "groupcache",
    candidateId: "candidate_d4665b9c0bd4605e",
    targetDecision: "accept",
    alignedReason: "Each changed comment is rewritten to begin with the exact exported function or test name, matching the Effective Go convention named by the task."
  },
  {
    repository: "semver",
    candidateId: "candidate_12bbaded378415f8",
    targetDecision: "accept",
    alignedReason: "The new Empty error kind, early parse guard, display message, and assertion form one complete dedicated empty-version error path."
  },
  {
    repository: "cc-rs",
    candidateId: "candidate_fb544c22b29f1170",
    targetDecision: "accept",
    alignedReason: "The target inference now emits neon instead of neon-vfpv4 and the focused test checks both the required and forbidden compiler flags across affected targets."
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
    claimBoundary: "Developer-delegated, Codex-assisted semantic review performed after the Round 19 candidate freeze and before any Palace call on candidate tasks. The reviewer is not independent from product development, and no inter-rater agreement is available.",
    reviewBoundary: "single-developer-delegated-semantic-reviewer",
    publicPreregistration: false,
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
