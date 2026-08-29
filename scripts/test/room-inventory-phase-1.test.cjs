const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const evidencePath = fromRoot("docs/research/evidence/room-inventory-phase-1-index-integration-0.5.json");
const englishPath = fromRoot("docs/research/ROOM_INVENTORY_PHASE_1_INDEX_INTEGRATION_0_5.md");
const chinesePath = fromRoot("docs/zh-CN/ROOM_INVENTORY_PHASE_1_INDEX_INTEGRATION_0_5.md");

test("records Phase 1 as default-off metadata integration rather than production routing", () => {
  const evidence = readJson(evidencePath);

  assert.equal(evidence.status, "phase-1-index-integration-verified");
  assert.equal(evidence.activation.defaultEnabled, false);
  assert.equal(evidence.activation.environmentVariable, "VERTEX_PALACE_EXPERIMENTAL_ROOM_INVENTORY");
  assert.equal(evidence.activation.cliSchemaChanged, false);
  assert.equal(evidence.activation.mcpSchemaChanged, false);
  assert.equal(evidence.integration.objectFirstRoutingEnabled, false);
  assert.equal(evidence.integration.objectRelationsEnabled, false);
  assert.equal(evidence.integration.existingNodeIdsChanged, false);
  assert.equal(evidence.integration.existingRouteInputsChanged, false);
  assert.equal(evidence.integration.persistedSchemaVersionChanged, false);
});

test("preserves the measured five-language fixture result and claim boundary", () => {
  const evidence = readJson(evidencePath);
  const fixture = evidence.developmentFixture;

  assert.deepEqual(evidence.integration.supportedLanguages, [
    "typescript",
    "javascript",
    "python",
    "go",
    "rust"
  ]);
  assert.equal(fixture.baseline.nodes, fixture.enabled.nodes);
  assert.equal(fixture.baseline.edges, fixture.enabled.edges);
  assert.equal(fixture.baseline.symbolNodes, fixture.enabled.symbolNodes);
  assert.equal(fixture.baseline.objects, 0);
  assert.equal(fixture.enabled.objects, 8);
  assert.equal(fixture.targetMetadataRecall, 1);
  assert.equal(fixture.lineShiftIdentityRetention, 1);
  assert.equal(fixture.nodeRoutingProjectionAgreement, 1);
  assert.ok(fixture.indexSizeMultiplier <= fixture.round26MaximumIndexSizeMultiplier);
  assert.match(evidence.claimBoundary, /does not establish object-first route quality/i);
});

test("keeps English and Simplified Chinese Phase 1 explanations aligned", () => {
  const documents = [readFileSync(englishPath, "utf8"), readFileSync(chinesePath, "utf8")];

  for (const document of documents) {
    assert.match(document, /Room Inventory/);
    assert.match(document, /VERTEX_PALACE_EXPERIMENTAL_ROOM_INVENTORY/);
    assert.match(document, /TypeScript/);
    assert.match(document, /Python/);
    assert.match(document, /Go/);
    assert.match(document, /Rust/);
    assert.match(document, /1\.1128/);
    assert.match(document, /Round 26/);
    assert.match(document, /CLI/);
    assert.match(document, /MCP/);
  }
});

function fromRoot(relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}
