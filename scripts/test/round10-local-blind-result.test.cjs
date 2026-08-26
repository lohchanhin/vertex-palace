const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const resultPath = path.join(
  root,
  "docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-10-attempt-1.json"
);

test("preserves the valid mixed Round 10 held-out result", async () => {
  const resultBytes = await readFile(resultPath);
  const result = JSON.parse(resultBytes.toString("utf8"));

  assert.equal(sha256(resultBytes), "C5D90E362119C558744836820DC47FB5C8869EE565CCC17E619E5298F03B3CB2");
  assert.equal(result.status, "completed");
  assert.deepEqual(result.validityFailures, []);
  assert.equal(result.candidateGateStatus, "failed");
  assert.equal(result.advancementStatus, "not-eligible-for-agent-protocol");
  assert.equal(result.aggregate.baseline.environmentOrSetupFailures, 0);
  assert.equal(result.aggregate.candidate.environmentOrSetupFailures, 0);
  assert.equal(result.aggregate.baseline.harnessContractFailures, 0);
  assert.equal(result.aggregate.candidate.harnessContractFailures, 0);
});

test("locks the Round 10 coverage, focus, safety, and cost tradeoff", async () => {
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  const { baseline, candidate } = result.aggregate;

  assert.equal(baseline.passedTargets, 3);
  assert.equal(candidate.passedTargets, 4);
  assert.equal(baseline.coreSurfaceCompleteTargets, 4);
  assert.equal(candidate.coreSurfaceCompleteTargets, 5);
  assert.equal(baseline.targetMacroChangedFileCoverage, 0.654);
  assert.equal(candidate.targetMacroChangedFileCoverage, 0.804);
  assert.equal(baseline.targetMacroRouteFocus, 0.729);
  assert.equal(candidate.targetMacroRouteFocus, 0.81);
  assert.equal(baseline.overconfidentTrials, 8);
  assert.equal(candidate.overconfidentTrials, 0);
  assert.equal(baseline.unsafeNarrowModeTrials, 6);
  assert.equal(candidate.unsafeNarrowModeTrials, 0);
  assert.equal(baseline.unsafeEnforcedStopTrials, 2);
  assert.equal(candidate.unsafeEnforcedStopTrials, 0);
  assert.equal(result.comparison.aggregateDelta.contextEstimatedTokensMean, 883.625);
  assert.equal(result.comparison.aggregateDelta.staticCommandElapsedMsTotal, 8615);
  assert.equal(candidate.metricDisagreementTrials, 6);
});

test("keeps both Round 10 reports explicit about the failed gate and claim boundary", async () => {
  const english = await readFile(
    path.join(root, "docs/research/LOCAL_BLIND_ROUTING_ROUND_10_RESULT_0_4_ALPHA.md"),
    "utf8"
  );
  const chinese = await readFile(
    path.join(root, "docs/zh-CN/LOCAL_BLIND_ROUTING_ROUND_10_RESULT_0_4_ALPHA.md"),
    "utf8"
  );

  assert.match(english, /failed the preregistered\s+absolute gate/i);
  assert.match(english, /not eligible for an end-to-end Agent A\/B/i);
  assert.match(english, /must not be presented as proof of Agent correctness/i);
  assert.match(english, /Round 11/);
  assert.match(chinese, /没有通过[\s\S]*绝对门槛/);
  assert.match(chinese, /不能进入端到端 Agent A\/B/);
  assert.match(chinese, /不能被描述成[\s\S]*Agent 正确率/);
  assert.match(chinese, /Round 11/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
