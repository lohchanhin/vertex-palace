const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const poolPath = path.join(
  root,
  "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-10.json"
);
const freezePath = path.join(
  root,
  "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-10.json"
);

test("Round 10 local blind pool is new, balanced, and task-unobserved at freeze", async () => {
  const pool = JSON.parse(await readFile(poolPath, "utf8"));
  const priorBytes = await readFile(path.join(root, pool.priorExclusionSource.path));
  const prior = JSON.parse(priorBytes.toString("utf8"));

  assert.equal(pool.schemaVersion, 1);
  assert.equal(pool.studyId, "local-blind-routing-round-10-0.4-alpha");
  assert.equal(pool.status, "locally-frozen");
  assert.equal(pool.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(pool.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);
  assert.equal(pool.rules.outputCreateOnly, true);
  assert.equal(sha256(priorBytes), pool.priorExclusionSource.sha256);

  const observed = await collectObservedRepositories(prior);
  assert.equal(observed.size, 113);
  assert.equal(pool.repositoryPool.length, 16);
  assert.equal(new Set(pool.repositoryPool.map(({ url }) => normalizeRepositoryUrl(url))).size, 16);

  for (const family of pool.rules.requiredLanguageFamilies) {
    assert.equal(pool.repositoryPool.filter(({ languageFamily }) => languageFamily === family).length, 4);
  }
  for (const repository of pool.repositoryPool) {
    assert.ok(!observed.has(normalizeRepositoryUrl(repository.url)));
    assert.match(repository.pinnedHead, /^[0-9a-f]{40}$/);
  }
});

test("Round 10 selector is create-only and has no Palace execution path", async () => {
  const selector = await readFile(
    path.join(root, "scripts/select-local-blind-routing-targets-round-10.cjs"),
    "utf8"
  );
  assert.match(selector, /flag:\s*"wx"/);
  assert.match(selector, /palaceCallsOnCandidateTasksDuringSelection:\s*0/);
  assert.match(selector, /complete-shallow-history-no-promisor/);
  assert.match(selector, /inspection-error/);
  assert.doesNotMatch(selector, /--filter=blob:none/);
  assert.doesNotMatch(selector, /spawnSync\(\s*["']palace["']/i);
  assert.doesNotMatch(selector, /run\(\s*["']palace["']/i);
  assert.doesNotMatch(selector, /dist[\\/]palace\.cjs["']\s*,\s*\[["'](?:route|context|evaluate|pack)/i);
});

test("Round 10 local freeze declares its non-public evidence boundary", async () => {
  const freeze = JSON.parse(await readFile(freezePath, "utf8"));
  const english = await readFile(
    path.join(root, "docs/research/LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_10.md"),
    "utf8"
  );
  const chinese = await readFile(
    path.join(root, "docs/zh-CN/LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_10.md"),
    "utf8"
  );

  assert.equal(freeze.status, "locally-frozen");
  assert.equal(freeze.publicPreregistration, false);
  assert.equal(freeze.competitionFreeze.noCommit, true);
  assert.equal(freeze.competitionFreeze.noPush, true);
  assert.equal(freeze.amendment, undefined);
  assert.match(english, /not a\s+public preregistration/i);
  assert.match(english, /cannot establish Agent correctness/i);
  assert.match(chinese, /不属于公开预注册/);
  assert.match(chinese, /不能证明 Agent 正确率/);
});

async function collectObservedRepositories(document, visited = new Set()) {
  const observed = new Set([
    ...(Array.isArray(document.previouslyObservedRepositories)
      ? document.previouslyObservedRepositories
      : []),
    ...(Array.isArray(document.repositoryPool)
      ? document.repositoryPool.map((repository) => repository.url)
      : [])
  ].map(normalizeRepositoryUrl));
  const source = document.priorExclusionSource;
  if (!source?.path) return observed;
  const absolute = path.join(root, source.path);
  assert.ok(!visited.has(absolute));
  visited.add(absolute);
  const bytes = await readFile(absolute);
  assert.equal(sha256(bytes), source.sha256);
  const nested = await collectObservedRepositories(JSON.parse(bytes.toString("utf8")), visited);
  for (const repository of nested) observed.add(repository);
  return observed;
}

function normalizeRepositoryUrl(value) {
  return value.toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
