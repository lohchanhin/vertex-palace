const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const evidencePath = fromRoot("docs/research/evidence/room-inventory-phase-3-first-observation-0.5.json");
const englishPath = fromRoot("docs/research/ROOM_INVENTORY_PHASE_3_FIRST_OBSERVATION_0_5.md");
const chinesePath = fromRoot("docs/zh-CN/ROOM_INVENTORY_PHASE_3_FIRST_OBSERVATION_0_5.md");
const frozenEvidenceSha256 = "cc95cc7ca4a67cac5252feb17d205ff5f46846957de3dc3725e84e8f1f6ed9d2";

test("preserves the immutable failed Phase 3 first observation", () => {
  const evidence = readJson(evidencePath);

  assert.equal(sha256(evidencePath), frozenEvidenceSha256);
  assert.equal(evidence.observation, "first");
  assert.equal(evidence.immutable, true);
  assert.equal(evidence.overallPass, false);
  assert.equal(evidence.oracle.expectedRelations, 27);
  assert.equal(evidence.metrics.resolvedEndpoints, 46);
  assert.equal(evidence.metrics.relationPrecision, 0.7586);
  assert.equal(evidence.metrics.relationRecall, 0.8148);
  assert.equal(evidence.metrics.testClosureRecall, 0.8);
  assert.equal(evidence.metrics.forbiddenHits, 0);
  assert.equal(evidence.metrics.deterministicRelationAgreement, 1);
  assert.equal(evidence.diagnostics.missedExpectedRelations.length, 5);
  assert.equal(evidence.diagnostics.unexpectedInScopeRelations.length, 7);
  assert.equal(evidence.gates.macroRelationPrecision, false);
  assert.equal(evidence.gates.perLanguageRelationRecall, false);
});

test("keeps the bilingual first-observation report candid and aligned", () => {
  for (const document of [readFileSync(englishPath, "utf8"), readFileSync(chinesePath, "utf8")]) {
    assert.match(document, /Room Inventory/);
    assert.match(document, /0\.7586/);
    assert.match(document, /0\.8148/);
    assert.match(document, /Rust/);
    assert.match(document, /0\.0000/);
    assert.match(document, /failed|失败/i);
    assert.match(document, /Round 26/);
    assert.match(document, /Agent/);
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
