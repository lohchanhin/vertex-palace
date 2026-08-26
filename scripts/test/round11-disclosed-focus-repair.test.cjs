const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(root, "docs", "research", "evidence");
const manifestPath = path.join(evidenceRoot, "local-blind-routing-target-manifest-0.4-alpha-round-11.json");
const formalPath = path.join(evidenceRoot, "local-blind-routing-validation-0.4-alpha-round-11-attempt-1.json");
const previousRepairPath = path.join(
  evidenceRoot,
  "disclosed-routing-round-11-after-owner-closure-repair-attempt-3-0.4-alpha.json"
);
const focusRepairPath = path.join(
  evidenceRoot,
  "disclosed-routing-round-11-after-focus-repair-attempt-1-0.4-alpha.json"
);
const harnessPath = path.join(root, "scripts", "verify-disclosed-routing-round-11-after-focus-repair.cjs");
const englishReportPath = path.join(
  root,
  "docs",
  "research",
  "DISCLOSED_ROUTING_ROUND_11_FOCUS_REPAIR_RESULT_0_4_ALPHA.md"
);
const chineseReportPath = path.join(
  root,
  "docs",
  "zh-CN",
  "DISCLOSED_ROUTING_ROUND_11_FOCUS_REPAIR_RESULT_0_4_ALPHA.md"
);

test("locks the disclosed Round 11 focus-repair evidence and its immutable lineage", async () => {
  const [manifest, formal, previous, focusRepair, harness] = await Promise.all([
    readFile(manifestPath),
    readFile(formalPath),
    readFile(previousRepairPath),
    readFile(focusRepairPath),
    readFile(harnessPath)
  ]);

  assert.equal(sha256(manifest), "3174A480FE83E2B0D140262306C3ACADCA5C6BA0190165B1335C4AC3ED442ECE");
  assert.equal(sha256(formal), "570C2AAA0F5A593466F4EAB5161897DADE310EB211ABE1F2647586B872797720");
  assert.equal(sha256(previous), "939741A55D47839D970D261F3D4E91BBAF1B190272FFE336150131A64EBD3A2E");
  assert.equal(sha256(focusRepair), "6CC3EC6285324694B967FCCF49C57E263C20784B5DD6C2489512E92E6928F193");
  assert.equal(sha256(harness), "1495AA3D515D6C591AC70972A980F1AE07F3A2D473A67B8F6301CD9EB72BC65B");
});

test("records a passed disclosed gate without converting it into held-out evidence", async () => {
  const result = JSON.parse(await readFile(focusRepairPath, "utf8"));

  assert.equal(result.status, "completed");
  assert.equal(result.gateStatus, "passed");
  assert.deepEqual(result.gateFailures, []);
  assert.equal(result.evidenceClass, "disclosed-post-observation-static-routing-regression");
  assert.equal(result.heldOutAgainstCandidate, false);
  assert.match(result.claimBoundary, /not held out/i);
  assert.match(result.claimBoundary, /fresh Round 12 is required/i);
  assert.equal(result.previousDisclosedRepair.gateStatus, "failed");
  assert.deepEqual(result.previousDisclosedRepair.gateFailures, [
    "target-macro route focus below threshold"
  ]);
  assert.equal(
    result.previousDisclosedRepair.sha256,
    "939741A55D47839D970D261F3D4E91BBAF1B190272FFE336150131A64EBD3A2E"
  );
  assert.equal(result.comparisonWithPreviousDisclosedRepair.targetMacroRouteFocusDelta, 0.134);
});

test("passes every frozen static routing gate while preserving core recall and safety", async () => {
  const result = JSON.parse(await readFile(focusRepairPath, "utf8"));
  const aggregate = result.aggregate;

  assert.equal(aggregate.completedTargets, 8);
  assert.equal(aggregate.passedTargets, 8);
  assert.equal(aggregate.deterministicTargets, 8);
  assert.equal(aggregate.taskTypeMatchedTargets, 8);
  assert.equal(aggregate.coreSurfaceCompleteTargets, 8);
  assert.equal(aggregate.targetMacroChangedFileCoverage, 1);
  assert.equal(aggregate.targetMacroCoreSurfaceCoverage, 1);
  assert.equal(aggregate.targetMacroRouteFocus, 0.701);
  assert.equal(aggregate.targetMacroCoreRouteFocus, 0.67);
  assert.equal(aggregate.minimumTargetChangedFileCoverage, 1);
  assert.equal(aggregate.minimumTargetRouteFocus, 0.5);
  assert.equal(aggregate.maxContextEstimatedTokens, 3802);
  assert.equal(aggregate.executionErrorTargets, 0);
  assert.equal(aggregate.overconfidentAgainstCoreTrials, 0);
  assert.equal(aggregate.unsafeNarrowAgainstCoreTrials, 0);
  assert.equal(aggregate.unsafeEnforcedStopAgainstCoreTrials, 0);
  assert.equal(aggregate.metricDisagreementTrials, 0);
  assert.equal(aggregate.evaluationContextRouteDisagreementTrials, 0);
  assert.equal(aggregate.trackedTargetWorktreeChanges, 0);
  assert.equal(result.targets.length, 8);
  assert.ok(result.targets.every((target) => target.repairedCandidate.status === "passed"));
  assert.ok(result.targets.every((target) => target.repairedCandidate.deterministicRoutes));
  assert.ok(result.targets.every((target) =>
    target.repairedCandidate.trials.every((trial) => trial.coreSurfaceCoverage === 1)
  ));
});

test("keeps the verifier create-only and both reports explicit about the claim boundary", async () => {
  const [harness, english, chinese] = await Promise.all([
    readFile(harnessPath, "utf8"),
    readFile(englishReportPath, "utf8"),
    readFile(chineseReportPath, "utf8")
  ]);

  assert.match(harness, /flag:\s*"wx"/);
  assert.match(harness, /previousRepairSha256After, previousRepairSha256/);
  assert.match(harness, /heldOutAgainstCandidate:\s*false/);
  for (const report of [english, chinese]) {
    assert.match(report, /0\.567/);
    assert.match(report, /0\.701/);
    assert.match(report, /0\.70/);
    assert.match(report, /8\/8/);
    assert.match(report, /6CC3EC6285324694B967FCCF49C57E263C20784B5DD6C2489512E92E6928F193/);
  }
  assert.match(english, /not held-out|not held out/i);
  assert.match(english, /does not establish Agent correctness/i);
  assert.match(english, /fresh[\s\S]*Round 12|Round 12[\s\S]*fresh/i);
  assert.match(chinese, /不是 held-out 泛化证据/);
  assert.match(chinese, /不能证明 Agent/);
  assert.match(chinese, /全新[\s\S]*Round 12|Round 12[\s\S]*全新/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
