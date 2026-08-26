const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(root, "docs", "research", "evidence");
const manifestPath = path.join(evidenceRoot, "local-blind-routing-target-manifest-0.4-alpha-round-11.json");
const originalPath = path.join(evidenceRoot, "local-blind-routing-validation-0.4-alpha-round-11-attempt-1.json");
const disclosedAttempt1Path = path.join(
  evidenceRoot,
  "disclosed-routing-round-11-after-owner-closure-repair-attempt-1-0.4-alpha.json"
);
const disclosedAttempt2Path = path.join(
  evidenceRoot,
  "disclosed-routing-round-11-after-owner-closure-repair-attempt-2-0.4-alpha.json"
);
const disclosedAttempt3Path = path.join(
  evidenceRoot,
  "disclosed-routing-round-11-after-owner-closure-repair-attempt-3-0.4-alpha.json"
);
const disclosedAttempt7Path = path.join(
  evidenceRoot,
  "disclosed-routing-round-11-after-owner-closure-repair-attempt-7-0.4-alpha.json"
);
const englishReportPath = path.join(
  root,
  "docs",
  "research",
  "DISCLOSED_ROUTING_ROUND_11_OWNER_CLOSURE_REPAIR_RESULT_0_4_ALPHA.md"
);
const chineseReportPath = path.join(
  root,
  "docs",
  "zh-CN",
  "DISCLOSED_ROUTING_ROUND_11_OWNER_CLOSURE_REPAIR_RESULT_0_4_ALPHA.md"
);
const harnessPath = path.join(root, "scripts", "verify-disclosed-routing-round-11-after-owner-closure-repair.cjs");

test("preserves the immutable formal Round 11 evidence and target manifest", async () => {
  const [
    manifestBytes,
    originalBytes,
    disclosedAttempt1Bytes,
    disclosedAttempt2Bytes,
    disclosedAttempt3Bytes,
    disclosedAttempt7Bytes
  ] = await Promise.all([
    readFile(manifestPath),
    readFile(originalPath),
    readFile(disclosedAttempt1Path),
    readFile(disclosedAttempt2Path),
    readFile(disclosedAttempt3Path),
    readFile(disclosedAttempt7Path)
  ]);

  assert.equal(sha256(manifestBytes), "3174A480FE83E2B0D140262306C3ACADCA5C6BA0190165B1335C4AC3ED442ECE");
  assert.equal(sha256(originalBytes), "570C2AAA0F5A593466F4EAB5161897DADE310EB211ABE1F2647586B872797720");
  assert.equal(
    sha256(disclosedAttempt1Bytes),
    "2509C3CA8D6C6D9956D799CF8DB35E65F79126F3B72C9980AD1E85EA95A4B992"
  );
  assert.equal(
    sha256(disclosedAttempt2Bytes),
    "C0CCA360BADB7794B32AAAD567634E1A3C00D37486AD0A07E14FA00C9B32F215"
  );
  assert.equal(
    sha256(disclosedAttempt3Bytes),
    "939741A55D47839D970D261F3D4E91BBAF1B190272FFE336150131A64EBD3A2E"
  );
  assert.equal(
    sha256(disclosedAttempt7Bytes),
    "065E6A331533C3A75BF65A96691C3040BB86385A7A4A2DB63DC003231DCEC7B5"
  );

  const manifest = JSON.parse(manifestBytes);
  const original = JSON.parse(originalBytes);
  const disclosedAttempt1 = JSON.parse(disclosedAttempt1Bytes);
  const disclosedAttempt2 = JSON.parse(disclosedAttempt2Bytes);
  const disclosedAttempt3 = JSON.parse(disclosedAttempt3Bytes);
  const disclosedAttempt7 = JSON.parse(disclosedAttempt7Bytes);
  assert.equal(manifest.targets.length, 8);
  assert.equal(original.status, "completed");
  assert.equal(original.candidateGateStatus, "failed");
  assert.equal(original.targets.length, 8);
  assert.equal(disclosedAttempt1.status, "completed");
  assert.equal(disclosedAttempt1.gateStatus, "failed");
  assert.equal(disclosedAttempt1.heldOutAgainstCandidate, false);
  assert.equal(disclosedAttempt1.targets.length, 8);
  assert.equal(disclosedAttempt2.status, "completed");
  assert.equal(disclosedAttempt2.gateStatus, "failed");
  assert.equal(disclosedAttempt2.heldOutAgainstCandidate, false);
  assert.equal(disclosedAttempt2.aggregate.passedTargets, 7);
  assert.equal(disclosedAttempt2.targets.length, 8);
  assert.equal(disclosedAttempt3.status, "completed");
  assert.equal(disclosedAttempt3.gateStatus, "failed");
  assert.equal(disclosedAttempt3.heldOutAgainstCandidate, false);
  assert.deepEqual(disclosedAttempt3.gateFailures, ["target-macro route focus below threshold"]);
  assert.equal(disclosedAttempt3.aggregate.passedTargets, 8);
  assert.equal(disclosedAttempt3.aggregate.coreSurfaceCompleteTargets, 8);
  assert.equal(disclosedAttempt3.aggregate.targetMacroChangedFileCoverage, 1);
  assert.equal(disclosedAttempt3.aggregate.targetMacroRouteFocus, 0.567);
  assert.equal(disclosedAttempt3.targets.length, 8);
  assert.equal(disclosedAttempt7.status, "completed");
  assert.equal(disclosedAttempt7.gateStatus, "passed");
  assert.equal(disclosedAttempt7.heldOutAgainstCandidate, false);
  assert.deepEqual(disclosedAttempt7.gateFailures, []);
  assert.equal(disclosedAttempt7.aggregate.passedTargets, 8);
  assert.equal(disclosedAttempt7.aggregate.coreSurfaceCompleteTargets, 8);
  assert.equal(disclosedAttempt7.aggregate.targetMacroChangedFileCoverage, 1);
  assert.equal(disclosedAttempt7.aggregate.targetMacroRouteFocus, 0.701);
  assert.equal(disclosedAttempt7.aggregate.overconfidentAgainstCoreTrials, 0);
  assert.equal(disclosedAttempt7.targets.length, 8);
});

test("keeps the Round 11 repair verifier disclosed, create-only, and non-held-out", async () => {
  const harness = await readFile(harnessPath, "utf8");

  assert.match(harness, /local-blind-routing-target-manifest-0\.4-alpha-round-11\.json/);
  assert.match(harness, /local-blind-routing-validation-0\.4-alpha-round-11-attempt-1\.json/);
  assert.match(harness, /disclosed-routing-round-11-after-owner-closure-repair-0\.4-alpha/);
  assert.match(harness, /evidenceClass:\s*"disclosed-post-observation-static-routing-regression"/);
  assert.match(harness, /heldOutAgainstCandidate:\s*false/);
  assert.match(harness, /eight already observed Round 11 tasks/i);
  assert.match(harness, /not held out/i);
  assert.match(harness, /fresh Round 12 is required/i);
  assert.match(harness, /originalSha256After, originalSha256/);
  assert.match(harness, /flag:\s*"wx"/);
});

test("keeps the bilingual Round 11 report explicit about the formal failure and disclosed pass", async () => {
  const [english, chinese] = await Promise.all([
    readFile(englishReportPath, "utf8"),
    readFile(chineseReportPath, "utf8")
  ]);

  for (const report of [english, chinese]) {
    assert.match(report, /FAILED/);
    assert.match(report, /0\.567/);
    assert.match(report, /0\.701/);
    assert.match(report, /8\/8/);
    assert.match(report, /939741A55D47839D970D261F3D4E91BBAF1B190272FFE336150131A64EBD3A2E/);
    assert.match(report, /065E6A331533C3A75BF65A96691C3040BB86385A7A4A2DB63DC003231DCEC7B5/);
  }
  assert.match(english, /post-observation|not held-out|not held out/i);
  assert.match(english, /do not[\s\S]{0,120}Agent correctness|does not establish Agent\s+correctness/i);
  assert.match(english, /future round/i);
  assert.match(chinese, /\u4e0d\u80fd\u8bc1\u660e Agent/);
  assert.match(chinese, /\u65b0\u4e00\u8f6e/);
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
