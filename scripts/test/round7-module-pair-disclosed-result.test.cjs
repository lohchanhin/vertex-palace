const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const evidence = (...parts) => path.join(projectRoot, "docs", "research", "evidence", ...parts);
const originalPath = evidence("held-out-cross-repository-routing-0.4-alpha-round-7.json");
const morphologyPath = evidence("disclosed-routing-round-7-after-task-morphology-repair-0.4-alpha.json");
const firstPath = evidence("disclosed-routing-round-7-after-task-anchored-module-pair-repair-0.4-alpha.json");
const constrainedPath = evidence("disclosed-routing-round-7-after-constrained-module-pair-repair-0.4-alpha.json");
const harnessPath = path.join(projectRoot, "scripts", "verify-disclosed-routing-round-7-after-constrained-module-pair-repair.cjs");
const englishReportPath = path.join(projectRoot, "docs", "research", "DISCLOSED_ROUND_7_MODULE_PAIR_REGRESSIONS_0_4_ALPHA.md");
const chineseReportPath = path.join(projectRoot, "docs", "zh-CN", "DISCLOSED_ROUND_7_MODULE_PAIR_REGRESSIONS_0_4_ALPHA.md");

test("locks the Round 7 module-pair evidence chain", () => {
  assert.equal(sha256(originalPath), "C53C9186853F1661158212604804261C8394781454A7C7B7DF15811D4E42D7B9");
  assert.equal(sha256(morphologyPath), "9779EBEC4A235008DF42B915073B87E93079CF8168B7FAFCA2D42C9CE439BF71");
  assert.equal(sha256(firstPath), "075BADB394CA1230252AB9F9710E90F88E37262E08CD7D837E95EA259DAE64F5");
  assert.equal(sha256(constrainedPath), "7FBD82D10A99C65D4817349AD5E91C7A7237A712DADECD80E5707DBCA0386252");
  assert.equal(sha256(harnessPath), "D61F8BA57C10F312663ACB7E27BC72F943313A9B7ACABC91E78CF87DC4089921");
});

test("preserves the attributable repair and removal of the Jinja regression", () => {
  const original = readJson(originalPath);
  const first = readJson(firstPath);
  const constrained = readJson(constrainedPath);

  assert.equal(constrained.status, "failed");
  assert.equal(constrained.heldOutAgainstCandidate, false);
  assert.equal(constrained.evidenceClass, "seen-development-regression");
  assert.equal(constrained.aggregate.completedTrials, 16);
  assert.equal(constrained.aggregate.passedTargets, 3);
  assert.equal(constrained.aggregate.macroChangedFileCoverage, 0.62);
  assert.equal(constrained.aggregate.macroRouteFocus, 0.542);
  assert.equal(constrained.aggregate.macroRoutePrecision, 0.543);
  assert.equal(constrained.aggregate.overconfidentTrials, 4);
  assert.equal(constrained.aggregate.environmentOrSetupFailures, 0);
  assert.equal(constrained.aggregate.harnessContractFailures, 0);

  const originalHttpRouter = target(original, "httprouter").trials[0].routeFiles;
  const constrainedHttpRouter = target(constrained, "httprouter").trials[0].routeFiles;
  assert.deepEqual(originalHttpRouter, ["tree.go", "router_test.go"]);
  assert.deepEqual(constrainedHttpRouter, ["tree.go", "tree_test.go"]);

  assert.deepEqual(
    target(first, "jinja").trials[0].routeFiles,
    [
      "src/jinja2/parser.py",
      "src/jinja2/ext.py",
      "src/jinja2/runtime.py",
      "src/jinja2/compiler.py",
      "src/jinja2/tests.py",
      "tests/test_regression.py",
      "tests/test_runtime.py"
    ]
  );
  assert.deepEqual(
    target(constrained, "jinja").trials[0].routeFiles,
    [
      "src/jinja2/parser.py",
      "src/jinja2/ext.py",
      "src/jinja2/runtime.py",
      "src/jinja2/compiler.py",
      "tests/test_regression.py"
    ]
  );

  for (const current of constrained.targets.filter((entry) => entry.name !== "jinja")) {
    assert.deepEqual(
      current.trials[0].routeFiles,
      target(first, current.name).trials[0].routeFiles,
      current.name
    );
  }
});

test("keeps both reports explicit about the failed aggregate result", () => {
  const english = readFileSync(englishReportPath, "utf8");
  const chinese = readFileSync(chineseReportPath, "utf8");
  assert.match(english, /\*\*Mixed improvement, overall gate failed\.\*\*/);
  assert.match(english, /does not yet prove Token or time savings/);
  assert.match(chinese, /\*\*有局部改善，但整体门槛仍失败。\*\*/);
  assert.match(chinese, /仍不能证明节省 Token 或时间/);
});

function target(result, name) {
  const value = result.targets.find((entry) => entry.name === name);
  assert.ok(value, name);
  return value;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return createHash("sha256")
    .update(readFileSync(filePath))
    .digest("hex")
    .toUpperCase();
}
