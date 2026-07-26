const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const harnessPath = path.join(projectRoot, "scripts", "verify-disclosed-routing-round-7-after-independent-anchor-confidence-cap.cjs");
const evidencePath = (name) => path.join(projectRoot, "docs", "research", "evidence", name);
const originalPath = evidencePath("held-out-cross-repository-routing-0.4-alpha-round-7.json");
const previousPath = evidencePath("disclosed-routing-round-7-after-constrained-module-pair-repair-0.4-alpha.json");

test("freezes a disclosed independent-anchor confidence regression with explicit claim limits", () => {
  const source = readFileSync(harnessPath, "utf8");
  assert.match(source, /heldOutAgainstCandidate:\s*false/);
  assert.match(source, /evidenceClass:\s*"seen-development-regression"/);
  assert.match(source, /repair:\s*"independent-implementation-anchor-confidence-cap-v1"/);
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
    "7FBD82D10A99C65D4817349AD5E91C7A7237A712DADECD80E5707DBCA0386252"
  );

  const original = JSON.parse(readFileSync(originalPath, "utf8"));
  const previous = JSON.parse(readFileSync(previousPath, "utf8"));
  assert.equal(original.heldOutAgainstCandidate, true);
  assert.equal(previous.heldOutAgainstCandidate, false);
  assert.equal(previous.candidate.productCommit, "228c3bde47f6930023496fdd0a54d43dba10091f");
  assert.equal(previous.aggregate.completedTrials, 16);
});

function sha256(filePath) {
  return createHash("sha256")
    .update(readFileSync(filePath))
    .digest("hex")
    .toUpperCase();
}
