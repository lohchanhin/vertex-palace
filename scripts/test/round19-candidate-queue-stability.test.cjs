const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");
const { sha256Bytes } = require("../lib/local-blind-freeze.cjs");

const root = path.resolve(__dirname, "../..");
const evidenceRelativePath =
  "docs/research/evidence/local-blind-routing-candidate-queue-stability-0.4-alpha-round-19.json";

test("Round 19 retry preserves the partial attempt and binds the ready queue", async () => {
  const evidence = await readJson(evidenceRelativePath);
  const attempts = [];
  for (const declared of evidence.attempts) {
    const bytes = await readFile(path.join(root, declared.path));
    assert.equal(sha256Bytes(bytes), declared.sha256);
    const queue = JSON.parse(bytes.toString("utf8"));
    assert.equal(queue.status, declared.status);
    assert.equal(queue.palaceCallsOnCandidateTasks, 0);
    assert.equal(
      queue.repositoryReports.filter(({ status }) => status === "inspected").length,
      declared.repositoriesInspected
    );
    assert.equal(
      queue.repositoryReports.reduce((total, report) => total + report.candidates.length, 0),
      declared.mechanicalCandidates
    );
    attempts.push(queue);
  }
  assert.equal(attempts[0].repositoryReports.find(({ name }) => name === "memchr").status, "inspection-error");
  assert.equal(attempts[1].repositoryReports.find(({ name }) => name === "memchr").status, "inspected");
});

test("common repositories are semantically identical after removing declared volatile fields", async () => {
  const evidence = await readJson(evidenceRelativePath);
  const [attempt1, attempt2] = await Promise.all(
    evidence.attempts.map(({ path: relativePath }) => readJson(relativePath))
  );
  const byName = new Map(attempt1.repositoryReports.map((report) => [report.name, report]));
  let common = 0;
  for (const report of attempt2.repositoryReports) {
    const previous = byName.get(report.name);
    if (previous?.status !== "inspected") continue;
    common += 1;
    assert.deepEqual(scrub(previous), scrub(report), report.name);
  }
  assert.equal(common, evidence.comparison.commonInspectedRepositories);
  assert.equal(evidence.comparison.commonRepositorySemanticMismatches, 0);

  const memchr = attempt2.repositoryReports.find(({ name }) => name === "memchr");
  assert.equal(memchr.scannedCommits, 279);
  assert.equal(memchr.candidates.length, 0);
  assert.equal(evidence.disclosedHarnessLimitation.packetSha256StableAcrossEquivalentReruns, false);
  assert.match(evidence.disclosedHarnessLimitation.reason, /generatedAt/);
});

function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort()
    .filter((key) => !["generatedAt", "packetSha256", "materializationAttempts"].includes(key))
    .map((key) => [key, scrub(value[key])]));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}
