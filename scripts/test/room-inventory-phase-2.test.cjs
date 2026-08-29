const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const evidencePath = fromRoot("docs/research/evidence/room-inventory-phase-2-object-routing-0.5.json");
const englishPath = fromRoot("docs/research/ROOM_INVENTORY_PHASE_2_OBJECT_ROUTING_0_5.md");
const chinesePath = fromRoot("docs/zh-CN/ROOM_INVENTORY_PHASE_2_OBJECT_ROUTING_0_5.md");

test("keeps Phase 2 object relations bounded, generic, and default-off", () => {
  const evidence = readJson(evidencePath);

  assert.equal(evidence.status, "phase-2-object-routing-development-verified");
  assert.equal(evidence.activation.defaultEnabled, false);
  assert.equal(evidence.activation.objectRoutingRequiresPersistedMetadata, true);
  assert.equal(evidence.activation.cliSchemaChanged, false);
  assert.equal(evidence.activation.mcpSchemaChanged, false);
  assert.equal(evidence.relations.maximumInferredOutgoingPerObject, 32);
  assert.equal(evidence.relations.uniqueDeclarationRequiredForReferenceRelation, true);
  assert.equal(evidence.relations.dynamicDispatchResolved, false);
  assert.equal(evidence.relations.invertedReferenceIndex, true);
  assert.equal(evidence.relations.repositorySpecificRules, 0);
});

test("preserves ambiguity and safety boundaries in object-first scoring", () => {
  const evidence = readJson(evidencePath);

  assert.equal(evidence.scoring.qualifiedIdentityFirst, true);
  assert.equal(evidence.scoring.ambiguousLocalIdentityForcedDisambiguation, false);
  assert.equal(evidence.scoring.identityMatchCanForceStop, false);
  assert.equal(evidence.scoring.identityMatchCanBypassAbstention, false);
  assert.equal(evidence.focusedTests.repeatedIndexAgreement, 1);
  assert.equal(evidence.focusedTests.defaultObjectScoreReasons, 0);
  assert.equal(evidence.exactObjectSmoke.priority, 1);
  assert.equal(evidence.exactObjectSmoke.loadLevel, "full_symbol");
  assert.equal(evidence.exactObjectSmoke.overallRouteConfidence, 0.4);
});

test("records bounded self-repository engineering cost without a performance claim", () => {
  const evidence = readJson(evidencePath);
  const benchmark = evidence.selfRepositoryBenchmark;

  assert.equal(benchmark.classification, "development-smoke-not-randomized");
  assert.equal(benchmark.conditionsSequential, true);
  assert.equal(benchmark.baseline.nodes, benchmark.enabled.nodes);
  assert.equal(benchmark.baseline.symbolNodes, benchmark.enabled.symbolNodes);
  assert.equal(benchmark.enabled.objects, 4495);
  assert.ok(benchmark.enabled.maximumObservedOutgoingObjectRelations <= evidence.relations.maximumInferredOutgoingPerObject);
  assert.ok(benchmark.indexSizeMultiplier <= benchmark.developmentSizeGate);
  assert.ok(benchmark.indexTimeRegression <= benchmark.developmentTimeRegressionGate);
  assert.match(evidence.claimBoundary, /does not establish Round 26 qualification/i);
});

test("preserves the negative broad self-evaluation without turning it into a target-specific repair", () => {
  const evidence = readJson(evidencePath);
  const comparison = evidence.broadSelfEvaluation;

  assert.equal(comparison.classification, "disclosed-post-implementation-self-evaluation");
  assert.equal(comparison.outcome, "no-broad-route-improvement");
  assert.equal(comparison.stable040.coreCoverage, 0.286);
  assert.equal(comparison.local05Candidate.coreCoverage, 0.286);
  assert.equal(comparison.stable040.routeFocus, comparison.local05Candidate.routeFocus);
  assert.equal(comparison.candidateIndexRestored, true);
  assert.match(comparison.interpretation, /did not improve broad multi-file task closure/i);
});

test("keeps English and Simplified Chinese Phase 2 records aligned", () => {
  for (const document of [readFileSync(englishPath, "utf8"), readFileSync(chinesePath, "utf8")]) {
    assert.match(document, /Room Inventory/);
    assert.match(document, /contains/);
    assert.match(document, /calls/);
    assert.match(document, /tests/);
    assert.match(document, /tested_by/);
    assert.match(document, /32/);
    assert.match(document, /4,495/);
    assert.match(document, /1\.0914/);
    assert.match(document, /1\.0735/);
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
