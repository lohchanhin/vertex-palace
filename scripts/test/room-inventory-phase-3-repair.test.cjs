const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const firstPath = fromRoot("docs/research/evidence/room-inventory-phase-3-first-observation-0.5.json");
const precompatPath = fromRoot("docs/research/evidence/room-inventory-phase-3-repair-1-precompat-0.5.json");
const finalPath = fromRoot("docs/research/evidence/room-inventory-phase-3-repair-1-final-0.5.json");
const broadSelfEvaluationPath = fromRoot("docs/research/evidence/room-inventory-phase-3-broad-self-evaluation-0.5.json");
const englishPath = fromRoot("docs/research/ROOM_INVENTORY_PHASE_3_REPAIR_1_0_5.md");
const chinesePath = fromRoot("docs/zh-CN/ROOM_INVENTORY_PHASE_3_REPAIR_1_0_5.md");

test("preserves the complete Phase 3 failure, precompat, and final repair chain", () => {
  const first = readJson(firstPath);
  const precompat = readJson(precompatPath);
  const final = readJson(finalPath);

  assert.equal(sha256(firstPath), "cc95cc7ca4a67cac5252feb17d205ff5f46846957de3dc3725e84e8f1f6ed9d2");
  assert.equal(sha256(precompatPath), "c42cccda07376c116e881ab9284bc5b8c77dc46f3d6c01c84b89dc801a816cc7");
  assert.equal(sha256(finalPath), "e731bc476076e22c2e8f9f92b1f745b607fc6f4ef607c00489528959f2d9e32a");
  assert.equal(first.oracle.sha256, precompat.oracle.sha256);
  assert.equal(first.oracle.sha256, final.oracle.sha256);
  assert.equal(first.overallPass, false);
  assert.equal(precompat.observation, "repair-1");
  assert.equal(precompat.overallPass, true);
  assert.equal(precompat.baseline.edges, 360);
  assert.equal(final.observation, "repair-1-final");
  assert.equal(final.overallPass, true);
  assert.equal(final.baseline.edges, first.baseline.edges);
  assert.equal(final.baseline.edges, 364);
});

test("locks perfect synthetic relation quality without weakening default-off behavior", () => {
  const final = readJson(finalPath);

  assert.equal(final.metrics.endpointResolution, 1);
  assert.equal(final.metrics.relationPrecision, 1);
  assert.equal(final.metrics.relationRecall, 1);
  assert.equal(final.metrics.testClosureRecall, 1);
  assert.equal(final.metrics.forbiddenHits, 0);
  assert.equal(final.metrics.unexpectedInScopeRelations, 0);
  assert.equal(final.metrics.deterministicRelationAgreement, 1);
  assert.ok(final.metrics.perLanguage.every((entry) => entry.recall === 1));
  assert.equal(final.baseline.objects, 0);
  assert.equal(final.baseline.objectRelations, 0);
  assert.ok(final.diagnostics.testObjects.every((entry) => (
    entry.matches === 1 && entry.objectKinds.length === 1 && entry.objectKinds[0] === "test"
  )));
  assert.ok(Object.values(final.gates).every(Boolean));
});

test("keeps the bilingual repair report aligned with compatibility and claim limits", () => {
  for (const document of [readFileSync(englishPath, "utf8"), readFileSync(chinesePath, "utf8")]) {
    assert.match(document, /Room Inventory/);
    assert.match(document, /0\.7586/);
    assert.match(document, /1\.0000/);
    assert.match(document, /364/);
    assert.match(document, /360/);
    assert.match(document, /compatibility|兼容性/i);
    assert.match(document, /Round 26/);
    assert.match(document, /Agent/);
    assert.match(document, /npm `latest`/);
    assert.match(document, /0\.167/);
    assert.match(document, /0\.20/);
    assert.match(document, /overconfident/);
  }
});

test("preserves the negative broad-routing self-evaluation", () => {
  const result = readJson(broadSelfEvaluationPath);
  const stable = result.stable040;
  const candidate = result.local05Candidate;

  assert.equal(sha256(broadSelfEvaluationPath), "1327d6dbab59913a3ee59efeecbb2c68c899d0f3532b86f722e256b52127e5d8");
  assert.equal(result.classification, "disclosed-post-repair-self-evaluation");
  assert.equal(result.outcome, "no-broad-route-improvement");
  assert.equal(stable.confidence, 0.68);
  assert.equal(stable.coreCoverage, 0.167);
  assert.equal(stable.routeFocus, 0.2);
  assert.equal(stable.calibrationStatus, "overconfident");
  assert.deepEqual(candidate.routeFiles, stable.routeFiles);
  assert.equal(candidate.confidence, stable.confidence);
  assert.equal(candidate.coreCoverage, stable.coreCoverage);
  assert.equal(candidate.routeFocus, stable.routeFocus);
  assert.equal(candidate.calibrationStatus, stable.calibrationStatus);
  assert.match(result.claimBoundary, /not a frozen qualification round/);
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
