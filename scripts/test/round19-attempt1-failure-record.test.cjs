const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(root, "docs/research/evidence");

test("Round 19 preserves the partial attempt and identifies the generic harness contract error", async () => {
  const record = JSON.parse(await readFile(
    path.join(evidenceRoot, "local-blind-routing-validation-attempt-1-failure-record-0.4-alpha-round-19.json"),
    "utf8"
  ));
  const [freezeBytes, resultBytes, candidateFreezeBytes, manifestBytes] = await Promise.all([
    readFile(path.join(evidenceRoot, "local-blind-routing-validation-freeze-0.4-alpha-round-19.json")),
    readFile(path.join(evidenceRoot, "local-blind-routing-validation-0.4-alpha-round-19-attempt-1.json")),
    readFile(path.join(evidenceRoot, "local-blind-candidate-freeze-0.4-alpha-round-19.json")),
    readFile(path.join(evidenceRoot, "local-blind-routing-target-manifest-0.4-alpha-round-19.json"))
  ]);

  assert.equal(record.status, "invalid-after-partial-palace-observation");
  assert.equal(record.failureCategory, "validator-commit-message-subject-contract-harness-error");
  assert.equal(record.observationBoundary.pairedTargetsObserved, 7);
  assert.equal(record.observationBoundary.selectedTaskPalaceCalls, 98);
  assert.equal(record.observationBoundary.productTuningBeforeCorrection, false);
  assert.equal(record.correctionBoundary.semanticProtocolChange, false);
  assert.equal(record.correctionBoundary.productChange, false);
  assert.equal(record.correctionBoundary.taskRemoval, false);
  assert.equal(record.failedValidationFreeze.sha256, sha256(freezeBytes));
  assert.equal(record.failedFormalResult.sha256, sha256(resultBytes));
  assert.equal(record.candidate.freezeSha256, sha256(candidateFreezeBytes));
  assert.equal(record.targetManifest.sha256, sha256(manifestBytes));
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
