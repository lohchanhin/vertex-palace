const assert = require("node:assert/strict");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { sha256Bytes } = require("./lib/local-blind-freeze.cjs");

const root = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-16-0.4-alpha";
const freezeRelativePath =
  "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-16.json";
const queueRelativePath =
  "docs/research/evidence/local-blind-routing-candidate-queue-0.4-alpha-round-16-attempt-1.json";
const poolRelativePath =
  "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-16.json";
const outputRelativePath =
  "docs/research/evidence/local-blind-routing-target-selection-round-16-attempt-1-failure.json";
const expectedFreezeSha256 = "66DA9821BF49A3221A2B96BBDEE9F9594C42ED1BF8EF55E8414EEC3E863CB36F";
const expectedQueueSha256 = "1EC499D48175182BCD5B5543BBA85AF6DAA85B125F7D8C2C78E305E56A1E2D1D";
const expectedPoolSha256 = "FA2BB1D3ED982B189B32BA6089D2552EA7D5C54CBAD11960E80E1308122458CD";

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const outputPath = outputArgument(process.argv.slice(2));
  const [freezeBytes, queueBytes, poolBytes] = await Promise.all([
    readFile(path.join(root, freezeRelativePath)),
    readFile(path.join(root, queueRelativePath)),
    readFile(path.join(root, poolRelativePath))
  ]);
  assert.equal(sha256Bytes(freezeBytes), expectedFreezeSha256);
  assert.equal(sha256Bytes(queueBytes), expectedQueueSha256);
  assert.equal(sha256Bytes(poolBytes), expectedPoolSha256);

  const freeze = JSON.parse(freezeBytes.toString("utf8"));
  const queue = JSON.parse(queueBytes.toString("utf8"));
  const pool = JSON.parse(poolBytes.toString("utf8"));
  assert.equal(freeze.studyId, studyId);
  assert.equal(freeze.status, "locally-frozen");
  assert.equal(queue.studyId, studyId);
  assert.equal(queue.status, "candidate-queue-ready");
  assert.equal(queue.palaceCallsOnCandidateTasks, 0);
  assert.equal(pool.studyId, studyId);

  const familyFeasibility = pool.rules.requiredLanguageFamilies.map((family) => {
    const reports = queue.repositoryReports.filter(({ languageFamily }) => languageFamily === family);
    const candidateRepositories = reports.filter(({ candidates }) => candidates.length > 0);
    return {
      languageFamily: family,
      requiredTargets: pool.rules.targetsPerLanguageFamily,
      repositoriesInPool: reports.length,
      repositoriesWithMechanicalCandidates: candidateRepositories.length,
      mechanicalCandidates: candidateRepositories.reduce(
        (total, report) => total + report.candidates.length,
        0
      ),
      candidateRepositories: candidateRepositories.map(({ name, candidates }) => ({
        name,
        candidates: candidates.length
      })),
      repositoriesWithoutMechanicalCandidates: reports
        .filter(({ candidates }) => candidates.length === 0)
        .map(({ name }) => name),
      feasibleBeforeSemanticReview:
        candidateRepositories.length >= pool.rules.targetsPerLanguageFamily
    };
  });
  const blockingFamilies = familyFeasibility
    .filter(({ feasibleBeforeSemanticReview }) => !feasibleBeforeSemanticReview)
    .map(({ languageFamily }) => languageFamily);
  assert.deepEqual(blockingFamilies, ["rust"]);

  const result = {
    schemaVersion: 1,
    studyId,
    attempt: 1,
    status: "selection-failed-before-semantic-review",
    completedAt: new Date().toISOString(),
    evidenceClass: "fresh-locally-frozen-mechanical-selection-failure",
    candidateFreeze: {
      path: freezeRelativePath,
      sha256: expectedFreezeSha256
    },
    repositoryPool: {
      path: poolRelativePath,
      sha256: expectedPoolSha256,
      repositories: pool.repositoryPool.length
    },
    candidateQueue: {
      path: queueRelativePath,
      sha256: expectedQueueSha256,
      repositoriesInspected: queue.repositoryReports.length,
      mechanicalCandidates: queue.repositoryReports.reduce(
        (total, report) => total + report.candidates.length,
        0
      )
    },
    familyFeasibility,
    blockingFamilies,
    selection: {
      desiredTargets: pool.rules.desiredTargets,
      selectedTargets: 0,
      semanticReviewStarted: false,
      semanticReviewRequiredButNotReached: true,
      reason: "Rust had only one repository with any mechanically eligible candidate, below the frozen two-target family quota. No semantic decisions can make the frozen pool feasible.",
      partialSelectionPublished: false,
      familyQuotaLowered: false,
      poolSubstitutedAfterHistoryObservation: false
    },
    exposureBoundary: {
      repositoryHistoryInspectedByMechanicalSelector: true,
      candidateSubjectsAndDiffsMaterialized: true,
      semanticReviewPerformed: false,
      palaceCallsOnCandidateTasks: 0,
      productChangesAfterCandidateFreeze: false
    },
    advancement: {
      round16StaticValidationAuthorized: false,
      v5AgentStudyAuthorized: false,
      nextStep: "Preserve this failure, recursively exclude all 16 Round 16 repositories, and freeze a new larger fallback pool under a new round identifier before inspecting any new history."
    },
    claimBoundary: "Round 16 failed target selection before semantic review and before any Palace call on a candidate task. It provides no product-routing, Agent-correctness, Token, tool-call, or wall-time result. The failure cannot be repaired by lowering the family quota, substituting repositories, or publishing a partial oracle under the Round 16 identity.",
    competitionFreeze: {
      active: true,
      committed: false,
      pushed: false,
      tagged: false,
      npmPublished: false
    }
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: result.status,
    mechanicalCandidates: result.candidateQueue.mechanicalCandidates,
    blockingFamilies,
    palaceCallsOnCandidateTasks: 0,
    round16StaticValidationAuthorized: false
  }, null, 2)}\n`);
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  assert.ok(index >= 0 && args[index + 1], "--out requires the canonical create-only result path");
  const resolved = path.resolve(root, args[index + 1]);
  assert.equal(resolved, path.join(root, outputRelativePath));
  return resolved;
}
