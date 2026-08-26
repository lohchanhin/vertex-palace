const assert = require("node:assert/strict");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { assertCandidateFreeze, sha256Bytes } = require("./lib/local-blind-freeze.cjs");
const { finalizeReviewedTargets } = require("./lib/round12-target-selection.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-12-0.4-alpha";
const freezeRelativePath = "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-12.json";
const queueRelativePath = "docs/research/evidence/local-blind-routing-candidate-queue-0.4-alpha-round-12-attempt-1.json";
const poolRelativePath = "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-12.json";
const outputRelativePath = "docs/research/evidence/local-blind-routing-coherence-reviews-0.4-alpha-round-12.json";
const expectedFreezeSha256 = "D3B7BE55E1B80F964490A5E773E11AFCB97323A04E933AB30D131AAE6B48F406";
const expectedQueueSha256 = "0B6CDDCD91C34DF7A30F57AC1CF1E3B99A1180982FC6B0DE56B45075433047C9";

const reviewSpecifications = [
  accepted("candidate_e5cbbd9506b340fd"),
  rejected("candidate_288b0ea0516e3d32", {
    hunk_5f63347b3652dfe5: uncertain("Removing the base initializer can change object construction, and the diff does not establish that mypy strictness requires this runtime change."),
    hunk_8b721a61d3e60167: unrelated("Rewriting str.format as an f-string is an independent style cleanup, not a mypy strict finding."),
    hunk_4b97eded572f3bcd: uncertain("The equality implementation is behaviorally rewritten, and its necessity for the stated mypy task cannot be established from this diff."),
    hunk_2e4a15c7656afcf8: unrelated("Adding a documentation blank line is formatting cleanup independent of the mypy strict task."),
    hunk_7d027ccd3257fd98: unrelated("Changing the warning stacklevel alters runtime warning attribution and is not required by the stated mypy strict task."),
    hunk_0296f295c880f4e6: unrelated("Removing a local exception class and a lint suppression is cleanup outside the stated mypy strict findings."),
    hunk_dc1d6cf14990f75d: unrelated("Removing the time import participates in deleting the Jython compatibility path, an independent compatibility change."),
    hunk_bd66bc1e4fad3711: unrelated("This hunk removes Jython and PyPy compatibility flags while annotating a helper, so it mixes an independent compatibility change into the typing task."),
    hunk_317cc5fc97f88acd: unrelated("Changing garbage-collection handling from Jython-or-PyPy to PyPy-only is an independent runtime compatibility change."),
    hunk_9048d521074dd3e7: unrelated("Deleting the Jython timing workaround changes compatibility behavior and is unrelated to mypy strict findings."),
    hunk_adabdb91a180d8f2: unrelated("Removing the legacy receiver function-name assignment is compatibility cleanup outside the stated typing task."),
    hunk_e5d4d0f9a49a86f8: unrelated("Deleting the Jython-specific connection branch changes supported-runtime behavior and is unrelated to mypy strict findings.")
  }),
  rejected("candidate_8452d933662dc775", {
    hunk_9a6c0b8b125165b6: unrelated("Changing quote style in an existing parametrization is formatting-only and does not implement or verify customizable Signal.set_class behavior.")
  }),
  accepted("candidate_df72bc2e35f925d6"),
  accepted("candidate_dac9c856c6325158"),
  accepted("candidate_7f6480d8d3856a2d"),
  accepted("candidate_c0333816ecd11b2e"),
  accepted("candidate_d7176794c1d49db8"),
  accepted("candidate_daec93c07e5e3f21"),
  accepted("candidate_8f7e1b6272cbe60e")
];

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const outputPath = outputArgument(process.argv.slice(2));
  const { freezeSha256 } = await assertCandidateFreeze({
    root: projectRoot,
    freezePath: path.join(projectRoot, freezeRelativePath),
    studyId
  });
  assert.equal(freezeSha256, expectedFreezeSha256, "Round 12 candidate freeze identity changed");

  const [queueBytes, poolBytes] = await Promise.all([
    readFile(path.join(projectRoot, queueRelativePath)),
    readFile(path.join(projectRoot, poolRelativePath))
  ]);
  assert.equal(sha256Bytes(queueBytes), expectedQueueSha256, "Round 12 candidate queue identity changed");
  const queue = JSON.parse(queueBytes.toString("utf8"));
  const pool = JSON.parse(poolBytes.toString("utf8"));
  assert.equal(queue.studyId, studyId);
  assert.equal(queue.status, "candidate-queue-ready");
  assert.equal(queue.palaceCallsOnCandidateTasks, 0);

  const candidates = new Map(
    queue.repositoryReports.flatMap((report) => report.candidates.map((candidate) => [candidate.candidateId, candidate]))
  );
  const reviews = reviewSpecifications.map((specification) => materializeReview(candidates, specification));
  const baseBundle = {
    schemaVersion: 1,
    studyId,
    generatedAt: new Date().toISOString(),
    status: "review-complete",
    claimBoundary: "Developer-delegated, Codex-assisted semantic review performed after the Round 12 candidate freeze and before any Palace call on selected tasks. The reviewer is not independent from product development, and no inter-rater agreement is available.",
    reviewBoundary: "single-developer-delegated-semantic-reviewer",
    publicPreregistration: false,
    candidateFreeze: {
      path: freezeRelativePath,
      sha256: freezeSha256
    },
    queue: {
      path: queueRelativePath,
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
    reviews
  };

  const finalized = finalizeReviewedTargets({ pool, queue, reviewBundle: baseBundle });
  assert.equal(finalized.status, "selected", "Frozen stopping order did not yield all eight targets");
  const bundle = {
    ...baseBundle,
    materialization: {
      semanticDecisionSha256: sha256Bytes(Buffer.from(JSON.stringify(reviewSpecifications))),
      semanticDecisionsCopiedWithoutModification: true,
      frozenValidatorDryRunRequiredBeforeWrite: true,
      outputCreateOnly: true,
      dryRun: {
        status: finalized.status,
        reviewedCandidates: reviews.length,
        acceptedCandidates: reviews.filter(({ review }) => review.targetDecision === "accept").length,
        rejectedCandidates: reviews.filter(({ review }) => review.targetDecision === "reject").length,
        selectedTargets: finalized.selectedTargets.map(({ name, candidateId }) => ({ name, candidateId })),
        selectedPerLanguageFamily: finalized.rules.selectedPerLanguageFamily,
        generatedArtifactTargets: finalized.rules.generatedArtifactTargets
      }
    }
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: bundle.status,
    reviewedCandidates: reviews.length,
    acceptedCandidates: bundle.materialization.dryRun.acceptedCandidates,
    rejectedCandidates: bundle.materialization.dryRun.rejectedCandidates,
    selectedTargets: bundle.materialization.dryRun.selectedTargets,
    palaceCallsOnCandidateTasks: bundle.timing.palaceCallsOnCandidateTasks
  }, null, 2)}\n`);
}

function materializeReview(candidates, specification) {
  const candidate = candidates.get(specification.candidateId);
  assert.ok(candidate, `Unknown candidate: ${specification.candidateId}`);
  const files = candidate.coherencePacket.files.map((file) => {
    const hunks = file.hunks.map((hunk) => {
      const override = specification.overrides[hunk.id];
      return override ? { ...override, id: hunk.id } : {
        id: hunk.id,
        decision: "task-aligned",
        reason: `The change at ${hunk.header} in ${file.path} directly implements, verifies, or documents the frozen task: ${candidate.target.task}.`
      };
    });
    const rejectedHunks = hunks.filter(({ decision }) => decision !== "task-aligned");
    return {
      path: file.path,
      decision: rejectedHunks.length
        ? rejectedHunks.some(({ decision }) => decision === "unrelated") ? "unrelated" : "uncertain"
        : "task-aligned",
      reason: rejectedHunks.length
        ? `This file contains ${rejectedHunks.length} hunk(s) that are unrelated to or not provably required by the frozen task.`
        : "Every hunk in this file directly implements, verifies, or documents the frozen task without an independent behavior change.",
      hunks
    };
  });
  const coherent = files.every(({ decision }) => decision === "task-aligned");
  assert.equal(coherent, specification.targetDecision === "accept", `Decision mismatch for ${specification.candidateId}`);
  return {
    repository: candidate.target.name,
    candidateId: candidate.candidateId,
    generatedArtifactAssessment: {
      isGeneratedArtifactTarget: false,
      reason: "No generated artifact relationship appears in this candidate.",
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
      targetDecision: specification.targetDecision,
      files
    }
  };
}

function accepted(candidateId) {
  return { candidateId, targetDecision: "accept", overrides: {} };
}

function rejected(candidateId, overrides) {
  return { candidateId, targetDecision: "reject", overrides };
}

function unrelated(reason) {
  return { id: null, decision: "unrelated", reason };
}

function uncertain(reason) {
  return { id: null, decision: "uncertain", reason };
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0 && args[index + 1], "--out requires the canonical create-only review path");
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.equal(resolved, path.join(projectRoot, outputRelativePath));
  return resolved;
}
