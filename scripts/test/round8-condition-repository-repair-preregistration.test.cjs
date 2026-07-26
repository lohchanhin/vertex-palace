const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const {
  cloneConditionTarget
} = require("../verify-disclosed-round-8-after-condition-repository-repair.cjs");

const projectRoot = path.resolve(__dirname, "..", "..");
const originalResultPath = path.join(projectRoot, "docs", "research", "evidence", "held-out-confidence-calibration-0.4-alpha-round-8.json");
const repairedValidatorPath = path.join(projectRoot, "scripts", "verify-disclosed-round-8-after-condition-repository-repair.cjs");
const englishProtocolPath = path.join(projectRoot, "docs", "research", "DISCLOSED_ROUND_8_CONDITION_REPOSITORY_REPAIR_PROTOCOL_0_4_ALPHA.md");
const chineseProtocolPath = path.join(projectRoot, "docs", "zh-CN", "DISCLOSED_ROUND_8_CONDITION_REPOSITORY_REPAIR_PROTOCOL_0_4_ALPHA.md");
const originalResultSha256 = "F8779C649DCA4350B4E22FBF3E423047371F74F03F6EFB6E3356C2B81083B733";

test("locks the original invalid result before the disclosed repair", () => {
  const bytes = readFileSync(originalResultPath);
  const result = JSON.parse(bytes.toString("utf8"));
  assert.equal(createHash("sha256").update(bytes).digest("hex").toUpperCase(), originalResultSha256);
  assert.equal(result.status, "invalid");
  assert.equal(result.aggregate.baseline.completedTrials, 0);
  assert.equal(result.aggregate.candidate.completedTrials, 0);
  assert.equal(result.aggregate.baseline.environmentOrSetupFailures, 8);
  assert.equal(result.aggregate.candidate.environmentOrSetupFailures, 8);
  for (const target of result.targets) {
    for (const condition of [target.conditions.baseline, target.conditions.candidate]) {
      assert.equal(condition.trials.length, 0, `${target.name} ${condition.id}`);
      assert.equal(condition.failureCategory, "environment-or-setup");
      assert.match(condition.failures[0], /condition-repository-setup/);
      assert.match(condition.executionError, /groundTruth|ambiguous argument|unknown revision/i);
    }
  }
});

test("materializes an unreferenced ground-truth child in an isolated local condition repository", async () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "vertex-palace-condition-repair-test-"));
  try {
    const sourceRoot = path.join(temporaryRoot, "source");
    const targetContainer = path.join(temporaryRoot, "conditions");
    const conditionRoot = path.join(targetContainer, "baseline");
    mkdirSync(sourceRoot, { recursive: true });
    mkdirSync(targetContainer, { recursive: true });
    git(["init", "--quiet", "-b", "main"], sourceRoot);
    git(["config", "user.name", "Vertex Palace Test"], sourceRoot);
    git(["config", "user.email", "vertex-palace@example.invalid"], sourceRoot);
    writeFileSync(path.join(sourceRoot, "src.js"), "export const value = 1;\n");
    writeFileSync(path.join(sourceRoot, "test.js"), "assert.equal(value, 1);\n");
    git(["add", "--", "src.js", "test.js"], sourceRoot);
    git(["commit", "--quiet", "-m", "initial synthetic route state"], sourceRoot);
    const routeCommit = git(["rev-parse", "HEAD"], sourceRoot).stdout.trim();

    writeFileSync(path.join(sourceRoot, "src.js"), "export const value = 2;\n");
    writeFileSync(path.join(sourceRoot, "test.js"), "assert.equal(value, 2);\n");
    git(["add", "--", "src.js", "test.js"], sourceRoot);
    const task = "fix: preserve a synthetic ground truth child";
    git(["commit", "--quiet", "-m", task], sourceRoot);
    const groundTruthCommit = git(["rev-parse", "HEAD"], sourceRoot).stdout.trim();
    git(["checkout", "--quiet", "--detach", routeCommit], sourceRoot);
    git(["update-ref", "-d", "refs/heads/main"], sourceRoot);

    const target = {
      name: "synthetic",
      routeCommit,
      groundTruthCommit,
      task,
      expectedTaskType: "bugfix",
      changedFiles: ["src.js", "test.js"]
    };
    await cloneConditionTarget(target, sourceRoot, conditionRoot, targetContainer);

    assert.equal(git(["rev-parse", "HEAD"], conditionRoot).stdout.trim(), routeCommit);
    assert.equal(
      git(["rev-parse", `${groundTruthCommit}^`], conditionRoot).stdout.trim(),
      routeCommit
    );
    assert.deepEqual(
      git(["diff", "--name-only", routeCommit, groundTruthCommit, "--"], conditionRoot)
        .stdout.trim().split(/\r?\n/),
      ["src.js", "test.js"]
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("freezes a harness-only repair and a separately named create-only output", () => {
  const source = readFileSync(repairedValidatorPath, "utf8");
  const conditionFunction = source.slice(
    source.indexOf("async function cloneConditionTarget"),
    source.indexOf("function verifyPinnedTarget")
  );

  assert.match(source, /studyId = "disclosed-round-8-after-condition-repository-repair-0\.4-alpha"/);
  assert.match(source, /originalResultCommit = "ea3504b770b26bae1ceeb684efe835ad72b0c66e"/);
  assert.match(source, new RegExp(`originalResultSha256 = "${originalResultSha256}"`));
  assert.match(source, /preservedWithoutModification:\s*true/);
  assert.match(source, /flag:\s*"wx"/);
  assert.match(conditionFunction, /"update-ref", "refs\/vertex-palace\/route"/);
  assert.match(conditionFunction, /"update-ref", "refs\/vertex-palace\/ground-truth"/);
  assert.match(conditionFunction, /"init", "--quiet"/);
  assert.match(conditionFunction, /"fetch"/);
  assert.match(conditionFunction, /"--depth=2"/);
  assert.doesNotMatch(conditionFunction, /"clone"/);
  assert.match(source, /candidateCommit = "1a02d89269acb36473db3ad39badab9fe338a4a3"/);
  assert.match(source, /baselineCommit = "228c3bde47f6930023496fdd0a54d43dba10091f"/);
  assert.match(source, /const calibrationTolerance = 0\.15/);
  assert.match(source, /const routeLimit = 9/);
  assert.match(source, /const budget = 6_000/);
  assert.match(source, /const repetitions = 2/);
  assert.doesNotMatch(source, /Promise\.all/);
});

test("keeps the disclosed repair protocols aligned and bounded", () => {
  const english = readFileSync(englishProtocolPath, "utf8");
  const chinese = readFileSync(chineseProtocolPath, "utf8");
  for (const document of [english, chinese]) {
    assert.match(document, /ea3504b770b26bae1ceeb684efe835ad72b0c66e/);
    assert.match(document, new RegExp(originalResultSha256));
    assert.match(document, /baseline 0|基线 0/);
    assert.match(document, /candidate 0|候选 0/);
    assert.match(document, /disclosed-round-8-after-condition-repository-repair-0\.4-alpha\.json/);
    assert.match(document, /32/);
    assert.match(document, /0\.15/);
    assert.match(document, /6,000/);
    assert.match(document, /9/);
  }
  assert.match(english, /neither measured Palace version\s+received a selected task/);
  assert.match(chinese, /两个受测 Palace 版本都没有\s*收到入选任务/);
});

function git(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: process.env,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([`git ${args.join(" ")}`, result.stdout, result.stderr].filter(Boolean).join("\n"));
  }
  return result;
}
