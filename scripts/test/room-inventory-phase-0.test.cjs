const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const schemaPath = fromRoot("docs/research/evidence/room-inventory-schema-0.5.json");
const protocolPath = fromRoot("docs/research/evidence/room-inventory-round-26-preregistration-0.5.json");
const fixturePath = fromRoot("packages/core/test/fixtures/room-inventory/contract.json");
const englishSchemaPath = fromRoot("docs/research/ROOM_INVENTORY_SCHEMA_0_5.md");
const chineseSchemaPath = fromRoot("docs/zh-CN/ROOM_INVENTORY_SCHEMA_0_5.md");
const englishProtocolPath = fromRoot("docs/research/ROOM_INVENTORY_ROUND_26_PROTOCOL_0_5.md");
const chineseProtocolPath = fromRoot("docs/zh-CN/ROOM_INVENTORY_ROUND_26_PROTOCOL_0_5.md");

test("freezes the optional Room Inventory schema without activating production routing", () => {
  const schema = readJson(schemaPath);
  const sharedTypes = readFileSync(fromRoot("packages/shared/src/types.ts"), "utf8");
  const buildNodes = readFileSync(fromRoot("packages/core/src/indexer/build-nodes.ts"), "utf8");

  assert.equal(schema.status, "phase-0-contract-frozen");
  assert.equal(schema.identityVersion, 1);
  assert.equal(schema.compatibility.metadataIsOptional, true);
  assert.equal(schema.compatibility.existingPalaceModesUnchanged, true);
  assert.equal(schema.compatibility.defaultRoutingChanged, false);
  assert.equal(schema.compatibility.existingNodeIdsChanged, false);
  assert.equal(schema.storage.oneMarkdownFilePerObject, false);
  assert.equal(schema.storage.maximumFutureObjectEdgesPerNode, 32);
  assert.deepEqual(schema.objectKinds, [
    "function",
    "method",
    "constructor",
    "class",
    "interface",
    "type",
    "constant",
    "property",
    "endpoint",
    "test"
  ]);
  assert.match(sharedTypes, /object\?: PalaceObjectMetadata;/);
  assert.doesNotMatch(buildNodes, /createPalaceObjectMetadata|object\s*:/);
});

test("freezes five language fixtures and their line-shift identity requirement", () => {
  const schema = readJson(schemaPath);
  const fixture = readJson(fixturePath);

  assert.equal(sha256(fixturePath), schema.fixtureContract.sha256);
  assert.equal(schema.fixtureContract.lineShiftIdentityRetention, 1);
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.identityVersion, 1);
  assert.deepEqual(
    fixture.cases.map((entry) => entry.language),
    ["typescript", "javascript", "python", "go", "rust"]
  );
  assert.deepEqual(
    fixture.cases.map((entry) => entry.objectKind),
    ["method", "method", "method", "method", "function"]
  );
});

test("locks Round 26 methods and gates before target selection or candidate execution", () => {
  const protocol = readJson(protocolPath);

  assert.equal(protocol.status, "protocol-locked-target-selection-pending");
  assert.equal(protocol.targetSelection.status, "pending");
  assert.equal(protocol.targetSelection.totalTargets, 16);
  assert.equal(sumValues(protocol.targetSelection.languages), 16);
  assert.equal(sumValues(protocol.targetSelection.profiles), 16);
  assert.equal(protocol.targetSelection.freshTargetsRequired, true);
  assert.equal(protocol.targetSelection.developmentTargetsMayBeReused, false);
  assert.equal(protocol.execution.repetitionsPerCondition, 2);
  assert.equal(protocol.execution.conditionOrderBalanced, true);
  assert.equal(protocol.execution.sequentialOnly, true);
  assert.equal(protocol.gates.exactTargetObjectRecall, 1);
  assert.equal(protocol.gates.minimumImplementationTestClosure, 0.95);
  assert.equal(protocol.gates.minimumMacroObjectFocus, 0.75);
  assert.equal(protocol.gates.maximumWrongForcedStops, 0);
  assert.equal(protocol.gates.maximumContextTokens, 6000);
  assert.equal(protocol.failurePolicy.targetOracleOrThresholdRewriteAllowed, false);
  assert.match(protocol.claimBoundary, /separate randomized paired Agent study/i);
});

test("keeps the English and Simplified Chinese contracts aligned", () => {
  const documents = [
    readFileSync(englishSchemaPath, "utf8"),
    readFileSync(chineseSchemaPath, "utf8"),
    readFileSync(englishProtocolPath, "utf8"),
    readFileSync(chineseProtocolPath, "utf8")
  ];

  for (const document of documents) {
    assert.match(document, /Room Inventory/);
    assert.match(document, /TypeScript/);
    assert.match(document, /Python/);
    assert.match(document, /Go/);
    assert.match(document, /Rust/);
  }
  for (const document of documents.slice(0, 2)) {
    assert.match(document, /declaration key/i);
    assert.match(document, /semantic hash/i);
    assert.match(document, /e7b62cc10e821f2adedead527fa77dc158be4866f6aab4b3724afef06d9ec460/i);
  }
  for (const document of documents.slice(2)) {
    assert.match(document, /Round 26/);
    assert.match(document, /16/);
    assert.match(document, /6,000/);
    assert.match(document, /0\.95/);
    assert.match(document, /0\.75/);
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

function sumValues(value) {
  return Object.values(value).reduce((sum, count) => sum + count, 0);
}
