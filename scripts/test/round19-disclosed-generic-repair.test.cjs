const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(root, "docs", "research", "evidence");
const formalPath = path.join(
  evidenceRoot,
  "local-blind-routing-validation-0.4-alpha-round-19-attempt-2.json"
);
const disclosedAttempt1Path = path.join(
  evidenceRoot,
  "disclosed-routing-round-19-after-generic-repair-attempt-1-0.4-alpha.json"
);
const disclosedAttempt2Path = path.join(
  evidenceRoot,
  "disclosed-routing-round-19-after-generic-repair-attempt-2-0.4-alpha.json"
);
const disclosedAttempt3Path = path.join(
  evidenceRoot,
  "disclosed-routing-round-19-after-generic-repair-attempt-3-0.4-alpha.json"
);
const englishReportPath = path.join(
  root,
  "docs", "research", "DISCLOSED_ROUTING_ROUND_19_GENERIC_REPAIR_RESULT_0_4_ALPHA.md"
);
const chineseReportPath = path.join(
  root,
  "docs", "zh-CN", "DISCLOSED_ROUTING_ROUND_19_GENERIC_REPAIR_RESULT_0_4_ALPHA.md"
);

test("keeps formal Round 19 and its disclosed repair as separate evidence classes", async () => {
  const [formalBytes, attempt1Bytes, attempt2Bytes, attempt3Bytes] = await Promise.all([
    readFile(formalPath),
    readFile(disclosedAttempt1Path),
    readFile(disclosedAttempt2Path),
    readFile(disclosedAttempt3Path)
  ]);
  assert.equal(
    sha256(formalBytes),
    "84A37CFE029977CF22594A66DA2F9769F4703AE641FD43647C76AA8469EB383B"
  );
  assert.equal(
    sha256(attempt1Bytes),
    "580018913112BAD1D251E99DBCBFE4A953B2ED33E990783D5F653747BA53D6B2"
  );
  assert.equal(
    sha256(attempt2Bytes),
    "4568BDDEF6AC0B83EF2E06E8845CA4F03FFB38C243884B8FA571CA9BBADC41CE"
  );
  assert.equal(
    sha256(attempt3Bytes),
    "395E7A76EF10CF96DA04C46D028FDF0260E138AACA0D34A24D58A2EEF749CB08"
  );

  const formal = JSON.parse(formalBytes);
  const attempt1 = JSON.parse(attempt1Bytes);
  const attempt2 = JSON.parse(attempt2Bytes);
  const attempt3 = JSON.parse(attempt3Bytes);
  assert.equal(formal.candidateGateStatus, "failed");
  for (const disclosed of [attempt1, attempt2, attempt3]) {
    assert.equal(disclosed.status, "completed");
    assert.equal(disclosed.gateStatus, "failed");
    assert.equal(disclosed.heldOutAgainstCandidate, false);
    assert.equal(disclosed.formalEvidence.preservedWithoutModification, true);
    assert.equal(disclosed.aggregate.completedTargets, 8);
    assert.equal(disclosed.aggregate.completedTrials, 16);
    assert.equal(disclosed.aggregate.deterministicTargets, 8);
    assert.equal(disclosed.aggregate.metricDisagreementTrials, 0);
    assert.equal(disclosed.aggregate.trackedTargetWorktreeChanges, 0);
  }
  assert.equal(attempt1.aggregate.targetMacroRouteFocus, 0.724);
  assert.equal(attempt2.aggregate.targetMacroRouteFocus, 0.708);
  assert.equal(attempt3.aggregate.coreSurfaceCompleteTargets, 7);
  assert.equal(attempt3.aggregate.targetMacroChangedFileCoverage, 0.896);
  assert.equal(attempt3.aggregate.targetMacroRouteFocus, 0.771);
  assert.equal(attempt3.aggregate.minimumTargetChangedFileCoverage, 0.5);
  assert.equal(attempt3.aggregate.minimumTargetRouteFocus, 0.25);
  assert.equal(attempt3.aggregate.routeFileTotal, 25);

  const attempt2CcRs = attempt2.targets.find((target) => target.name === "cc-rs");
  assert.deepEqual(attempt2CcRs.repairedCandidate.trials[0].routeFiles, [
    "src/target.rs",
    "src/lib.rs",
    "src/flags.rs",
    "tests/test.rs"
  ]);

  const semver = attempt3.targets.find((target) => target.name === "semver");
  assert.deepEqual(semver.repairedCandidate.trials[0].routeFiles, [
    "src/parse.rs",
    "src/lib.rs",
    "src/error.rs",
    "tests/test_version.rs"
  ]);
  assert.equal(semver.repairedCandidate.trials[0].changedFileCoverage, 1);
  assert.equal(semver.repairedCandidate.trials[0].routeFocus, 0.75);

  const ccRs = attempt3.targets.find((target) => target.name === "cc-rs");
  assert.deepEqual(ccRs.repairedCandidate.trials[0].routeFiles, ["src/lib.rs", "tests/test.rs"]);
  assert.equal(ccRs.repairedCandidate.trials[0].changedFileCoverage, 1);
  assert.equal(ccRs.repairedCandidate.trials[0].routeFocus, 1);
});

test("keeps the bilingual report candid about post-observation limits and the public freeze", async () => {
  const [english, chinese] = await Promise.all([
    readFile(englishReportPath, "utf8"),
    readFile(chineseReportPath, "utf8")
  ]);
  for (const report of [english, chinese]) {
    assert.match(report, /FAILED/);
    assert.match(report, /0\.896/);
    assert.match(report, /0\.724/);
    assert.match(report, /0\.708/);
    assert.match(report, /0\.771/);
    assert.match(report, /84A37CFE029977CF22594A66DA2F9769F4703AE641FD43647C76AA8469EB383B/);
    assert.match(report, /commit|push/);
    assert.match(report, /npm/i);
  }
  assert.match(english, /cannot establish[\s\S]{0,80}Agent correctness/i);
  assert.match(chinese, /不能证明 Agent/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
