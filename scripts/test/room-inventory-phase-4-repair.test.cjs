const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const firstPath = fromRoot("docs/research/evidence/room-inventory-phase-4-first-observation-0.5.json");
const repairPath = fromRoot("docs/research/evidence/room-inventory-phase-4-repair-1-0.5.json");
const productPath = fromRoot("packages/core/src/router/evidence-facet-planner.ts");
const selfEvaluationPath = fromRoot("docs/research/evidence/room-inventory-phase-4-post-repair-self-evaluation-0.5.json");
const englishPath = fromRoot("docs/research/ROOM_INVENTORY_PHASE_4_REPAIR_1_0_5.md");
const chinesePath = fromRoot("docs/zh-CN/ROOM_INVENTORY_PHASE_4_REPAIR_1_0_5.md");

test("preserves the failed first observation and passing Repair 1 separately", () => {
  const first = readJson(firstPath);
  const repair = readJson(repairPath);

  assert.equal(sha256(firstPath), "bd5859955841947f74db3b395d30f0b63433b70eedf3d98ba63bbe53aa412c5b");
  assert.equal(sha256(repairPath), "18a75b367eb78a84b90e21da53857ebc17fa924004e571198664d5ffe576fa38");
  assert.equal(first.fixture.oracleSha256, repair.fixture.oracleSha256);
  assert.equal(first.fixture.fixtureSourcesSha256, repair.fixture.fixtureSourcesSha256);
  assert.equal(first.overallPass, false);
  assert.equal(repair.observation, "repair-1");
  assert.equal(repair.immutable, true);
  assert.equal(repair.overallPass, true);
  assert.deepEqual(repair.baseline, first.baseline);
  assert.deepEqual(repair.enabled, first.enabled);
});

test("locks complete focused facet closure and default-off compatibility", () => {
  const repair = readJson(repairPath);

  assert.equal(repair.metrics.routeDecisionRate, 1);
  assert.equal(repair.metrics.macroRequiredFileCoverage, 1);
  assert.equal(repair.metrics.minimumPerTargetRequiredFileCoverage, 1);
  assert.equal(repair.metrics.explicitFacetClosureRate, 1);
  assert.equal(repair.metrics.focusedVerificationCoverage, 1);
  assert.equal(repair.metrics.generatedArtifactCoverage, 1);
  assert.equal(repair.metrics.macroRouteFocus, 1);
  assert.equal(repair.metrics.minimumPerTargetRouteFocus, 1);
  assert.equal(repair.metrics.forbiddenDecoyHits, 0);
  assert.equal(repair.metrics.deterministicRouteAgreement, 1);
  assert.equal(repair.metrics.maximumContextTokens, 1300);
  assert.equal(repair.metrics.wrongForcedStops, 0);
  assert.equal(repair.metrics.overconfidentIncompleteRoutes, 0);
  assert.equal(repair.baseline.objects, 0);
  assert.equal(repair.baseline.objectRelations, 0);
  assert.ok(repair.targets.every((target) => (
    target.requiredFileCoverage === 1
      && target.routeFocus === 1
      && target.explicitFacetClosure === true
      && target.forbiddenHits.length === 0
      && target.deterministic === true
  )));
  assert.ok(Object.values(repair.gates).every(Boolean));
});

test("keeps the product repair generic and fixture-independent", () => {
  const source = readFileSync(productPath, "utf8");

  assert.doesNotMatch(source, /room-inventory-evidence-roles/);
  assert.doesNotMatch(source, /typescript-generated-compound|python-parser-compatibility|go-parser-compatibility|rust-parser-compatibility/);
  assert.doesNotMatch(source, /compileEnvelope|open_session|DispatchOrder|dispatch_route/);
  assert.doesNotMatch(source, /lohchanhin|benchmarks-(?:ab-)?demo|github\.com\//);
});

test("preserves the negative same-task generalization diagnostic", () => {
  const evaluation = readJson(selfEvaluationPath);
  const implementation = evaluation.repairImplementationTask;
  const stable = evaluation.samePhase3Task.stable040;
  const candidate = evaluation.samePhase3Task.local05Repair1;

  assert.equal(sha256(selfEvaluationPath), "1952abc3cdd4c0fad78ef2ea5f807b989442a3e78b05627c4e4792e949786dcb");
  assert.equal(evaluation.outcome, "synthetic-repair-pass-without-prior-self-task-generalization");
  assert.equal(implementation.coreCoverage, 1);
  assert.equal(implementation.changedFileCoverage, 1);
  assert.equal(implementation.routeFocus, 0.4);
  assert.equal(implementation.calibrationStatus, "underconfident");
  assert.equal(stable.coreCoverage, 0.167);
  assert.equal(stable.routeFocus, 0.2);
  assert.equal(candidate.coreCoverage, 0.167);
  assert.equal(candidate.routeFocus, 0.167);
  assert.equal(candidate.confidence, 0.4);
  assert.equal(candidate.calibrationStatus, "overconfident");
  assert.match(evaluation.requiredAction, /Do not perform a second post-hoc mechanism repair/);
});

test("keeps bilingual repair reporting aligned with fresh-qualification limits", () => {
  for (const document of [readFileSync(englishPath, "utf8"), readFileSync(chinesePath, "utf8")]) {
    assert.match(document, /Room Inventory/);
    assert.match(document, /13 \/ 17/);
    assert.match(document, /17 \/ 17/);
    assert.match(document, /0\.7647/);
    assert.match(document, /1\.0000/);
    assert.match(document, /1,745/);
    assert.match(document, /1,300/);
    assert.match(document, /insufficient/);
    assert.match(document, /underconfident/);
    assert.match(document, /0\.167/);
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
