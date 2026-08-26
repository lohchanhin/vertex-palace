const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(root, "docs", "research", "evidence");
const formalPath = path.join(evidenceRoot, "local-blind-routing-validation-0.4-alpha-round-12-attempt-2.json");
const attempt5Path = path.join(
  evidenceRoot,
  "disclosed-routing-round-12-after-subject-owner-closure-repair-attempt-5-0.4-alpha.json"
);
const auditPath = path.join(
  evidenceRoot,
  "disclosed-round-12-bat-auxiliary-predictability-audit-0.4-alpha.json"
);
const englishReportPath = path.join(
  root,
  "docs/research/DISCLOSED_ROUTING_ROUND_12_SUBJECT_OWNER_CLOSURE_REPAIR_RESULT_0_4_ALPHA.md"
);
const chineseReportPath = path.join(
  root,
  "docs/zh-CN/DISCLOSED_ROUTING_ROUND_12_SUBJECT_OWNER_CLOSURE_REPAIR_RESULT_0_4_ALPHA.md"
);

test("locks the formal Round 12 failure and disclosed Attempt 5 result separately", async () => {
  const [formalBytes, attempt5Bytes, auditBytes] = await Promise.all([
    readFile(formalPath),
    readFile(attempt5Path),
    readFile(auditPath)
  ]);
  assert.equal(
    sha256(formalBytes),
    "4A7D6DBB68FBD6C1AEA3CD3159A092E5C2E8D6931187533F827A55BA6B1529D3"
  );
  assert.equal(
    sha256(attempt5Bytes),
    "C5D39DE53662FBB7CC76B13CA991A9ACB6AB70C0DABE2229F0CE25C8D94C3F37"
  );
  assert.equal(
    sha256(auditBytes),
    "0E9D9DD5345BD2223E1EFAA10AFACE3C42677D66644486680FAC147512F3A647"
  );

  const formal = JSON.parse(formalBytes);
  const attempt5 = JSON.parse(attempt5Bytes);
  const audit = JSON.parse(auditBytes);
  assert.equal(formal.status, "completed");
  assert.equal(formal.candidateGateStatus, "failed");
  assert.equal(attempt5.status, "completed");
  assert.equal(attempt5.gateStatus, "failed");
  assert.equal(attempt5.heldOutAgainstCandidate, false);
  assert.deepEqual(attempt5.gateFailures, ["bounded auxiliary coverage incomplete"]);
  assert.equal(attempt5.aggregate.passedTargets, 8);
  assert.equal(attempt5.aggregate.coreSurfaceCompleteTargets, 8);
  assert.equal(attempt5.aggregate.auxiliarySurfaceCompleteTargets, 1);
  assert.equal(attempt5.aggregate.auxiliarySurfaceTargetCount, 2);
  assert.equal(attempt5.aggregate.targetMacroChangedFileCoverage, 0.958);
  assert.equal(attempt5.aggregate.targetMacroCoreSurfaceCoverage, 1);
  assert.equal(attempt5.aggregate.targetMacroRouteFocus, 0.771);
  assert.equal(attempt5.aggregate.overconfidentAgainstCoreTrials, 0);
  assert.equal(attempt5.aggregate.trackedTargetWorktreeChanges, 0);

  assert.equal(audit.status, "completed");
  assert.equal(audit.heldOutAgainstCandidate, false);
  assert.equal(audit.repository.routeCommit, "af1f53d9a977154216d01435991fe33631b74713");
  assert.equal(audit.counts.changelogCommits, 595);
  assert.equal(audit.counts.printerCommits, 225);
  assert.equal(audit.counts.integrationTestCommits, 223);
  assert.equal(audit.counts.changelogWithPrinter, 33);
  assert.equal(audit.counts.changelogWithIntegrationTests, 65);
  assert.equal(audit.counts.allThree, 18);
  assert.equal(audit.decision.classification, "unresolved-auxiliary-prediction-boundary");
});

test("keeps the bilingual Round 12 disclosed report bounded and reproducible", async () => {
  const [english, chinese] = await Promise.all([
    readFile(englishReportPath, "utf8"),
    readFile(chineseReportPath, "utf8")
  ]);

  for (const report of [english, chinese]) {
    assert.match(report, /FAILED/);
    assert.match(report, /post-observation|事后回归/i);
    assert.match(report, /0\.958/);
    assert.match(report, /0\.771/);
    assert.match(report, /1\/2/);
    assert.match(report, /4A7D6DBB68FBD6C1AEA3CD3159A092E5C2E8D6931187533F827A55BA6B1529D3/);
    assert.match(report, /C5D39DE53662FBB7CC76B13CA991A9ACB6AB70C0DABE2229F0CE25C8D94C3F37/);
  }
  assert.match(english, /support no claim about[\s\S]{0,40}Agent correctness/i);
  assert.match(chinese, /不能证明 Agent/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
