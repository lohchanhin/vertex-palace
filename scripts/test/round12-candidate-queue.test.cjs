const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtemp, mkdir, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  inspectCommit,
  parseNameStatus,
  parseNumstat
} = require("../prepare-local-blind-routing-candidates-round-12.cjs");

test("builds a hunk-addressed candidate from a real single-parent fixture commit", async () => {
  const root = await fixtureRepository();
  try {
    const commit = git(root, ["rev-parse", "HEAD"]).trim();
    const inspected = inspectCommit({
      repository: fixtureRepositoryDescriptor(),
      root,
      commit,
      rules: fixtureRules(),
      generatedAt: "2026-08-10T00:00:00.000Z"
    });

    assert.ok(inspected.candidate);
    assert.equal(inspected.candidate.target.task, "Fix parser behavior for empty input values");
    assert.deepEqual(inspected.candidate.target.implementationFiles, ["src/parser.js"]);
    assert.deepEqual(inspected.candidate.target.testFiles, ["test/parser.test.js"]);
    assert.equal(inspected.candidate.coherencePacket.files.length, 2);
    assert.ok(inspected.candidate.coherencePacket.files.every(({ hunks }) => hunks.length === 1));
    assert.match(inspected.candidate.coherencePacket.packetSha256, /^[0-9A-F]{64}$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a mechanically mixed commit that adds an oracle file", async () => {
  const root = await fixtureRepository();
  try {
    await writeFile(path.join(root, "src/parser.js"), "export const parse = (value) => value || 'fallback';\n");
    await writeFile(path.join(root, "test/parser.test.js"), "test('empty', () => expect(parse('')).toBe('fallback'));\n");
    await writeFile(path.join(root, "README.md"), "# Added documentation\n");
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "Fix parser fallback and add supporting documentation"]);
    const commit = git(root, ["rev-parse", "HEAD"]).trim();
    const inspected = inspectCommit({
      repository: fixtureRepositoryDescriptor(),
      root,
      commit,
      rules: fixtureRules(),
      generatedAt: "2026-08-10T00:00:00.000Z"
    });

    assert.equal(inspected.candidate, null);
    assert.equal(inspected.reason, "contains-non-modified-file");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("parses deterministic Git name-status and numstat records", () => {
  assert.deepEqual(parseNameStatus("M\tsrc/a.js\nM\ttest/a.test.js\n"), [
    { status: "M", path: "src/a.js" },
    { status: "M", path: "test/a.test.js" }
  ]);
  assert.deepEqual(parseNumstat("3\t1\tsrc/a.js\n2\t0\ttest/a.test.js\n"), {
    additions: 5,
    deletions: 1,
    changedLines: 6
  });
  assert.equal(parseNumstat("-\t-\tbinary.dat\n"), null);
});

async function fixtureRepository() {
  const root = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-round12-selector-test-"));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "fixture@example.test"]);
  git(root, ["config", "user.name", "Fixture Reviewer"]);
  await mkdir(path.join(root, "src"));
  await mkdir(path.join(root, "test"));
  await writeFile(path.join(root, "src/parser.js"), "export const parse = (value) => value;\n");
  await writeFile(path.join(root, "test/parser.test.js"), "test('value', () => expect(parse('x')).toBe('x'));\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "Initial parser fixture"]);

  await writeFile(path.join(root, "src/parser.js"), "export const parse = (value) => value === '' ? null : value;\n");
  await writeFile(path.join(root, "test/parser.test.js"), "test('empty', () => expect(parse('')).toBeNull());\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "Fix parser behavior for empty input values"]);
  return root;
}

function fixtureRepositoryDescriptor() {
  return {
    name: "fixture",
    language: "JavaScript/TypeScript",
    languageFamily: "javascript-typescript",
    url: "https://example.test/fixture.git",
    pinnedHead: "f".repeat(40),
    extensions: [".js"]
  };
}

function fixtureRules() {
  return {
    minimumFiles: 2,
    maximumFiles: 8,
    maximumAuxiliaryFiles: 2,
    maximumChangedLines: 400
  };
}

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}
