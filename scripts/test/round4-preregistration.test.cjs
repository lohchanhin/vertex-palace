const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const poolPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-routing-repository-pool-0.4-alpha-round-4.json"
);
const round3ManifestPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-routing-target-manifest-0.4-alpha-round-3.json"
);
const selectorPath = path.join(
  projectRoot,
  "scripts",
  "select-held-out-routing-targets-round-4.cjs"
);
const manifestPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  "held-out-routing-target-manifest-0.4-alpha-round-4.json"
);
const validatorPath = path.join(
  projectRoot,
  "scripts",
  "verify-held-out-cross-repository-routing-round-4.cjs"
);

test("freezes a balanced Round 4 pool outside the complete Round 3 boundary", () => {
  const pool = readJson(poolPath);
  const round3 = readJson(round3ManifestPath);
  assert.equal(pool.status, "preregistered");
  assert.equal(pool.candidate.productCommit, "efd53274e42fb8123745f2b8bb09a24e4fa384b7");
  assert.equal(
    pool.candidate.cliSha256,
    "E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0"
  );
  assert.equal(pool.rules.desiredTargets, 8);
  assert.equal(pool.rules.targetsPerLanguageFamily, 2);
  assert.equal(pool.rules.repositoriesPerLanguageFamily, 3);
  assert.equal(pool.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(pool.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);

  const expectedObserved = new Set([
    ...round3.previouslyObservedRepositories,
    ...round3.repositoryPool.map((repository) => repository.url)
  ].map(normalizeUrl));
  const declaredObserved = new Set(pool.previouslyObservedRepositories.map(normalizeUrl));
  assert.deepEqual([...declaredObserved].sort(), [...expectedObserved].sort());

  const poolUrls = pool.repositoryPool.map((repository) => normalizeUrl(repository.url));
  assert.equal(new Set(poolUrls).size, pool.repositoryPool.length);
  assert.equal(pool.repositoryPool.length, 12);
  for (const repository of pool.repositoryPool) {
    assert.equal(declaredObserved.has(normalizeUrl(repository.url)), false, repository.name);
    assert.match(repository.pinnedHead, /^[0-9a-f]{40}$/);
  }
  for (const family of pool.rules.requiredLanguageFamilies) {
    assert.equal(
      pool.repositoryPool.filter((repository) => repository.languageFamily === family).length,
      3,
      family
    );
  }
});

test("keeps Round 4 selection create-only and unable to invoke Palace", () => {
  const source = readFileSync(selectorPath, "utf8");
  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /palaceCallsOnCandidateTasksDuringSelection:\s*0/);
  assert.match(source, /candidateCommit = "efd53274e42fb8123745f2b8bb09a24e4fa384b7"/);
  assert.doesNotMatch(source, /\brunPalace\b/);
  assert.doesNotMatch(source, /\brunNode\b/);
  assert.doesNotMatch(source, /\b(?:context|evaluate|index|init|pack|route)\b.*--root/);
});

test("freezes eight mechanically selected Round 4 targets before validation", () => {
  const bytes = readFileSync(manifestPath);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex").toUpperCase(),
    "D6A1DDCDA3BD704D1F809279229153F72B4CF6162F1C1231C40D36F18626F5C0"
  );
  const manifest = JSON.parse(bytes.toString("utf8"));
  assert.equal(manifest.status, "selected");
  assert.equal(manifest.heldOutAgainstCandidate, true);
  assert.equal(manifest.selector.commit, "96af578295484831e4a14511baf0e88cb69cc081");
  assert.equal(
    manifest.repositoryPool.sha256,
    "DF36C82D51AF4B91DF6E67E9848AD54EBB5FE99E9F4DF03498BC1A0FFD6E1A0A"
  );
  assert.equal(manifest.rules.palaceCallsOnCandidateTasksDuringSelection, 0);
  assert.equal(manifest.targets.length, 8);
  for (const family of manifest.rules.requiredLanguageFamilies) {
    assert.equal(manifest.rules.selectedPerLanguageFamily[family], 2, family);
  }
  for (const target of manifest.targets) {
    assert.equal(target.expectedTaskType, expectedTaskType(target.task), target.name);
    assert.ok(target.implementationFiles.length > 0, target.name);
    assert.ok(target.testFiles.length > 0, target.name);
    assert.deepEqual(
      [...target.implementationFiles, ...target.testFiles].sort(),
      [...target.changedFiles].sort(),
      target.name
    );
    assert.ok(target.changedFiles.length >= 2 && target.changedFiles.length <= 6, target.name);
  }
  assert.deepEqual(
    manifest.repositoryReports.slice(8).map(({ name, status }) => ({ name, status })),
    [
      { name: "vite", status: "reserved-fallback-not-inspected" },
      { name: "poetry", status: "reserved-fallback-not-inspected" },
      { name: "go-redis", status: "reserved-fallback-not-inspected" },
      { name: "rayon", status: "reserved-fallback-not-inspected" }
    ]
  );
});

test("freezes the Round 4 validator without build or formal-trial retries", () => {
  const source = readFileSync(validatorPath, "utf8");
  assert.match(source, /flag:\s*"wx"/);
  assert.match(source, /manifestCommit = "7ccf0c7d668f4a9790186ba4659a76fd4a30813d"/);
  assert.match(source, /freshIndexAttempts = 2/);
  assert.match(source, /new Set\(\["EAGAIN", "ENOMEM", "ETIMEDOUT"\]\)/);
  assert.match(source, /evaluateAndContextRetries:\s*0/);
  assert.match(source, /rebuiltBeforeMeasurement:\s*false/);
  assert.doesNotMatch(source, /runNpm\(\["run", "build"\]/);
});

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizeUrl(value) {
  return value.toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
}

function expectedTaskType(subject) {
  const conventional = subject.match(/^\s*(fix|feat)(?:\([^)]*\))?!?:/i);
  if (conventional?.[1].toLowerCase() === "fix") return "bugfix";
  if (conventional?.[1].toLowerCase() === "feat") return "feature";
  if (/^\s*(?:add|allow|create|implement|support)\b/i.test(subject)) return "feature";
  if (/^\s*(?:fix|debug|repair|correct|resolve)\b/i.test(subject)) return "bugfix";
  return null;
}
