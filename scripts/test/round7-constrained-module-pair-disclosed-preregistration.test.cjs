const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const harnessPath = path.join(projectRoot, "scripts", "verify-disclosed-routing-round-7-after-constrained-module-pair-repair.cjs");
const evidencePath = (name) => path.join(projectRoot, "docs", "research", "evidence", name);
const originalPath = evidencePath("held-out-cross-repository-routing-0.4-alpha-round-7.json");
const previousPath = evidencePath("disclosed-routing-round-7-after-task-anchored-module-pair-repair-0.4-alpha.json");

test("freezes a disclosed constrained module-pair regression with explicit claim limits", () => {
  const source = readFileSync(harnessPath, "utf8");
  assert.match(source, /heldOutAgainstCandidate:\s*false/);
  assert.match(source, /evidenceClass:\s*"seen-development-regression"/);
  assert.match(source, /repair:\s*"task-anchored-module-pair-v2-constrained-sparse-test"/);
  assert.match(source, /cannot establish held-out generalization/);
  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /Output cannot overwrite the previous disclosed Round 7 regression/);
  assert.match(source, /Output cannot overwrite the original Round 7 held-out observation/);
  assert.match(source, /const targetCount = 8/);
  assert.match(source, /const repetitions = 2/);
  assert.match(source, /const routeLimit = 9/);
});

test("locks both earlier Round 7 observations before measurement", () => {
  assert.equal(
    sha256(originalPath),
    "C53C9186853F1661158212604804261C8394781454A7C7B7DF15811D4E42D7B9"
  );
  assert.equal(
    sha256(previousPath),
    "075BADB394CA1230252AB9F9710E90F88E37262E08CD7D837E95EA259DAE64F5"
  );

  const original = JSON.parse(readFileSync(originalPath, "utf8"));
  const previous = JSON.parse(readFileSync(previousPath, "utf8"));
  assert.equal(original.heldOutAgainstCandidate, true);
  assert.equal(previous.heldOutAgainstCandidate, false);
  assert.equal(previous.candidate.productCommit, "cea2fd91f85726603f8f04de23d127e766caf198");
  assert.equal(previous.aggregate.completedTrials, 16);
});

function sha256(filePath) {
  return createHash("sha256")
    .update(readFileSync(filePath))
    .digest("hex")
    .toUpperCase();
}
