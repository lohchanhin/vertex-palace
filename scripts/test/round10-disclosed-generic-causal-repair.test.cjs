const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(root, "docs", "research", "evidence");
const attempt1Path = path.join(evidenceRoot, "disclosed-routing-round-10-after-generic-causal-repair-attempt-1-0.4-alpha.json");
const attempt2Path = path.join(evidenceRoot, "disclosed-routing-round-10-after-generic-causal-repair-attempt-2-0.4-alpha.json");
const attempt3Path = path.join(evidenceRoot, "disclosed-routing-round-10-after-generic-causal-repair-attempt-3-0.4-alpha.json");
const auditPath = path.join(evidenceRoot, "round10-task-diff-coherence-audit-0.4-alpha.json");
const sensitivityPath = path.join(evidenceRoot, "disclosed-routing-round-10-attempt-3-task-coherent-sensitivity-0.4-alpha.json");

test("preserves the complete disclosed Round 10 repair chain", async () => {
  const [attempt1Bytes, attempt2Bytes, attempt3Bytes] = await Promise.all([
    readFile(attempt1Path),
    readFile(attempt2Path),
    readFile(attempt3Path)
  ]);
  assert.equal(sha256(attempt1Bytes), "BDE61CA89660A078A4CEE766D5CD883644BC1FB7E45C2D39EED4D3B1D79372C0");
  assert.equal(sha256(attempt2Bytes), "87AC24FE998D59F17C879750025F1CA51B1811D2F50678C0DF52AC6307731C57");
  assert.equal(sha256(attempt3Bytes), "82E1A5B65B6A517061D622B82D455A4FBF2E65B6A3E0B8B9F88D610D777CB955");

  const attempt1 = JSON.parse(attempt1Bytes);
  const attempt2 = JSON.parse(attempt2Bytes);
  const attempt3 = JSON.parse(attempt3Bytes);
  assert.deepEqual(
    [attempt1.aggregate.passedTargets, attempt2.aggregate.passedTargets, attempt3.aggregate.passedTargets],
    [5, 6, 7]
  );
  assert.deepEqual(
    [attempt1.aggregate.targetMacroRouteFocus, attempt2.aggregate.targetMacroRouteFocus, attempt3.aggregate.targetMacroRouteFocus],
    [0.665, 0.706, 0.79]
  );
  assert.equal(attempt3.gateStatus, "failed");
  assert.deepEqual(attempt3.gateFailures, ["core implementation/test coverage incomplete"]);
  assert.equal(attempt3.aggregate.targetMacroChangedFileCoverage, 0.975);
  assert.equal(attempt3.aggregate.overconfidentAgainstCoreTrials, 0);
  assert.equal(attempt3.aggregate.unsafeNarrowAgainstCoreTrials, 0);
  assert.equal(attempt3.aggregate.unsafeEnforcedStopAgainstCoreTrials, 0);
  assert.equal(attempt3.aggregate.metricDisagreementTrials, 0);
  assert.equal(attempt3.aggregate.evaluationContextRouteDisagreementTrials, 0);
  assert.equal(attempt3.aggregate.trackedTargetWorktreeChanges, 0);
});

test("locks the exact syn and uuid structural repairs", async () => {
  const attempt3 = JSON.parse(await readFile(attempt3Path, "utf8"));
  const routes = Object.fromEntries(attempt3.targets.map((target) => [
    target.name,
    target.repairedCandidate.trials[0].routeFiles
  ]));
  assert.deepEqual(routes.syn, ["codegen/src/snapshot.rs", "tests/debug/gen.rs"]);
  assert.deepEqual(routes.uuid, ["src/v1.ts", "src/test/v1.test.ts", "src/test/v6.test.ts"]);
  assert.equal(attempt3.targets.find((target) => target.name === "syn").repairedCandidate.status, "passed");
  assert.equal(attempt3.targets.find((target) => target.name === "uuid").repairedCandidate.status, "passed");
  assert.equal(attempt3.targets.find((target) => target.name === "itsdangerous").repairedCandidate.status, "failed");
});

test("keeps the post-hoc sensitivity analysis separate from the failed formal gate", async () => {
  const [attempt3Bytes, auditBytes, sensitivityBytes] = await Promise.all([
    readFile(attempt3Path),
    readFile(auditPath),
    readFile(sensitivityPath)
  ]);
  assert.equal(sha256(auditBytes), "BD2B1D12AC5AD2D00E8D815C99B514D59D09A90CE096C715F1DE5F5F757BED19");
  assert.equal(sha256(sensitivityBytes), "CD90BB673391D7F889AB19F8DE4D8C17B48171036D1D4FB538E32D5FA2666E22");

  const audit = JSON.parse(auditBytes);
  const sensitivity = JSON.parse(sensitivityBytes);
  assert.equal(audit.auditTiming, "post-hoc-after-round-10-disclosure");
  assert.equal(audit.formalGateStatusRemains, "failed");
  assert.equal(audit.auditedTargets[0].status, "mixed-semantic-commit");
  assert.deepEqual(
    audit.auditedTargets[0].unrelatedBundledFiles.map((file) => file.path),
    ["src/itsdangerous/timed.py", "tox.ini"]
  );
  assert.equal(sensitivity.formalGateStatus, "failed");
  assert.equal(sensitivity.sensitivityGateStatus, "passed");
  assert.equal(sensitivity.heldOutAgainstCandidate, false);
  assert.equal(sensitivity.aggregate.passedTargets, 7);
  assert.equal(sensitivity.aggregate.targetMacroChangedFileCoverage, 1);
  assert.equal(sensitivity.aggregate.targetMacroRouteFocus, 0.831);
  assert.equal(sensitivity.sourceEvidence.sha256, sha256(attempt3Bytes));
  assert.equal(sensitivity.coherenceAudit.sha256, sha256(auditBytes));
  assert.match(sensitivity.claimBoundary, /preregistered Round 10 gate remains failed/i);
  assert.match(sensitivity.claimBoundary, /fresh held-out Round 11/i);
});

test("keeps disclosed and sensitivity outputs create-only with bilingual claim boundaries", async () => {
  const [harness, analyzer, english, chinese] = await Promise.all([
    readFile(path.join(root, "scripts", "verify-disclosed-routing-round-10-after-generic-causal-repair.cjs"), "utf8"),
    readFile(path.join(root, "scripts", "analyze-round10-disclosed-sensitivity.cjs"), "utf8"),
    readFile(path.join(root, "docs", "research", "DISCLOSED_ROUTING_ROUND_10_GENERIC_CAUSAL_REPAIR_RESULT_0_4_ALPHA.md"), "utf8"),
    readFile(path.join(root, "docs", "zh-CN", "DISCLOSED_ROUTING_ROUND_10_GENERIC_CAUSAL_REPAIR_RESULT_0_4_ALPHA.md"), "utf8")
  ]);
  assert.match(harness, /flag:\s*"wx"/);
  assert.match(analyzer, /flag:\s*"wx"/);
  assert.match(english, /preregistered Round 10 gate remains \*\*FAILED\*\*/i);
  assert.match(english, /post-hoc/i);
  assert.match(english, /fresh Round 11/i);
  assert.match(chinese, /\*\*FAILED\*\*/);
  assert.match(chinese, /7\/7/);
  assert.match(chinese, /Round 11/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
