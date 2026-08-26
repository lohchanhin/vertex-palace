const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdir, mkdtemp, readFile, readdir, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = outputArgument(process.argv.slice(2));
const cliPath = path.join(projectRoot, "dist", "palace.cjs");
const publicRemote = "https://github.com/microsoft/vscode.git";
const publicIssue = "https://github.com/microsoft/vscode/issues/1";

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const root = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-github-smoke-"));
  try {
    await writeFixture(root);
    run("git", ["init", "-q"], root);
    run("git", ["config", "user.email", "smoke@example.invalid"], root);
    run("git", ["config", "user.name", "Vertex Palace Smoke"], root);
    run("git", ["add", "."], root);
    run("git", ["commit", "-qm", "public reference smoke fixture"], root);
    run("git", ["remote", "add", "origin", publicRemote], root);
    run(process.execPath, [cliPath, "init"], root);
    run(process.execPath, [cliPath, "index"], root);

    const first = context(root);
    const second = context(root);
    const firstReference = first.taskGrounding?.references?.[0];
    const secondReference = second.taskGrounding?.references?.[0];
    assert.equal(firstReference?.url, publicIssue);
    assert.equal(firstReference?.resolutionStatus, "fetched");
    assert.equal(secondReference?.url, publicIssue);
    assert.equal(secondReference?.resolutionStatus, "cache-hit");

    const cacheRoot = path.join(root, ".palace", "cache", "references");
    const cacheFiles = await readdir(cacheRoot);
    assert.equal(cacheFiles.length, 1);
    const cacheText = await readFile(path.join(cacheRoot, cacheFiles[0]), "utf8");
    const serialized = JSON.stringify({ first, second });
    for (const forbidden of ["authorization", "gh_token", "github_token", "bearer "]) {
      assert.equal(cacheText.toLowerCase().includes(forbidden), false);
      assert.equal(serialized.toLowerCase().includes(forbidden), false);
    }

    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      claimBoundary: "Anonymous public GitHub issue transport, cache, and credential-redaction smoke only; not routing-quality or Agent-performance evidence.",
      sourceCommit: run("git", ["rev-parse", "HEAD"], projectRoot).stdout.trim(),
      sourceTreeDirty: run("git", ["status", "--short"], projectRoot).stdout.trim().length > 0,
      productVersion: run(process.execPath, [cliPath, "--version"], projectRoot).stdout.trim(),
      remote: publicRemote,
      reference: publicIssue,
      credentialsDisabled: true,
      firstRequest: {
        decision: first.decision,
        groundingStatus: first.taskGrounding?.status,
        resolutionStatus: firstReference.resolutionStatus,
        contentHash: firstReference.contentHash
      },
      secondRequest: {
        decision: second.decision,
        groundingStatus: second.taskGrounding?.status,
        resolutionStatus: secondReference.resolutionStatus,
        contentHash: secondReference.contentHash
      },
      cacheFiles: cacheFiles.length,
      credentialLeakDetected: false
    };
    const output = `${JSON.stringify(report, null, 2)}\n`;
    if (outputPath) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, output, "utf8");
    }
    process.stdout.write(output);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function context(root) {
  const result = run(process.execPath, [
    cliPath,
    "context",
    "Fix issue #1",
    "--auto",
    "--format",
    "json",
    "--references",
    "auto"
  ], root, {
    ...process.env,
    GH_TOKEN: "",
    GITHUB_TOKEN: ""
  });
  return JSON.parse(result.stdout);
}

async function writeFixture(root) {
  const files = {
    "package.json": `${JSON.stringify({ name: "public-reference-smoke", private: true }, null, 2)}\n`,
    "src/workbench.ts": "export function openWorkbench(): string { return 'ready'; }\n",
    "tests/workbench.test.ts": "import { openWorkbench } from '../src/workbench';\ntest('workbench', () => openWorkbench());\n"
  };
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
}

function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  return result;
}

function outputArgument(args) {
  const index = args.indexOf("--out");
  if (index < 0) return undefined;
  assert.ok(args[index + 1], "--out requires a repository-relative path.");
  const target = path.resolve(projectRoot, args[index + 1]);
  assert.ok(target.startsWith(`${projectRoot}${path.sep}`), "--out must stay inside the repository.");
  return target;
}
