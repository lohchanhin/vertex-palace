// Replays the frozen, hunk-addressed semantic decisions recorded for Round 21.
const { createHash } = require("node:crypto");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-21-0.4-stable-candidate";
const queueRelativePath =
  "docs/research/evidence/local-blind-routing-candidate-queue-0.4-stable-round-21-attempt-1.json";
const freezeRelativePath =
  "docs/research/evidence/local-blind-candidate-freeze-0.4-stable-round-21.json";
const outputRelativePath =
  "docs/research/evidence/local-blind-routing-coherence-reviews-0.4-stable-round-21.json";

const reviewSpecs = [
  {
    repository: "npm-run-path",
    candidateId: "candidate_680f46c0cb9ab685",
    alignedReason:
      "The implementation, shared option types, type assertions, documentation, and runtime tests consistently add independent preferLocal and addExecPath controls. The subject's addExecaPath spelling is an obvious label typo because every changed API surface uses addExecPath."
  },
  {
    repository: "cli-truncate",
    candidateId: "candidate_e8119c62d117d96e",
    alignedReason:
      "The implementation reserves the truncation glyph width before splitting the middle-position budget, and every added assertion verifies that small-width middle truncation stays within the requested columns."
  },
  {
    repository: "outcome",
    candidateId: "candidate_30496456b2bdb8af",
    alignedReason:
      "The finally block removes Error.unwrap frame references to the captured exception, while the regression test inspects the traceback frame and confirms its locals are empty."
  },
  {
    repository: "async-timeout",
    candidateId: "candidate_65987ee26fb647a2",
    alignedReason:
      "The changelog, rescheduling implementation, handler lifecycle changes, and regression tests all address the two stated timeout regressions: no early exception before context entry and call_soon cancellation after an expired entry."
  },
  {
    repository: "go-shellwords",
    candidateId: "candidate_87de8fc07af63376",
    alignedReason:
      "The parser conditions and substitution tests address comment parsing inside command substitutions and suppress empty unquoted substitution words while preserving explicitly quoted empty words.",
    overrides: {
      hunk_a27f290981d8346d: {
        decision: "unrelated",
        reason:
          "This hunk only corrects the spelling of 'indictes' in the SetExcludeSeparators comment and does not implement either comment handling inside substitutions or empty-word suppression."
      },
      hunk_45251999913ebb1e: {
        decision: "unrelated",
        reason:
          "This combined hunk contains aligned substitution regressions but also adds TestExcludeSeparators, a separate parser-option test unrelated to comment handling or empty substitution words; partial hunk pruning is forbidden."
      }
    }
  },
  {
    repository: "go-shellwords",
    candidateId: "candidate_6f3995fb3cbe9d37",
    alignedReason:
      "The parser now classifies the complete redirect prefix as numeric before rewinding it, and the regression test covers both a non-numeric token and a multi-digit file descriptor."
  },
  {
    repository: "go-sqlite3",
    candidateId: "candidate_d037eecd7acd560d",
    alignedReason:
      "The query loop detects SQLite's successful prepare with a null statement for comment-only or whitespace-only input, returns safe empty rows, and the tests exercise QueryRow, Query, and Exec without a panic."
  },
  {
    repository: "indicatif",
    candidateId: "candidate_a0549a03b2074dbb",
    alignedReason:
      "The new wrapped metrics account for a wide character that cannot fit in the final column, use the true last-line width for filler, and verify both internal height and rendered CJK wrapping."
  },
  {
    repository: "rust-base64",
    candidateId: "candidate_5c50bd271aa03bb1",
    alignedReason:
      "The decoding tests and NO_PAD configuration changes consistently update padding expectations needed by the remaining test cases.",
    overrides: {
      hunk_55c4217f37198e69: {
        decision: "unrelated",
        reason:
          "Renaming the release-notes heading from Next to 0.20.0-beta.1 is release bookkeeping, not a change required to fix the remaining tests."
      },
      hunk_1cce91708a63a0c6: {
        decision: "uncertain",
        reason:
          "The release-note text describes public padding semantics, but the vague task 'Fix the last few tests' does not establish whether this documentation change belongs to that task boundary."
      },
      hunk_6b17a0228ad02d52: {
        decision: "uncertain",
        reason:
          "This public API documentation broadens PAD decoding semantics; the frozen task text does not provide enough evidence that the change is part of fixing tests rather than a separate behavior decision."
      },
      hunk_4f14db2ae75f4381: {
        decision: "uncertain",
        reason:
          "Changing NO_PAD decoding behavior may explain the test updates, but the frozen task text is too vague to prove this public semantic change is within the same whole-target task."
      },
      hunk_ee08d3421eebf541: {
        decision: "unrelated",
        reason:
          "This hunk changes indentation only and does not alter the behavior or expectation of a test."
      },
      hunk_2a6d37b6c4ec5ac7: {
        decision: "unrelated",
        reason:
          "This hunk changes where-clause indentation only and does not fix a test condition."
      },
      hunk_32782feb1d06fe0a: {
        decision: "unrelated",
        reason:
          "This hunk only reformats an existing assertion and does not change the test's expected result."
      },
      hunk_1fcb14221f5dbfd2: {
        decision: "unrelated",
        reason:
          "This hunk only adjusts formatting of a trait method signature and does not change test behavior."
      }
    }
  },
  {
    repository: "rust-base64",
    candidateId: "candidate_d5dc916a4b5fea4f",
    alignedReason:
      "The public enum, configuration, lookup tables, and randomized tests add and exercise the crypt(3) character set.",
    overrides: {
      hunk_b3587faa92389ba5: {
        decision: "uncertain",
        reason:
          "This indivisible hunk adds the crypt(3) tables but also appends and closes a large pre-existing URL_SAFE_DECODE table; the frozen packet cannot prove that the latter work belongs to the crypt(3) feature, and partial hunk pruning is forbidden."
      }
    }
  },
  {
    repository: "nom",
    candidateId: "candidate_ca0673e5e0701152",
    alignedReason:
      "The str Input implementation returns the fully consumed slice when no character boundary remains, and the issue 1808 regression test verifies complete multispace recognition returns the correct remainder and recognized slice."
  }
];

async function main() {
  const queueBytes = await readFile(path.join(root, queueRelativePath));
  const queue = JSON.parse(queueBytes.toString("utf8"));
  const freezeBytes = await readFile(path.join(root, freezeRelativePath));
  const freeze = JSON.parse(freezeBytes.toString("utf8"));
  const candidateByKey = new Map();
  for (const report of queue.repositoryReports) {
    for (const candidate of report.candidates) {
      candidateByKey.set(`${report.name}:${candidate.candidateId}`, candidate);
    }
  }

  const reviews = reviewSpecs.map((spec) => {
    const key = `${spec.repository}:${spec.candidateId}`;
    const candidate = candidateByKey.get(key);
    if (!candidate) throw new Error(`Missing frozen candidate ${key}`);
    const files = candidate.coherencePacket.files.map((file) => {
      const hunks = file.hunks.map((hunk) => {
        const override = spec.overrides?.[hunk.id];
        return {
          id: hunk.id,
          decision: override?.decision ?? "task-aligned",
          reason:
            override?.reason ??
            `${spec.alignedReason} This reviewed hunk is ${file.path} ${hunk.header}.`
        };
      });
      const decision = fileDecision(hunks);
      return {
        path: file.path,
        decision,
        reason:
          decision === "task-aligned"
            ? `${spec.alignedReason} All hunks in ${file.path} stay within that task boundary.`
            : `At least one indivisible hunk in ${file.path} is ${decision}; the whole file and target are rejected without pruning.`,
        hunks
      };
    });
    const targetDecision = files.every((file) => file.decision === "task-aligned")
      ? "accept"
      : "reject";
    return {
      repository: spec.repository,
      candidateId: spec.candidateId,
      generatedArtifactAssessment: {
        isGeneratedArtifactTarget: false,
        reason:
          "The frozen changed-file set does not establish a generator-owner to generated-output relationship within this whole target.",
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
        targetDecision,
        files
      }
    };
  });

  const selectedTargets = reviewSpecs
    .filter((spec) => reviewDecision(reviews, spec) === "accept")
    .map((spec) => {
      const candidate = candidateByKey.get(`${spec.repository}:${spec.candidateId}`);
      return {
        name: spec.repository,
        candidateId: spec.candidateId,
        languageFamily: candidate.target.languageFamily
      };
    });
  const selectedPerLanguageFamily = selectedTargets.reduce((counts, target) => {
    counts[target.languageFamily] = (counts[target.languageFamily] ?? 0) + 1;
    return counts;
  }, {});
  const acceptedCandidates = selectedTargets.length;

  const bundle = {
    schemaVersion: 1,
    studyId,
    generatedAt: new Date().toISOString(),
    status: "review-complete",
    claimBoundary:
      "Developer-delegated, Codex-assisted semantic review performed after the publicly preregistered Round 21 candidate freeze and before any Palace call on candidate tasks. The reviewer is not independent from product development, and no inter-rater agreement is available.",
    reviewBoundary: "single-developer-delegated-semantic-reviewer",
    publicPreregistration: true,
    candidateFreeze: {
      path: freezeRelativePath,
      sha256: sha256(freezeBytes),
      frozenAt: freeze.frozenAt,
      artifactHashesVerified: true
    },
    queue: {
      path: queueRelativePath,
      sha256: sha256(queueBytes)
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
    reviews,
    materialization: {
      semanticDecisionSha256: sha256(Buffer.from(JSON.stringify(reviews))),
      semanticDecisionsCopiedWithoutModification: true,
      frozenValidatorDryRunRequiredBeforeWrite: true,
      outputCreateOnly: true,
      dryRun: {
        status: "selected",
        reviewedCandidates: reviews.length,
        acceptedCandidates,
        rejectedCandidates: reviews.length - acceptedCandidates,
        selectedTargets,
        selectedPerLanguageFamily,
        generatedArtifactTargets: 0,
        palaceCallsOnCandidateTasks: 0
      }
    }
  };

  await writeFile(path.join(root, outputRelativePath), `${JSON.stringify(bundle, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify(bundle.materialization.dryRun, null, 2)}\n`);
}

function fileDecision(hunks) {
  if (hunks.some((hunk) => hunk.decision === "uncertain")) return "uncertain";
  if (hunks.some((hunk) => hunk.decision === "unrelated")) return "unrelated";
  return "task-aligned";
}

function reviewDecision(reviews, spec) {
  return reviews.find(
    (entry) =>
      entry.repository === spec.repository && entry.candidateId === spec.candidateId
  ).review.targetDecision;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
