const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const fixtureRoot = fromRoot("packages/core/test/fixtures/room-inventory-evidence-roles");
const oraclePath = path.join(fixtureRoot, "oracle.json");
const protocolPath = fromRoot("docs/research/evidence/room-inventory-phase-4-preregistration-0.5.json");
const englishPath = fromRoot("docs/research/ROOM_INVENTORY_PHASE_4_EVIDENCE_FACET_PROTOCOL_0_5.md");
const chinesePath = fromRoot("docs/zh-CN/ROOM_INVENTORY_PHASE_4_EVIDENCE_FACET_PROTOCOL_0_5.md");

test("freezes the Phase 4 evidence-facet fixture before candidate observation", () => {
  const protocol = readJson(protocolPath);
  const oracle = readJson(oraclePath);

  assert.equal(protocol.status, "evidence-facet-protocol-frozen-candidate-unobserved");
  assert.equal(protocol.candidate.observed, false);
  assert.equal(protocol.candidate.artifactFrozen, false);
  assert.equal(protocol.fixture.oracleSha256, sha256File(oraclePath));
  assert.equal(protocol.fixture.fixtureSourcesSha256, fixtureSourcesSha256());
  assert.equal(protocol.fixture.sourceFiles, 22);
  assert.equal(protocol.fixture.targets, 4);
  assert.equal(protocol.fixture.requiredFiles, 17);
  assert.deepEqual(protocol.fixture.languages, ["typescript", "python", "go", "rust"]);
  assert.equal(oracle.status, "frozen-before-candidate-observation");
  assert.equal(oracle.aggregateTruth.requiredFiles, 17);
  assert.equal(oracle.aggregateTruth.forbiddenFiles, 3);
});

test("locks generic bounded planning and strict development gates", () => {
  const protocol = readJson(protocolPath);

  assert.equal(protocol.candidate.publicEvidenceRolesChanged, false);
  assert.equal(protocol.mechanism.maximumSourceHops, 2);
  assert.equal(protocol.mechanism.maximumSourcesPerFacet, 1);
  assert.equal(protocol.mechanism.minimumExpansionGain, 0.55);
  assert.equal(protocol.mechanism.targetSpecificRulesAllowed, false);
  assert.equal(protocol.gates.minimumMacroRequiredFileCoverage, 0.9);
  assert.equal(protocol.gates.minimumPerTargetRequiredFileCoverage, 0.8);
  assert.equal(protocol.gates.explicitFacetClosureRate, 1);
  assert.equal(protocol.gates.focusedVerificationCoverage, 1);
  assert.equal(protocol.gates.generatedArtifactCoverage, 1);
  assert.equal(protocol.gates.minimumMacroRouteFocus, 0.7);
  assert.equal(protocol.gates.minimumPerTargetRouteFocus, 0.6);
  assert.equal(protocol.gates.maximumForbiddenDecoyHits, 0);
  assert.equal(protocol.gates.maximumOverconfidentIncompleteRoutes, 0);
  assert.equal(protocol.failurePolicy.maximumGeneralMechanismRepairsPerFailureClass, 1);
  assert.equal(protocol.failurePolicy.developmentFixtureCanQualifyRelease, false);
});

test("keeps the bilingual Phase 4 protocol candid and candidate-free", () => {
  const source = readFileSync(__filename, "utf8");
  assert.doesNotMatch(source, /@vertex-palace\/core|packages\/core\/(?:dist|src)/);

  for (const document of [readFileSync(englishPath, "utf8"), readFileSync(chinesePath, "utf8")]) {
    assert.match(document, /Room Inventory/);
    assert.match(document, /0\.167/);
    assert.match(document, /0\.20/);
    assert.match(document, /TypeScript/);
    assert.match(document, /Python/);
    assert.match(document, /Go/);
    assert.match(document, /Rust/);
    assert.match(document, /17/);
    assert.match(document, /0\.90/);
    assert.match(document, /0\.70/);
    assert.match(document, /Round 26/);
    assert.match(document, /Agent/);
    assert.match(document, /npm `latest`/);
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
