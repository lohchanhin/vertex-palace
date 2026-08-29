const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const resultPath = fromRoot("docs/research/evidence/room-inventory-phase-4-first-observation-0.5.json");
const oraclePath = fromRoot("packages/core/test/fixtures/room-inventory-evidence-roles/oracle.json");
const englishPath = fromRoot("docs/research/ROOM_INVENTORY_PHASE_4_FIRST_OBSERVATION_0_5.md");
const chinesePath = fromRoot("docs/zh-CN/ROOM_INVENTORY_PHASE_4_FIRST_OBSERVATION_0_5.md");

test("preserves the immutable failed Phase 4 first observation", () => {
  const result = readJson(resultPath);

  assert.equal(sha256(resultPath), "bd5859955841947f74db3b395d30f0b63433b70eedf3d98ba63bbe53aa412c5b");
  assert.equal(result.fixture.oracleSha256, sha256(oraclePath));
  assert.equal(result.observation, "first");
  assert.equal(result.immutable, true);
  assert.equal(result.overallPass, false);
  assert.equal(result.metrics.macroRequiredFileCoverage, 0.7647);
  assert.equal(result.metrics.minimumPerTargetRequiredFileCoverage, 0.4);
  assert.equal(result.metrics.explicitFacetClosureRate, 0.5);
  assert.equal(result.metrics.focusedVerificationCoverage, 1);
  assert.equal(result.metrics.generatedArtifactCoverage, 0);
  assert.equal(result.metrics.macroRouteFocus, 0.7238);
  assert.equal(result.metrics.minimumPerTargetRouteFocus, 0.4286);
  assert.equal(result.metrics.forbiddenDecoyHits, 1);
  assert.equal(result.metrics.deterministicRouteAgreement, 1);
  assert.equal(result.metrics.overconfidentIncompleteRoutes, 1);
  assert.equal(result.baseline.objects, 0);
  assert.equal(result.baseline.objectRelations, 0);
});

test("locks the observed target-level omissions and noise", () => {
  const result = readJson(resultPath);
  const targets = new Map(result.targets.map((target) => [target.id, target]));
  const typescript = targets.get("typescript-generated-compound");
  const python = targets.get("python-parser-compatibility");
  const go = targets.get("go-parser-compatibility");
  const rust = targets.get("rust-parser-compatibility");

  assert.deepEqual(typescript.missedFacets, ["parser", "compatibility", "generated-artifact"]);
  assert.equal(typescript.confidence, 0.71);
  assert.deepEqual(python.forbiddenHits, ["decoys/legacy-session.md"]);
  assert.equal(go.requiredFileCoverage, 1);
  assert.ok(go.routeFiles.includes("python/session_compatibility.py"));
  assert.deepEqual(rust.missedFacets, ["parser"]);
  assert.ok(rust.routeFiles.includes("go/dispatch.go"));
  assert.ok(result.targets.every((target) => target.deterministic));
});

test("keeps the bilingual first-observation report aligned with the failed result", () => {
  for (const document of [readFileSync(englishPath, "utf8"), readFileSync(chinesePath, "utf8")]) {
    assert.match(document, /Room Inventory/);
    assert.match(document, /0\.7647/);
    assert.match(document, /0\.4000/);
    assert.match(document, /0\.7238/);
    assert.match(document, /0\.4286/);
    assert.match(document, /1,745/);
    assert.match(document, /failed|失败/i);
    assert.match(document, /Round 26/);
    assert.match(document, /Agent/);
    assert.match(document, /npm `latest`/);
  }
});

function fromRoot(relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}
