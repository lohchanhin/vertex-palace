const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(root, "docs", "research", "evidence");

test("preserves the Round 12 frozen candidate lineage after disclosed product development", async () => {
  const freezePath = path.join(evidenceRoot, "local-blind-candidate-freeze-0.4-alpha-round-12.json");
  const manifestPath = path.join(evidenceRoot, "local-blind-routing-target-manifest-0.4-alpha-round-12.json");
  const formalPath = path.join(evidenceRoot, "local-blind-routing-validation-0.4-alpha-round-12-attempt-2.json");
  const liveGuardPath = path.join(root, "scripts", "test", "round12-local-blind-selection-freeze.test.cjs");
  const [freezeBytes, manifestBytes, formalBytes, liveGuardBytes] = await Promise.all([
    readFile(freezePath),
    readFile(manifestPath),
    readFile(formalPath),
    readFile(liveGuardPath)
  ]);
  const freeze = JSON.parse(freezeBytes);
  const formal = JSON.parse(formalBytes);

  assert.equal(
    sha256(freezeBytes),
    formal.frozenInputs.candidateFreezeSha256,
    "The formal Round 12 result no longer binds the original candidate freeze"
  );
  assert.equal(
    sha256(manifestBytes),
    formal.frozenInputs.manifestSha256,
    "The formal Round 12 result no longer binds the original target manifest"
  );
  assert.equal(
    sha256(liveGuardBytes),
    freeze.artifacts["scripts/test/round12-local-blind-selection-freeze.test.cjs"],
    "The Round 12 pre-observation live guard changed after the freeze"
  );
  assert.equal(formal.candidateGateStatus, "failed");
  assert.equal(formal.products.candidate.cliSha256, freeze.candidate.cliSha256);
  assert.deepEqual(formal.products.candidate.sourceTree, freeze.candidate.sourceTree);
});

test("keeps the research runner explicit about the retired Round 12 live guard", async () => {
  const [runner, packageJson] = await Promise.all([
    readFile(path.join(root, "scripts", "run-research-tests.cjs"), "utf8"),
    readFile(path.join(root, "package.json"), "utf8")
  ]);
  const scripts = JSON.parse(packageJson).scripts;

  assert.equal(scripts.test, "pnpm -r test && node scripts/run-research-tests.cjs");
  assert.match(runner, /round12-local-blind-selection-freeze\.test\.cjs/);
  assert.match(runner, /Round 12 pre-observation live candidate guard is preserved/i);
  assert.match(runner, /--test-name-pattern/);
  assert.match(runner, /Round 12 freeze/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
