const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const englishPath = path.join(
  root,
  "docs/research/LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_19.md"
);
const chinesePath = path.join(
  root,
  "docs/zh-CN/LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_19.md"
);
const libraryPath = path.join(root, "scripts/lib/task-diff-coherence.cjs");

test("keeps Round 19 unexposed until the reachable canonical pool and candidate freeze", async () => {
  const [english, chinese] = await Promise.all([
    readFile(englishPath, "utf8"),
    readFile(chinesePath, "utf8")
  ]);
  assert.match(english, /48-repository reachability roster/i);
  assert.match(english, /before any\s+Round 19 HEAD query/i);
  assert.match(english, /No Round 19 history, task, diff, oracle, or\s+Palace result has been inspected/i);
  assert.match(english, /not public preregistration/i);
  assert.match(chinese, /第 19 轮/);
  assert.match(chinese, /48 仓库/);
});

test("locks reachability selection without turning missing URLs into product outcomes", async () => {
  const english = await readFile(englishPath, "utf8");
  assert.match(english, /first eight reachable repositories per family/i);
  assert.match(english, /never substitute or reorder after seeing a result/i);
  assert.match(english, /abort on transient network exhaustion/i);
  assert.match(english, /URL reachability cannot enter any Vertex Palace performance claim/i);
  assert.match(english, /Palace calls on candidate tasks stay at zero until semantic\s+review is frozen/i);
});

test("preserves whole-target rejection, fixed quotas, and the absolute static gate", async () => {
  const english = await readFile(englishPath, "utf8");
  assert.match(english, /reject the whole target for any unrelated or uncertain hunk/i);
  assert.match(english, /forbid partial oracle pruning/i);
  assert.match(english, /Two targets per JavaScript\/TypeScript, Python, Go, and Rust family/i);
  assert.match(english, /macro changed-file coverage >= 0\.90/i);
  assert.match(english, /macro route focus >= 0\.70/i);
  assert.match(english, /per-target coverage >= 0\.50 and focus >= 0\.40/i);
  assert.match(english, /every context payload <= 6,000 estimated Tokens/i);
  assert.match(english, /Only a fresh Round 19 absolute pass/i);
});

test("keeps the coherence library free of repository execution and Palace invocation", async () => {
  const source = await readFile(libraryPath, "utf8");
  assert.doesNotMatch(source, /node:child_process/);
  assert.doesNotMatch(source, /\b(?:execFile|spawn|spawnSync)\s*\(/);
  assert.doesNotMatch(source, /\bpalace\s+(?:route|context|pack|evaluate)\b/i);
  assert.match(source, /partialOraclePruningForbidden:\s*true/);
  assert.match(source, /uncertainHunkRejectsTarget:\s*true/);
});
