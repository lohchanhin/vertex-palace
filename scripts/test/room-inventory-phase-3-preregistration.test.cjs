const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const fixtureRoot = fromRoot("packages/core/test/fixtures/room-inventory-relations");
const oraclePath = path.join(fixtureRoot, "oracle.json");
const protocolPath = fromRoot("docs/research/evidence/room-inventory-phase-3-preregistration-0.5.json");
const englishPath = fromRoot("docs/research/ROOM_INVENTORY_PHASE_3_RELATION_QUALITY_PROTOCOL_0_5.md");
const chinesePath = fromRoot("docs/zh-CN/ROOM_INVENTORY_PHASE_3_RELATION_QUALITY_PROTOCOL_0_5.md");

test("freezes the Phase 3 fixture and oracle before candidate observation", () => {
  const protocol = readJson(protocolPath);
  const oracle = readJson(oraclePath);

  assert.equal(protocol.status, "relation-quality-protocol-frozen-candidate-unobserved");
  assert.equal(protocol.execution.candidateObserved, false);
  assert.equal(protocol.fixture.oracleSha256, sha256File(oraclePath));
  assert.equal(protocol.fixture.fixtureSourcesSha256, fixtureSourcesSha256());
  assert.equal(protocol.fixture.sourceFiles, 11);
  assert.deepEqual(protocol.fixture.languages, ["typescript", "javascript", "python", "go", "rust"]);
  assert.equal(oracle.status, "frozen-before-candidate-observation");
  assert.equal(oracle.aggregateTruth.expectedRelations, 27);
  assert.equal(oracle.aggregateTruth.forbiddenRelations, 10);
});

test("locks relation-quality gates and one general repair per failure class", () => {
  const protocol = readJson(protocolPath);

  assert.equal(protocol.gates.objectEndpointResolution, 1);
  assert.equal(protocol.gates.minimumMacroRelationPrecision, 0.95);
  assert.equal(protocol.gates.minimumMacroRelationRecall, 0.8);
  assert.equal(protocol.gates.minimumPerLanguageRelationRecall, 0.5);
  assert.equal(protocol.gates.minimumTestClosureRecall, 0.8);
  assert.equal(protocol.gates.maximumForbiddenRelationRate, 0);
  assert.equal(protocol.gates.deterministicRelationAgreement, 1);
  assert.equal(protocol.gates.maximumOutgoingObjectRelations, 32);
  assert.equal(protocol.gates.maximumDefaultOffObjectRelations, 0);
  assert.equal(protocol.failurePolicy.firstObservationImmutable, true);
  assert.equal(protocol.failurePolicy.oracleRewriteAfterObservationAllowed, false);
  assert.equal(protocol.failurePolicy.thresholdRewriteAfterObservationAllowed, false);
  assert.equal(protocol.failurePolicy.maximumGeneralMechanismRepairsPerFailureClass, 1);
  assert.equal(protocol.failurePolicy.targetSpecificRulesAllowed, false);
});

test("keeps the bilingual protocol aligned and free of candidate execution", () => {
  const source = readFileSync(__filename, "utf8");
  assert.doesNotMatch(source, /@vertex-palace\/core|packages\/core\/(?:dist|src)/);

  for (const document of [readFileSync(englishPath, "utf8"), readFileSync(chinesePath, "utf8")]) {
    assert.match(document, /Room Inventory/);
    assert.match(document, /TypeScript/);
    assert.match(document, /JavaScript/);
    assert.match(document, /Python/);
    assert.match(document, /Go/);
    assert.match(document, /Rust/);
    assert.match(document, /27/);
    assert.match(document, /10/);
    assert.match(document, /0\.95/);
    assert.match(document, /0\.80/);
    assert.match(document, /Round 26/);
    assert.match(document, /Agent/);
  }
});

function fixtureSourcesSha256() {
  const digest = createHash("sha256");
  for (const filePath of walkFiles(fixtureRoot)
    .filter((file) => file !== oraclePath)
    .sort((left, right) => left.localeCompare(right))) {
    const relative = path.relative(fixtureRoot, filePath).replaceAll("\\", "/");
    digest.update(relative);
    digest.update("\0");
    digest.update(readFileSync(filePath));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : [absolute];
  });
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function fromRoot(relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}
