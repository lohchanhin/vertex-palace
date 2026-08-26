const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { readFile, readdir, stat } = require("node:fs/promises");
const path = require("node:path");

const sourceHashSeeds = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "tsconfig.json",
  "tsup.package-cli.config.ts",
  "tsup.plugin-mcp.config.ts",
  "packages"
];

async function assertCandidateFreeze({ root, freezePath, studyId }) {
  const freezeBytes = await readFile(freezePath);
  const freeze = JSON.parse(freezeBytes.toString("utf8"));
  assert.equal(freeze.schemaVersion, 1);
  assert.equal(freeze.studyId, studyId);
  assert.ok(
    freeze.status === "locally-frozen"
      || freeze.status === "publicly-preregistered-product-freeze",
    `Unsupported candidate freeze status: ${freeze.status}`
  );
  if (freeze.status === "locally-frozen") {
    assert.equal(freeze.publicPreregistration, false);
    assert.equal(freeze.competitionFreeze.noCommit, true);
    assert.equal(freeze.competitionFreeze.noPush, true);
    assert.equal(freeze.competitionFreeze.noTag, true);
    assert.equal(freeze.competitionFreeze.noNpmPublish, true);
  } else {
    assert.equal(freeze.publicPreregistration, true);
  }

  if (freeze.status === "locally-frozen") {
    assert.equal(
      run("git", ["rev-parse", "HEAD"], { cwd: root }).stdout.trim(),
      freeze.candidate.baseCommit,
      "Git base commit changed after the local candidate freeze"
    );
  } else {
    run("git", ["cat-file", "-e", `${freeze.candidate.researchCommit}^{commit}`], { cwd: root });
  }
  run("git", ["cat-file", "-e", `${freeze.comparisonBaseline.productCommit}^{commit}`], { cwd: root });

  for (const [relativePath, expectedHash] of Object.entries(freeze.artifacts)) {
    assert.equal(
      await sha256File(path.join(root, relativePath)),
      expectedHash,
      `${relativePath} changed after the local candidate freeze`
    );
  }

  assert.equal(
    await sha256File(path.join(root, freeze.candidate.cliPath)),
    freeze.candidate.cliSha256,
    "Candidate CLI changed after the local candidate freeze"
  );
  assert.equal(
    await sha256File(path.join(root, freeze.candidate.generatedMcpPath)),
    freeze.candidate.generatedMcpSha256,
    "Generated MCP bundle changed after the local candidate freeze"
  );
  assert.deepEqual(
    await hashSourceTree(root),
    freeze.candidate.sourceTree,
    "Candidate source tree changed after the local candidate freeze"
  );

  return { freeze, freezeBytes, freezeSha256: sha256Bytes(freezeBytes) };
}

async function validateRepositoryPool({ root, pool, studyId, freezeRelativePath }) {
  assert.equal(pool.schemaVersion, 1);
  assert.equal(pool.studyId, studyId);
  assert.ok(
    pool.status === "locally-frozen" || pool.status === "publicly-preregistered-pool",
    `Unsupported repository pool status: ${pool.status}`
  );
  assert.equal(pool.candidateFreeze.path, freezeRelativePath);
  assert.equal(pool.rules.desiredTargets, 8);
  assert.deepEqual(pool.rules.requiredLanguageFamilies, [
    "javascript-typescript",
    "python",
    "go",
    "rust"
  ]);
  assert.equal(pool.rules.targetsPerLanguageFamily, 2);
  assert.ok(
    Number.isInteger(pool.rules.repositoriesPerLanguageFamily)
      && pool.rules.repositoriesPerLanguageFamily >= pool.rules.targetsPerLanguageFamily,
    "Repository fallback quota must be an integer at least as large as the target quota"
  );
  assert.equal(pool.rules.maximumMechanicalCandidatesPerRepository, 5);
  assert.equal(pool.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(pool.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);
  assert.equal(pool.rules.baselineAndCandidateFrozenBeforeTargetSelection, true);
  assert.equal(pool.rules.outputCreateOnly, true);
  assert.equal(
    pool.repositoryPool.length,
    pool.rules.requiredLanguageFamilies.length * pool.rules.repositoriesPerLanguageFamily
  );

  const priorPath = path.join(root, pool.priorExclusionSource.path);
  const priorBytes = await readFile(priorPath);
  assert.equal(sha256Bytes(priorBytes), pool.priorExclusionSource.sha256);
  const prior = JSON.parse(priorBytes.toString("utf8"));
  const observed = await collectObservedRepositories({ root, document: prior });
  const additionalObserved = Array.isArray(pool.previouslyObservedRepositories)
    ? pool.previouslyObservedRepositories.map(normalizeRepositoryUrl)
    : [];
  assert.equal(
    new Set(additionalObserved).size,
    additionalObserved.length,
    "Additional observed-repository declarations contain duplicates"
  );
  for (const repository of additionalObserved) {
    assert.ok(
      !observed.has(repository),
      `${repository} is already present in the recursive prior-observation chain`
    );
    observed.add(repository);
  }
  assert.equal(observed.size, pool.priorExclusionSource.expectedUniqueRepositoryCount);

  const poolUrls = pool.repositoryPool.map(({ url }) => normalizeRepositoryUrl(url));
  assert.equal(new Set(poolUrls).size, pool.repositoryPool.length, "Repository pool contains duplicate URLs");
  for (const repository of pool.repositoryPool) {
    assert.ok(!observed.has(normalizeRepositoryUrl(repository.url)), `${repository.name} was previously observed`);
    assert.ok(pool.rules.requiredLanguageFamilies.includes(repository.languageFamily));
    assert.match(repository.pinnedHead, /^[0-9a-f]{40}$/);
    assert.ok(Array.isArray(repository.extensions) && repository.extensions.length > 0);
  }
  for (const family of pool.rules.requiredLanguageFamilies) {
    assert.equal(
      pool.repositoryPool.filter(({ languageFamily }) => languageFamily === family).length,
      pool.rules.repositoriesPerLanguageFamily
    );
  }
  return observed;
}

async function collectObservedRepositories({ root, document, visited = new Set() }) {
  const observed = new Set([
    ...(Array.isArray(document.previouslyObservedRepositories)
      ? document.previouslyObservedRepositories
      : []),
    ...(Array.isArray(document.repositoryPool)
      ? document.repositoryPool.map(({ url }) => url)
      : [])
  ].map(normalizeRepositoryUrl));

  const source = document.priorExclusionSource;
  if (!source?.path) return observed;
  const absolutePath = path.join(root, source.path);
  assert.ok(!visited.has(absolutePath), `Recursive exclusion source: ${source.path}`);
  visited.add(absolutePath);
  const bytes = await readFile(absolutePath);
  assert.equal(sha256Bytes(bytes), source.sha256, `${source.path} hash mismatch`);
  const nested = await collectObservedRepositories({
    root,
    document: JSON.parse(bytes.toString("utf8")),
    visited
  });
  for (const repository of nested) observed.add(repository);
  return observed;
}

async function hashSourceTree(root) {
  const files = [];
  async function walk(relativePath) {
    const absolutePath = path.join(root, relativePath);
    const entry = await stat(absolutePath);
    if (!entry.isDirectory()) {
      files.push(relativePath.split(path.sep).join("/"));
      return;
    }
    for (const child of (await readdir(absolutePath)).sort()) {
      if (child === "dist" || child === "node_modules") continue;
      await walk(path.join(relativePath, child));
    }
  }

  for (const seed of sourceHashSeeds) await walk(seed);
  files.sort();
  const hash = createHash("sha256");
  for (const relativePath of files) {
    const bytes = await readFile(path.join(root, ...relativePath.split("/")));
    hash.update(relativePath);
    hash.update("\0");
    hash.update(String(bytes.length));
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return {
    algorithm: "sha256-path-length-bytes-v1",
    fileCount: files.length,
    sha256: hash.digest("hex").toUpperCase()
  };
}

function normalizeRepositoryUrl(value) {
  return value.toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
}

async function sha256File(filePath) {
  return sha256Bytes(await readFile(filePath));
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
    timeout: options.timeout ?? 120_000,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(" ")}`,
      result.stdout?.trim(),
      result.stderr?.trim()
    ].filter(Boolean).join("\n"));
  }
  return result;
}

module.exports = {
  assertCandidateFreeze,
  collectObservedRepositories,
  hashSourceTree,
  normalizeRepositoryUrl,
  sha256Bytes,
  sha256File,
  sourceHashSeeds,
  validateRepositoryPool
};
