const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const englishPath = path.join(root, "docs", "research", "LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_16.md");
const chinesePath = path.join(root, "docs", "zh-CN", "LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_16.md");
const libraryPath = path.join(root, "scripts", "lib", "task-diff-coherence.cjs");

test("keeps Round 16 explicitly unexecuted until a matching candidate freeze", async () => {
  const [english, chinese] = await Promise.all([
    readFile(englishPath, "utf8"),
    readFile(chinesePath, "utf8")
  ]);
  assert.match(english, /target\s+selection has not started/i);
  assert.match(english, /URL-and-HEAD-only repository pool/i);
  assert.match(english, /authorized only by a matching create-only\s+candidate-freeze manifest/);
  assert.match(english, /No Round 16 repository history, candidate task,\s+diff/i);
  assert.match(english, /not public preregistration/i);
  assert.match(chinese, /第 16 轮/);
  assert.match(chinese, /SHA-256/);
});

test("locks whole-target semantic review before any Palace call", async () => {
  const english = await readFile(englishPath, "utf8");
  assert.match(english, /One unrelated or uncertain hunk rejects the whole target/);
  assert.match(english, /Partial oracle\s+pruning is forbidden/);
  assert.match(english, /Palace calls on candidate tasks must remain zero until\s+review finalization/);
  assert.match(english, /one developer-delegated semantic reviewer[\s\S]*machine completeness validation/i);
  assert.match(english, /no second independent human reviewer or inter-rater\s+agreement is available/i);
  assert.match(english, /Review stops for a repository at its first acceptance/i);
  assert.match(english, /language family after two accepted repositories/i);
  assert.match(english, /not independent from\s+product development/i);
});

test("preserves the absolute static gate and fresh Round 16 advancement rule", async () => {
  const english = await readFile(englishPath, "utf8");
  assert.match(english, /macro changed-file coverage at least 0\.90/);
  assert.match(english, /macro route focus at least 0\.70/);
  assert.match(english, /every target coverage at least 0\.50 and focus at least 0\.40/);
  assert.match(english, /zero overconfident trials/);
  assert.match(english, /no context payload above 6,000 estimated tokens/i);
  assert.match(english, /Only a valid fresh Round 16 absolute pass/);
});

test("keeps the coherence library free of repository execution and Palace invocation", async () => {
  const source = await readFile(libraryPath, "utf8");
  assert.doesNotMatch(source, /node:child_process/);
  assert.doesNotMatch(source, /\b(?:execFile|spawn|spawnSync)\s*\(/);
  assert.doesNotMatch(source, /\bpalace\s+(?:route|context|pack|evaluate)\b/i);
  assert.match(source, /partialOraclePruningForbidden:\s*true/);
  assert.match(source, /uncertainHunkRejectsTarget:\s*true/);
});
