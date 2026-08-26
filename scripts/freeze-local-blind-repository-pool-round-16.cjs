const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const {
  collectObservedRepositories,
  normalizeRepositoryUrl,
  sha256Bytes,
  validateRepositoryPool
} = require("./lib/local-blind-freeze.cjs");

const projectRoot = path.resolve(__dirname, "..");
const studyId = "local-blind-routing-round-16-0.4-alpha";
const planRelativePath =
  "docs/research/evidence/local-blind-routing-repository-plan-0.4-alpha-round-16.json";
const poolRelativePath =
  "docs/research/evidence/local-blind-routing-repository-pool-0.4-alpha-round-16.json";
const headEvidenceRelativePath =
  "docs/research/evidence/local-blind-routing-repository-head-verification-0.4-alpha-round-16.json";
const freezeRelativePath =
  "docs/research/evidence/local-blind-candidate-freeze-0.4-alpha-round-16.json";
const maximumHeadAttempts = 3;
const retryDelayMs = 5_000;

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const outputs = outputArguments(process.argv.slice(2));
  const planBytes = await readFile(path.join(projectRoot, planRelativePath));
  const plan = JSON.parse(planBytes.toString("utf8"));
  assertPlan(plan);

  const priorPath = path.join(projectRoot, plan.priorExclusionSource.path);
  const priorBytes = await readFile(priorPath);
  assert.equal(
    sha256Bytes(priorBytes),
    plan.priorExclusionSource.sha256,
    "Prior exclusion source changed after the Round 16 plan was written"
  );
  const prior = JSON.parse(priorBytes.toString("utf8"));
  const observed = await collectObservedRepositories({ root: projectRoot, document: prior });
  for (const repository of plan.priorExclusionSource.additionalPreviouslyObservedRepositories) {
    observed.add(normalizeRepositoryUrl(repository));
  }
  assert.equal(
    observed.size,
    plan.priorExclusionSource.expectedUniqueRepositoryCount,
    "Round 16 prior-observation count differs from the frozen plan"
  );

  const plannedUrls = plan.repositoryPlan.map(({ url }) => normalizeRepositoryUrl(url));
  assert.equal(new Set(plannedUrls).size, plannedUrls.length, "Round 16 plan contains duplicate URLs");
  for (const repository of plan.repositoryPlan) {
    assert.ok(
      !observed.has(normalizeRepositoryUrl(repository.url)),
      `${repository.name} was already observed before Round 16`
    );
  }

  const startedAt = new Date().toISOString();
  const headResults = plan.repositoryPlan.map((repository) => ({
    repository,
    ...queryRemoteHead(repository.url)
  }));
  const repositoryPool = headResults.map(({ repository, head }) => ({
    ...repository,
    pinnedHead: head
  }));
  const completedAt = new Date().toISOString();
  const planSha256 = sha256Bytes(planBytes);
  const previouslyObservedRepositories = [
    ...plan.priorExclusionSource.additionalPreviouslyObservedRepositories
  ];
  const pool = {
    schemaVersion: 1,
    studyId,
    status: "locally-frozen",
    frozenAt: completedAt,
    publicPreregistration: false,
    plan: {
      path: planRelativePath,
      sha256: planSha256
    },
    claimBoundary: "Fresh URL-and-HEAD-only repository pool frozen before any Round 16 repository history, commit subject, diff, task, coherence review, oracle, or Palace result was inspected. Candidate source, selectors, and validation artifacts must still be frozen before target selection. This is not public preregistration.",
    candidateFreeze: {
      path: freezeRelativePath
    },
    priorExclusionSource: {
      path: plan.priorExclusionSource.path,
      sha256: plan.priorExclusionSource.sha256,
      includePreviousExclusionChain: true,
      includeRound12RepositoryPool: true,
      includeAdditionalPreviouslyObservedRepositories: true,
      expectedUniqueRepositoryCount: plan.priorExclusionSource.expectedUniqueRepositoryCount
    },
    previouslyObservedRepositories,
    rules: {
      ...plan.rules,
      baselineAndCandidateFrozenBeforeTargetSelection: true
    },
    repositoryPool
  };

  await validateRepositoryPool({
    root: projectRoot,
    pool,
    studyId,
    freezeRelativePath
  });

  const headEvidence = {
    schemaVersion: 1,
    studyId,
    status: "verified",
    startedAt,
    completedAt,
    plan: {
      path: planRelativePath,
      sha256: planSha256
    },
    priorExclusionSource: {
      path: plan.priorExclusionSource.path,
      sha256: plan.priorExclusionSource.sha256,
      observedRepositoryCount: observed.size
    },
    commandContract: "git ls-remote <url> HEAD",
    retryPolicy: {
      maximumAttemptsPerRepository: maximumHeadAttempts,
      delayMs: retryDelayMs,
      transientNetworkFailuresOnly: true,
      repositoryPlanChangedAfterFailure: false
    },
    commitHistoryInspected: false,
    candidateTaskInspected: false,
    palaceCallsOnCandidateTasks: 0,
    repositories: headResults.map(({ repository, head, attempts }) => ({
      name: repository.name,
      languageFamily: repository.languageFamily,
      url: repository.url,
      observedHead: head,
      attempts,
      matchedFrozenPool: true
    }))
  };

  await mkdir(path.dirname(outputs.poolPath), { recursive: true });
  await writeFile(outputs.headEvidencePath, `${JSON.stringify(headEvidence, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(outputs.poolPath, `${JSON.stringify(pool, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });

  process.stdout.write(`${JSON.stringify({
    studyId,
    status: pool.status,
    priorObservedRepositories: observed.size,
    frozenRepositories: repositoryPool.length,
    languageFamilies: Object.fromEntries(
      plan.rules.requiredLanguageFamilies.map((family) => [
        family,
        repositoryPool.filter((repository) => repository.languageFamily === family).length
      ])
    ),
    planSha256,
    poolPath: path.relative(projectRoot, outputs.poolPath).split(path.sep).join("/"),
    headEvidencePath: path.relative(projectRoot, outputs.headEvidencePath).split(path.sep).join("/"),
    totalHeadQueries: headResults.reduce((total, result) => total + result.attempts, 0),
    commitHistoryInspected: false,
    palaceCallsOnCandidateTasks: 0
  }, null, 2)}\n`);
}

function assertPlan(plan) {
  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.studyId, studyId);
  assert.equal(plan.status, "locally-preregistered-before-head-query");
  assert.equal(plan.publicPreregistration, false);
  assert.equal(plan.priorExclusionSource.expectedUniqueRepositoryCount, 162);
  assert.deepEqual(plan.priorExclusionSource.additionalPreviouslyObservedRepositories, [
    "https://github.com/open-webui/open-webui.git"
  ]);
  assert.equal(plan.candidateFreeze.path, freezeRelativePath);
  assert.equal(plan.repositoryPlan.length, 16);
  assert.deepEqual(plan.rules.requiredLanguageFamilies, [
    "javascript-typescript",
    "python",
    "go",
    "rust"
  ]);
  assert.equal(plan.rules.repositoriesPerLanguageFamily, 4);
  assert.equal(plan.rules.targetsPerLanguageFamily, 2);
  assert.equal(plan.rules.desiredTargets, 8);
  assert.equal(plan.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(plan.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);
  assert.equal(plan.rules.outputCreateOnly, true);
  assert.equal(plan.executionBoundary.allowedNetworkCommand, "git ls-remote <url> HEAD");
  assert.equal(plan.executionBoundary.repositoryCloneBeforePoolFreeze, false);
  assert.equal(plan.executionBoundary.commitHistoryInspectionBeforePoolFreeze, false);
  assert.equal(plan.executionBoundary.candidateTaskInspectionBeforePoolFreeze, false);
  assert.equal(plan.executionBoundary.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);

  for (let index = 0; index < plan.repositoryPlan.length; index += 1) {
    const expectedFamily = plan.rules.requiredLanguageFamilies[index % 4];
    const repository = plan.repositoryPlan[index];
    assert.equal(repository.languageFamily, expectedFamily, "Repository plan is not interleaved by family");
    assert.match(repository.url, /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/);
    assert.ok(Array.isArray(repository.extensions) && repository.extensions.length > 0);
  }
}

function queryRemoteHead(url) {
  for (let attempt = 1; attempt <= maximumHeadAttempts; attempt += 1) {
    const result = spawnSync("git", ["ls-remote", url, "HEAD"], {
      cwd: projectRoot,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 1024 * 1024,
      timeout: 120_000,
      windowsHide: true
    });
    if (result.error) throw result.error;
    if (result.status === 0) {
      const match = result.stdout.trim().match(/^([0-9a-f]{40})\s+HEAD$/i);
      assert.ok(match, `Unexpected ls-remote HEAD response for ${url}`);
      return { head: match[1].toLowerCase(), attempts: attempt };
    }
    const diagnostic = [result.stdout?.trim(), result.stderr?.trim()].filter(Boolean).join("\n");
    if (attempt < maximumHeadAttempts && isTransientNetworkFailure(diagnostic)) {
      sleep(retryDelayMs);
      continue;
    }
    throw new Error([
      `HEAD query failed for ${url} after ${attempt} attempt(s)`,
      diagnostic
    ].filter(Boolean).join("\n"));
  }
  throw new Error(`HEAD query exhausted unexpectedly for ${url}`);
}

function isTransientNetworkFailure(diagnostic) {
  return /could not connect|failed to connect|could not resolve|connection timed out|connection reset|recv failure|tls|ssl/i.test(
    diagnostic
  );
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function outputArguments(args) {
  const poolPath = exactOutput(args, "--out-pool", poolRelativePath);
  const headEvidencePath = exactOutput(args, "--out-head-evidence", headEvidenceRelativePath);
  return { poolPath, headEvidencePath };
}

function exactOutput(args, flag, expectedRelativePath) {
  const index = args.indexOf(flag);
  assert.ok(index >= 0, `${flag} is required`);
  assert.ok(args[index + 1], `${flag} requires a repository-relative path`);
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.equal(
    resolved,
    path.join(projectRoot, expectedRelativePath),
    `${flag} must use ${expectedRelativePath}`
  );
  return resolved;
}
