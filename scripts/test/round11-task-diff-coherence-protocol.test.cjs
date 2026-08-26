const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const englishPath = path.join(root, "docs", "research", "LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_11.md");
const chinesePath = path.join(root, "docs", "zh-CN", "LOCAL_BLIND_ROUTING_TARGET_SELECTION_PROTOCOL_0_4_ALPHA_ROUND_11.md");
const libraryPath = path.join(root, "scripts", "lib", "task-diff-coherence.cjs");

test("keeps Round 11 explicitly unexecuted until a matching candidate freeze", async () => {
  const [english, chinese] = await Promise.all([
    readFile(englishPath, "utf8"),
    readFile(chinesePath, "utf8")
  ]);
  assert.match(english, /Selection protocol complete; not yet executed/);
  assert.match(english, /URL-and-HEAD-only Round 11 repository pool exists/);
  assert.match(english, /authorized only by a matching create-only candidate-freeze manifest/);
  assert.match(english, /candidate must be frozen before any Round 11 history or task is inspected/i);
  assert.match(english, /not public preregistration/i);
  assert.match(chinese, /Round 11/);
  assert.match(chinese, /SHA-256/);
});

test("locks whole-target semantic review before any Palace call", async () => {
  const english = await readFile(englishPath, "utf8");
  assert.match(english, /One `unrelated` or `uncertain` hunk rejects the entire target/);
  assert.match(english, /Partial oracle pruning is forbidden/);
  assert.match(english, /Palace calls on candidate tasks before review finalization must equal zero/);
  assert.match(english, /one developer-delegated semantic reviewer.*machine completeness validation/i);
  assert.match(english, /cannot report inter-rater agreement/i);
  assert.match(english, /Do not review older candidates after an acceptance/i);
  assert.match(english, /review stops for that family after two repositories are accepted/i);
  assert.match(english, /not independent from product development/i);
});

test("preserves the absolute static gate and fresh Round 11 advancement rule", async () => {
  const english = await readFile(englishPath, "utf8");
  assert.match(english, /target-macro changed-file coverage at least 0\.90/);
  assert.match(english, /target-macro route focus at least 0\.70/);
  assert.match(english, /every target coverage at least 0\.50/);
  assert.match(english, /every target focus at least 0\.40/);
  assert.match(english, /zero overconfident trials/);
  assert.match(english, /no context payload above 6,000 estimated tokens/);
  assert.match(english, /Only a valid, fresh, held-out Round 11 absolute pass/);
});

test("keeps the coherence library free of repository execution and Palace invocation", async () => {
  const source = await readFile(libraryPath, "utf8");
  assert.doesNotMatch(source, /node:child_process/);
  assert.doesNotMatch(source, /\b(?:execFile|spawn|spawnSync)\s*\(/);
  assert.doesNotMatch(source, /\bpalace\s+(?:route|context|pack|evaluate)\b/i);
  assert.match(source, /partialOraclePruningForbidden:\s*true/);
  assert.match(source, /uncertainHunkRejectsTarget:\s*true/);
});
