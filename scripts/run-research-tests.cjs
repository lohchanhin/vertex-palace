const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const testRoot = path.join(root, "scripts", "test");
const retiredLiveGuards = [
  {
    file: "round11-local-blind-selection-freeze.test.cjs",
    message: "Research lifecycle: the Round 11 pre-observation live candidate guard is preserved but is not run against the disclosed post-observation worktree.",
    freezePattern: "Round 11 freeze"
  },
  {
    file: "round12-local-blind-selection-freeze.test.cjs",
    message: "Research lifecycle: the Round 12 pre-observation live candidate guard is preserved but is not run against the disclosed post-observation worktree.",
    freezePattern: "Round 12 freeze"
  },
  {
    file: "round16-local-blind-selection-freeze.test.cjs",
    message: "Research lifecycle: the Round 16 pre-observation live candidate guard is preserved but is not run against the disclosed post-observation worktree.",
    freezePattern: "Round 16 freeze"
  },
  {
    file: "round19-local-blind-selection-freeze.test.cjs",
    message: "Research lifecycle: the Round 19 pre-observation live candidate guard is preserved but is not run against the disclosed post-observation worktree.",
    freezePattern: "Round 19 freeze"
  }
];
const retiredLiveGuardNames = new Set(retiredLiveGuards.map(({ file }) => file));
const regularTests = readdirSync(testRoot)
  .filter((name) =>
    name.endsWith(".test.cjs")
    && !retiredLiveGuardNames.has(name)
  )
  .sort()
  .map((name) => path.join(testRoot, name));

for (const { message } of retiredLiveGuards) console.log(message);
run(["--test", ...regularTests]);
for (const { file, freezePattern } of retiredLiveGuards) {
  run([
    "--test",
    "--test-name-pattern",
    freezePattern,
    path.join(testRoot, file)
  ]);
}

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
