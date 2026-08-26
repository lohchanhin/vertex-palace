const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  buildReviewBundle,
  reviewSpecs
} = require("../create-round19-coherence-reviews.cjs");
const { finalizeReviewedTargets } = require("../lib/round19-target-selection.cjs");

const root = path.resolve(__dirname, "../..");
const queuePath = path.join(root, "docs/research/evidence/local-blind-routing-candidate-queue-0.4-alpha-round-19-attempt-2.json");
const poolPath = path.join(root, "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-19.json");

test("Round 19 manual review decisions select two coherent targets per language family", () => {
  const queueBytes = readFileSync(queuePath);
  const queue = JSON.parse(queueBytes.toString("utf8"));
  const pool = JSON.parse(readFileSync(poolPath, "utf8"));
  const reviewBundle = buildReviewBundle({
    queue,
    queueSha256: createHash("sha256").update(queueBytes).digest("hex").toUpperCase(),
    generatedAt: "2026-08-13T00:00:00.000Z"
  });
  const finalized = finalizeReviewedTargets({ pool, queue, reviewBundle });

  assert.equal(finalized.status, "selected");
  assert.equal(reviewSpecs.length, 10);
  assert.equal(reviewSpecs.filter(({ targetDecision }) => targetDecision === "reject").length, 2);
  assert.deepEqual(
    finalized.selectedTargets.map(({ name, candidateRank }) => [name, candidateRank]),
    [
      ["cors", 1],
      ["hoek", 1],
      ["jaraco-path", 1],
      ["iniconfig", 3],
      ["pretty", 1],
      ["groupcache", 1],
      ["semver", 1],
      ["cc-rs", 1]
    ]
  );
  assert.deepEqual(finalized.rules.selectedPerLanguageFamily, {
    "javascript-typescript": 2,
    python: 2,
    go: 2,
    rust: 2
  });
  assert.equal(finalized.rules.generatedArtifactTargets, 0);
  assert.equal(reviewBundle.timing.palaceCallsOnCandidateTasks, 0);
});
