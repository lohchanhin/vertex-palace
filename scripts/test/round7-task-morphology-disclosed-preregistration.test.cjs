const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const harnessPath = path.join(
  projectRoot,
  "scripts",
  "verify-disclosed-routing-round-7-after-task-morphology-repair.cjs"
);
const manifestPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-routing-target-manifest-0.4-alpha-round-7.json"
);
const baselinePath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-cross-repository-routing-0.4-alpha-round-7.json"
);

test("freezes a disclosed task-morphology regression without relabeling Round 7", () => {
  const source = readFileSync(harnessPath, "utf8");

  assert.match(source, /heldOutAgainstCandidate:\s*false/);
  assert.match(source, /evidenceClass:\s*"seen-development-regression"/);
  assert.match(source, /repair:\s*"task-action-morphology-v1"/);
  assert.match(source, /cannot establish held-out generalization/);
  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /Output cannot overwrite the original Round 7 held-out observation/);
  assert.match(source, /Output cannot overwrite the frozen Round 7 target manifest/);
  assert.match(source, /const repetitions = 2/);
  assert.match(source, /const targetCount = 8/);
  assert.match(source, /const routeLimit = 9/);
  assert.match(source, /const budget = 6_000/);
});

test("locks the original Round 7 inputs and records the failed baseline", () => {
  assert.equal(
    sha256(manifestPath),
    "9234AAB3E64E6EEB5857B6376646078067AA0121CA593DEBBB3275037A307616"
  );
  assert.equal(
    sha256(baselinePath),
    "C53C9186853F1661158212604804261C8394781454A7C7B7DF15811D4E42D7B9"
  );

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.targets.length, 8);
  assert.equal(manifest.candidate.productCommit, "f61207688badbe07818470a42441a3a966a8bdf0");
  assert.equal(baseline.status, "failed");
  assert.equal(baseline.heldOutAgainstCandidate, true);
  assert.equal(baseline.aggregate.completedTrials, 16);
});

function sha256(filePath) {
  return createHash("sha256")
    .update(readFileSync(filePath))
    .digest("hex")
    .toUpperCase();
}
