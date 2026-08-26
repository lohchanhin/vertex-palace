const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");

for (const round of [22, 23]) {
  test(`Round ${round} preregisters balanced fresh targets and immutable gates`, async () => {
    const manifest = JSON.parse(await readFile(path.join(
      root,
      "docs",
      "research",
      "evidence",
      `layered-routing-targets-round-${round}.json`
    ), "utf8"));
    assert.equal(manifest.targets.length, 12);
    assert.equal(manifest.candidate, "0.4.0-alpha.2");
    assert.equal(manifest.baseline, "0.3.0");
    assert.equal(manifest.repetitionsPerCondition, 2);
    assert.equal(manifest.contextBudget, 6000);
    assert.deepEqual(countBy(manifest.targets, "stratum"), {
      local: 3,
      reference: 3,
      "high-connectivity": 3,
      control: 3
    });
    assert.deepEqual(countBy(manifest.targets, "language"), {
      typescript: 3,
      python: 3,
      go: 3,
      rust: 3
    });
    assert.equal(manifest.targets.filter((target) => target.metadata).length, 3);
    assert.equal(new Set(manifest.targets.map((target) => target.id)).size, 12);
  });
}

test("the runner balances order, checks all stable gates, and separates performance claims", async () => {
  const source = await readFile(path.join(root, "scripts", "run-layered-routing-round.cjs"), "utf8");
  assert.match(source, /candidateFirst = \(targetIndex \+ repetition\) % 2 === 0/);
  assert.match(source, /referenceGrounding100/);
  assert.match(source, /controlAbstention100/);
  assert.match(source, /routableCoreClosure100/);
  assert.match(source, /macroCoreCoverage90/);
  assert.match(source, /macroRouteFocus70/);
  assert.match(source, /commonCoverageNonInferior/);
  assert.match(source, /zeroTrackedPollution/);
  assert.match(source, /deterministicRoutes/);
  assert.match(source, /does not execute an Agent or establish Token, wall-time, or tool-call improvement/);
});

function countBy(values, key) {
  return Object.fromEntries([...new Set(values.map((value) => value[key]))].map(
    (name) => [name, values.filter((value) => value[key] === name).length]
  ));
}
