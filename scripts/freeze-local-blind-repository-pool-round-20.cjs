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
const studyId = "local-blind-routing-round-20-0.4-stable-candidate";
const planRelativePath =
  "docs/research/evidence/local-blind-routing-repository-plan-0.4-stable-round-20.json";
const poolRelativePath =
  "docs/research/evidence/local-blind-routing-repository-pool-0.4-stable-round-20.json";
const headEvidenceRelativePath =
  "docs/research/evidence/local-blind-routing-repository-head-verification-0.4-stable-round-20.json";
const failureEvidenceRelativePath =
  "docs/research/evidence/local-blind-routing-repository-pool-freeze-0.4-stable-round-20-attempt-1-failure.json";
const freezeRelativePath =
  "docs/research/evidence/local-blind-candidate-freeze-0.4-stable-round-20.json";
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

  const priorBytes = await readFile(path.join(projectRoot, plan.priorExclusionSource.path));
  assert.equal(
    sha256Bytes(priorBytes),
    plan.priorExclusionSource.sha256,
    "Prior exclusion source changed after the Round 20 plan was written"
  );
  const observed = await collectObservedRepositories({
    root: projectRoot,
    document: JSON.parse(priorBytes.toString("utf8"))
  });
  for (const repository of plan.priorExclusionSource.additionalPreviouslyObservedRepositories) {
    observed.add(normalizeRepositoryUrl(repository));
  }
  assert.equal(
    observed.size,
    plan.priorExclusionSource.expectedUniqueRepositoryCount,
    "Round 20 prior-observation count differs from the frozen plan"
  );

  const plannedUrls = plan.repositoryPlan.map(({ url }) => normalizeRepositoryUrl(url));
  assert.equal(new Set(plannedUrls).size, plannedUrls.length, "Round 20 roster contains duplicate URLs");
  for (const repository of plan.repositoryPlan) {
    assert.ok(!observed.has(normalizeRepositoryUrl(repository.url)), `${repository.name} was previously observed`);
  }

  const startedAt = new Date().toISOString();
  const rosterResults = [];
  for (const [repositoryIndex, repository] of plan.repositoryPlan.entries()) {
    try {
      rosterResults.push({ repositoryIndex, repository, ...queryRemoteHead(repository.url) });
    } catch (error) {
      await writePoolFailure({
        outputPath: outputs.failureEvidencePath,
        plan,
        planBytes,
        observed,
        startedAt,
        rosterResults,
        failure: queryFailure(error, repository, repositoryIndex)
      });
      throw error;
    }
  }

  const selectedResults = [];
  const reachabilityCounts = {};
  for (const family of plan.rules.requiredLanguageFamilies) {
    const familyResults = rosterResults.filter(({ repository }) => repository.languageFamily === family);
    const reachable = familyResults.filter(({ status }) => status === "reachable");
    reachabilityCounts[family] = {
      roster: familyResults.length,
      reachable: reachable.length,
      definitivelyMissing: familyResults.filter(({ status }) => status === "definitively-missing").length
    };
    if (reachable.length < plan.rules.repositoriesPerLanguageFamily) {
      const error = new Error(
        `${family} has ${reachable.length} reachable repositories; ${plan.rules.repositoriesPerLanguageFamily} required`
      );
      await writePoolFailure({
        outputPath: outputs.failureEvidencePath,
        plan,
        planBytes,
        observed,
        startedAt,
        rosterResults,
        failure: {
          category: "insufficient-reachable-roster",
          languageFamily: family,
          diagnostic: error.message
        }
      });
      throw error;
    }
    selectedResults.push(...reachable.slice(0, plan.rules.repositoriesPerLanguageFamily));
  }

  const completedAt = new Date().toISOString();
  const planSha256 = sha256Bytes(planBytes);
  const repositoryPool = selectedResults.map(({ repository, head }) => ({
    ...repository,
    pinnedHead: head
  }));
  const pool = {
    schemaVersion: 1,
    studyId,
    status: "publicly-preregistered-pool",
    frozenAt: completedAt,
    publicPreregistration: true,
    plan: { path: planRelativePath, sha256: planSha256 },
    claimBoundary: "The publicly committed 48-entry URL-and-HEAD-only roster was queried before any Round 20 history, subject, diff, task, review, oracle, or Palace result was inspected. Definitively missing URLs are preserved and skipped mechanically. The canonical pool contains the first eight reachable repositories per language family in frozen order.",
    candidateFreeze: { path: freezeRelativePath },
    priorExclusionSource: {
      path: plan.priorExclusionSource.path,
      sha256: plan.priorExclusionSource.sha256,
      includePreviousExclusionChain: true,
      includeRound19CanonicalPoolAndPriorChain: true,
      includeAdditionalPreviouslyObservedRepositories: true,
      expectedUniqueRepositoryCount: plan.priorExclusionSource.expectedUniqueRepositoryCount
    },
    previouslyObservedRepositories: [
      ...plan.priorExclusionSource.additionalPreviouslyObservedRepositories
    ],
    rules: {
      ...plan.rules,
      baselineAndCandidateFrozenBeforeTargetSelection: true
    },
    repositoryPool
  };

  await validateRepositoryPool({ root: projectRoot, pool, studyId, freezeRelativePath });

  const selectedUrls = new Set(repositoryPool.map(({ url }) => normalizeRepositoryUrl(url)));
  const headEvidence = {
    schemaVersion: 1,
    studyId,
    status: "verified",
    startedAt,
    completedAt,
    plan: { path: planRelativePath, sha256: planSha256 },
    priorExclusionSource: {
      path: plan.priorExclusionSource.path,
      sha256: plan.priorExclusionSource.sha256,
      observedRepositoryCount: observed.size
    },
    commandContract: "git ls-remote <url> HEAD",
    selectionContract: "first-eight-reachable-per-family-v1",
    retryPolicy: {
      maximumAttemptsPerRepository: maximumHeadAttempts,
      delayMs: retryDelayMs,
      transientNetworkFailuresOnly: true,
      transientNetworkExhaustionAbortsRound: true,
      definitivelyMissingRepositoryMayBeSkipped: true,
      repositoryPlanChangedAfterFailure: false
    },
    reachabilityCounts,
    commitHistoryInspected: false,
    candidateTaskInspected: false,
    palaceCallsOnCandidateTasks: 0,
    repositories: rosterResults.map(({ repositoryIndex, repository, status, head, attempts, diagnostic }) => ({
      repositoryIndex,
      name: repository.name,
      languageFamily: repository.languageFamily,
      url: repository.url,
      status,
      observedHead: head ?? null,
      attempts,
      diagnostic: diagnostic ?? null,
      selectedForCanonicalPool: selectedUrls.has(normalizeRepositoryUrl(repository.url))
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
    rosterRepositories: rosterResults.length,
    frozenRepositories: repositoryPool.length,
    reachabilityCounts,
    planSha256,
    poolPath: path.relative(projectRoot, outputs.poolPath).split(path.sep).join("/"),
    headEvidencePath: path.relative(projectRoot, outputs.headEvidencePath).split(path.sep).join("/"),
    totalHeadQueries: rosterResults.reduce((total, result) => total + result.attempts, 0),
    commitHistoryInspected: false,
    palaceCallsOnCandidateTasks: 0
  }, null, 2)}\n`);
}

async function writePoolFailure({
  outputPath,
  plan,
  planBytes,
  observed,
  startedAt,
  rosterResults,
  failure
}) {
  const attemptedRepositories = rosterResults.map(({ repository }) => repository.url);
  if (failure.url && !attemptedRepositories.includes(failure.url)) attemptedRepositories.push(failure.url);
  const document = {
    schemaVersion: 1,
    studyId,
    status: "repository-pool-freeze-failed",
    startedAt,
    failedAt: new Date().toISOString(),
    publicPreregistration: true,
    plan: { path: planRelativePath, sha256: sha256Bytes(planBytes) },
    priorExclusionSource: {
      path: plan.priorExclusionSource.path,
      sha256: plan.priorExclusionSource.sha256,
      observedRepositoryCount: observed.size
    },
    failure,
    execution: {
      commandContract: "git ls-remote <url> HEAD",
      plannedRepositoryCount: plan.repositoryPlan.length,
      completedRosterResults: rosterResults.map(({ repositoryIndex, repository, status, head, attempts, diagnostic }) => ({
        repositoryIndex,
        name: repository.name,
        languageFamily: repository.languageFamily,
        url: repository.url,
        status,
        observedHead: head ?? null,
        attempts,
        diagnostic: diagnostic ?? null
      })),
      attemptedRepositories,
      commitHistoryInspected: false,
      candidateTaskInspected: false,
      candidateDiffInspected: false,
      palaceCallsOnCandidateTasks: 0
    },
    previouslyObservedRepositories: attemptedRepositories,
    outputs: {
      canonicalPoolPath: poolRelativePath,
      canonicalPoolWritten: false,
      canonicalHeadEvidencePath: headEvidenceRelativePath,
      canonicalHeadEvidenceWritten: false,
      candidateFreezeWritten: false,
      targetSelectionStarted: false,
      staticValidationAuthorized: false,
      agentStudyAuthorized: false
    },
    claimBoundary: "Round 20 failed during the frozen URL-and-HEAD-only reachability phase. No canonical pool was written and no history, candidate task, diff, review, oracle, or Palace result was inspected. This is a protocol or environment result, not a Vertex Palace product result."
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
}

function assertPlan(plan) {
  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.studyId, studyId);
  assert.equal(plan.status, "preregistered-before-head-query");
  assert.equal(plan.publicPreregistration, true);
  assert.equal(plan.priorExclusionSource.expectedUniqueRepositoryCount, 226);
  assert.deepEqual(plan.priorExclusionSource.additionalPreviouslyObservedRepositories, []);
  assert.equal(plan.candidateFreeze.path, freezeRelativePath);
  assert.equal(plan.repositoryPlan.length, 48);
  assert.deepEqual(plan.rules.requiredLanguageFamilies, [
    "javascript-typescript",
    "python",
    "go",
    "rust"
  ]);
  assert.equal(plan.rules.rosterRepositoriesPerLanguageFamily, 12);
  assert.equal(plan.rules.repositoriesPerLanguageFamily, 8);
  assert.equal(plan.rules.targetsPerLanguageFamily, 2);
  assert.equal(plan.rules.desiredTargets, 8);
  assert.equal(plan.rules.reachableRepositorySelection, "first-eight-reachable-per-family-v1");
  assert.equal(plan.rules.definitivelyMissingRepositoryMayBeSkipped, true);
  assert.equal(plan.rules.transientNetworkExhaustionAbortsRound, true);
  assert.equal(plan.rules.commitHistoryInspectedBeforePoolFreeze, false);
  assert.equal(plan.rules.palaceCallsOnCandidateTasksBeforePoolFreeze, 0);
  assert.equal(plan.rules.outputCreateOnly, true);
  assert.equal(plan.executionBoundary.remoteHeadQueriesBeforeCommit, 0);
  assert.equal(plan.executionBoundary.commitHistoryInspectedBeforeCommit, false);
  assert.equal(plan.executionBoundary.candidateTasksInspectedBeforeCommit, false);
  assert.equal(plan.executionBoundary.palaceCallsOnCandidateTasksBeforeCommit, 0);

  for (const family of plan.rules.requiredLanguageFamilies) {
    assert.equal(
      plan.repositoryPlan.filter((repository) => repository.languageFamily === family).length,
      plan.rules.rosterRepositoriesPerLanguageFamily,
      `${family} roster size differs from the preregistered quota`
    );
  }
  for (const repository of plan.repositoryPlan) {
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
      return { status: "reachable", head: match[1].toLowerCase(), attempts: attempt };
    }
    const diagnostic = [result.stdout?.trim(), result.stderr?.trim()].filter(Boolean).join("\n");
    if (isDefinitivelyMissing(diagnostic)) {
      return { status: "definitively-missing", attempts: attempt, diagnostic };
    }
    if (attempt < maximumHeadAttempts && isTransientNetworkFailure(diagnostic)) {
      sleep(retryDelayMs);
      continue;
    }
    const error = new Error([
      `HEAD query failed for ${url} after ${attempt} attempt(s)`,
      diagnostic
    ].filter(Boolean).join("\n"));
    error.headQuery = { url, attempts: attempt, diagnostic };
    throw error;
  }
  throw new Error(`HEAD query exhausted unexpectedly for ${url}`);
}

function queryFailure(error, repository, repositoryIndex) {
  const headQuery = error instanceof Error && error.headQuery ? error.headQuery : {};
  return {
    category: isTransientNetworkFailure(headQuery.diagnostic ?? "")
      ? "transient-network-failure"
      : "head-query-failure",
    repositoryIndex,
    repositoryOrdinal: repositoryIndex + 1,
    name: repository.name,
    languageFamily: repository.languageFamily,
    url: repository.url,
    attempts: headQuery.attempts ?? 0,
    diagnostic: headQuery.diagnostic ?? (error instanceof Error ? error.message : String(error))
  };
}

function isDefinitivelyMissing(diagnostic) {
  return /repository not found|repository .* does not exist/i.test(diagnostic);
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
  return {
    poolPath: exactOutput(args, "--out-pool", poolRelativePath),
    headEvidencePath: exactOutput(args, "--out-head-evidence", headEvidenceRelativePath),
    failureEvidencePath: exactOutput(args, "--out-failure", failureEvidenceRelativePath)
  };
}

function exactOutput(args, flag, expectedRelativePath) {
  const index = args.indexOf(flag);
  assert.ok(index >= 0, `${flag} is required`);
  assert.ok(args[index + 1], `${flag} requires a repository-relative path`);
  const resolved = path.resolve(projectRoot, args[index + 1]);
  assert.equal(resolved, path.join(projectRoot, expectedRelativePath), `${flag} must use ${expectedRelativePath}`);
  return resolved;
}
