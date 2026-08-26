const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const round = Number(valueAfter("--round"));
assert.ok(round === 22 || round === 23, "--round must be 22 or 23");
const disclosedRegression = process.argv.includes("--disclosed-regression");
const manifestPath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  `layered-routing-targets-round-${round}.json`
);
const freezePath = path.join(
  projectRoot,
  "docs",
  "research",
  "evidence",
  `layered-routing-freeze-round-${round}.json`
);
const outputPath = path.resolve(
  valueAfter("--out")
    || path.join(
      projectRoot,
      "docs",
      "research",
      "evidence",
      disclosedRegression
        ? `layered-routing-regression-round-${round}-${require("../package.json").version}.json`
        : `layered-routing-results-round-${round}.json`
    )
);

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  const [manifestSource, freezeSource] = await Promise.all([
    readFile(manifestPath, "utf8"),
    readFile(freezePath, "utf8")
  ]);
  const manifest = JSON.parse(manifestSource);
  const freeze = JSON.parse(freezeSource);
  verifyFreeze(manifestSource, freeze, disclosedRegression);
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), `vertex-palace-round-${round}-`));
  try {
    const packages = await prepareProducts(temporaryRoot, freeze, manifest, disclosedRegression);
    const observations = [];
    for (let targetIndex = 0; targetIndex < manifest.targets.length; targetIndex += 1) {
      const target = manifest.targets[targetIndex];
      for (let repetition = 1; repetition <= manifest.repetitionsPerCondition; repetition += 1) {
        const candidateFirst = (targetIndex + repetition) % 2 === 0;
        const order = candidateFirst ? ["candidate", "baseline"] : ["baseline", "candidate"];
        for (const condition of order) {
          observations.push(await runObservation({
            temporaryRoot,
            target,
            condition,
            repetition,
            cliPath: packages[condition].cliPath,
            version: packages[condition].version,
            routeLimit: manifest.routeLimit,
            budget: manifest.contextBudget
          }));
        }
      }
    }
    const analysis = analyze(manifest, observations);
    const result = {
      schemaVersion: 1,
      studyId: disclosedRegression ? `${manifest.studyId}-disclosed-regression` : manifest.studyId,
      round,
      generatedAt: new Date().toISOString(),
      claimBoundary: disclosedRegression
        ? "Post-observation disclosed regression on the immutable Round target manifest. It cannot qualify stable release or replace the original result."
        : "Paired static-routing, abstention, and context-contract evidence only. This does not execute an Agent or establish Token, wall-time, or tool-call improvement.",
      sourceCommit: disclosedRegression
        ? run("git", ["rev-parse", "HEAD"], { cwd: projectRoot }).stdout.trim()
        : freeze.sourceCommit,
      sourceTreeDirty: disclosedRegression
        ? run("git", ["status", "--short"], { cwd: projectRoot }).stdout.trim().length > 0
        : false,
      product: {
        baseline: packages.baseline,
        candidate: packages.candidate
      },
      protocol: {
        repetitionsPerCondition: manifest.repetitionsPerCondition,
        routeLimit: manifest.routeLimit,
        contextBudget: manifest.contextBudget,
        orderBalanced: true,
        targetCount: manifest.targets.length
      },
      analysis,
      observations
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ outputPath, pass: analysis.pass, gates: analysis.gates }, null, 2)}\n`);
    if (!analysis.pass) process.exitCode = 2;
  } finally {
    if (process.env.KEEP_LAYERED_ROUTING_TEMP === "1") {
      process.stderr.write(`Kept study workspaces at ${temporaryRoot}\n`);
    } else {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

function verifyFreeze(manifestSource, freeze, regression) {
  assert.equal(freeze.round, round, "freeze round mismatch");
  assert.equal(sha256(manifestSource), freeze.artifacts.manifestSha256, "manifest changed after freeze");
  if (!regression) {
    const runnerSource = require("node:fs").readFileSync(__filename, "utf8");
    assert.equal(sha256(runnerSource), freeze.artifacts.runnerSha256, "runner changed after freeze");
  }
}

async function prepareProducts(root, freeze, manifest, regression) {
  const packRoot = path.join(root, "packs");
  await mkdir(packRoot, { recursive: true });
  const candidateMeta = packPackage(".", packRoot);
  assert.equal(candidateMeta.version, regression ? require("../package.json").version : manifest.candidate);
  if (!regression) {
    assert.equal(candidateMeta.integrity, freeze.products.candidate.integrity, "candidate package differs from freeze");
  }
  const baselineMeta = packPackage("vertex-palace@0.3.0", packRoot);
  assert.equal(baselineMeta.integrity, freeze.products.baseline.integrity, "baseline package differs from freeze");
  const candidate = await installProduct(root, "candidate", path.join(packRoot, candidateMeta.filename));
  const baseline = await installProduct(root, "baseline", path.join(packRoot, baselineMeta.filename));
  return {
    candidate: { ...candidate, integrity: candidateMeta.integrity },
    baseline: { ...baseline, integrity: baselineMeta.integrity }
  };
}

function packPackage(spec, destination) {
  const result = runNpm(["pack", spec, "--json", "--ignore-scripts", "--pack-destination", destination], {
    cwd: projectRoot
  });
  const parsed = JSON.parse(result.stdout);
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

async function installProduct(root, name, tarballPath) {
  const installRoot = path.join(root, `_product-${name}`);
  await mkdir(installRoot, { recursive: true });
  await writeFile(path.join(installRoot, "package.json"), JSON.stringify({ private: true }), "utf8");
  runNpm(["install", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error", tarballPath], {
    cwd: installRoot
  });
  const cliPath = path.join(installRoot, "node_modules", "vertex-palace", "dist", "palace.cjs");
  const version = run(process.execPath, [cliPath, "--version"], { cwd: installRoot }).stdout.trim();
  return { version, cliPath };
}

async function runObservation(input) {
  const root = path.join(
    input.temporaryRoot,
    `${input.target.id}-rep-${input.repetition}-${input.condition}`
  );
  await createFixture(root, input.target);
  run("git", ["init", "-q"], { cwd: root });
  run("git", ["config", "user.email", "benchmark@example.invalid"], { cwd: root });
  run("git", ["config", "user.name", "Vertex Palace Benchmark"], { cwd: root });
  run("git", ["add", "."], { cwd: root });
  run("git", ["commit", "-qm", "frozen benchmark fixture"], { cwd: root });
  run("git", ["remote", "add", "origin", `https://github.com/vertex-palace-bench/${input.target.id}.git`], { cwd: root });
  run(process.execPath, [input.cliPath, "init"], { cwd: root });
  run(process.execPath, [input.cliPath, "index"], { cwd: root });
  if (input.condition === "candidate" && input.target.metadata) {
    await writeReferenceCache(root, input.target);
  }
  const args = [
    input.cliPath,
    "context",
    input.target.task,
    "--auto",
    "--format",
    "json",
    "--route-limit",
    String(input.routeLimit),
    "--budget",
    String(input.budget)
  ];
  if (input.condition === "candidate") {
    args.push("--references", input.target.referencePolicy || "auto");
  }
  const startedAt = Date.now();
  const raw = run(process.execPath, args, { cwd: root }).stdout;
  const elapsedMs = Date.now() - startedAt;
  const output = JSON.parse(raw);
  const routeFiles = routeFilesFromContext(output);
  const core = measureLayer(input.target.coreFiles || [], routeFiles);
  const declaredAuxiliary = measureLayer(input.target.declaredAuxiliaryFiles || [], routeFiles);
  const latentAuxiliary = measureLayer(input.target.latentAuxiliaryFiles || [], routeFiles);
  const hardMatched = new Set([...core.matchedFiles, ...declaredAuxiliary.matchedFiles]);
  const routeFocus = routeFiles.length ? roundNumber(hardMatched.size / routeFiles.length) : 0;
  const decision = output.decision || output.route?.decision || "route";
  const stopEnforced = output.executionBoundaries?.stopEnforced ?? false;
  const contextTokens = output.payload?.contextEstimatedTokens ?? Math.ceil(Buffer.byteLength(raw, "utf8") / 4);
  const payloadMetricAgreement = output.payload?.contextBytes === undefined
    || output.payload.contextBytes === Buffer.byteLength(raw, "utf8");
  const status = run("git", ["status", "--short", "--untracked-files=all"], { cwd: root }).stdout.trim();
  return {
    targetId: input.target.id,
    language: input.target.language,
    stratum: input.target.stratum,
    condition: input.condition,
    version: input.version,
    repetition: input.repetition,
    elapsedMs,
    decision,
    grounding: output.taskGrounding || output.route?.taskGrounding || null,
    mode: output.mode || null,
    evidenceStatus: output.selection?.evidenceStatus || output.evidenceStatus || null,
    stopEnforced,
    routeFiles,
    routeFileCount: routeFiles.length,
    core,
    declaredAuxiliary,
    latentAuxiliary,
    routeFocus,
    contextTokens,
    payloadMetricAgreement,
    trackedFilePollution: status,
    confidence: output.route?.confidence ?? null,
    completed: input.target.stratum === "control"
      ? decision === "abstain" && routeFiles.length === 0
      : core.coverage === 1 && declaredAuxiliary.coverage === 1
  };
}

async function createFixture(root, target) {
  await mkdir(root, { recursive: true });
  const files = new Map();
  addLanguageMarker(files, target.language, target.id);
  files.set(target.implementationPath, implementationSource(target.language, target.symbol));
  files.set(target.testPath, testSource(target.language, target.symbol, target.implementationPath));
  for (const auxiliary of target.declaredAuxiliaryFiles || []) {
    files.set(auxiliary, auxiliarySource(target.language, target.symbol));
  }
  for (const auxiliary of target.latentAuxiliaryFiles || []) {
    files.set(auxiliary, `# Latent project convention for ${target.id}\n`);
  }
  const noiseExtension = extensionFor(target.language);
  for (let index = 0; index < 18; index += 1) {
    files.set(`noise/module-${String(index).padStart(2, "0")}${noiseExtension}`, noiseSource(target.language, index));
  }
  if (target.stratum === "high-connectivity") {
    files.set(`shared/registry${noiseExtension}`, highDegreeHubSource(target.language));
  }
  for (const [relativePath, source] of files) {
    const targetPath = path.join(root, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, source, "utf8");
  }
}

function addLanguageMarker(files, language, id) {
  if (language === "typescript") {
    files.set("package.json", `${JSON.stringify({ name: id, private: true, scripts: { test: "node --test" } }, null, 2)}\n`);
  } else if (language === "python") {
    files.set("pyproject.toml", `[project]\nname = "${id}"\nversion = "0.0.0"\n`);
  } else if (language === "go") {
    files.set("go.mod", `module example.invalid/${id}\n\ngo 1.22\n`);
  } else {
    files.set("Cargo.toml", `[package]\nname = "${id}"\nversion = "0.0.0"\nedition = "2021"\n`);
  }
}

function implementationSource(language, symbol) {
  if (language === "typescript") return `export function ${symbol}(value: string): string {\n  return value.trim();\n}\n`;
  if (language === "python") return `def ${symbol}(value: str) -> str:\n    return value.strip()\n`;
  if (language === "go") return `package feature\n\nfunc ${symbol}(value string) string { return value }\n`;
  return `pub fn ${symbol}(value: &str) -> String { value.trim().to_owned() }\n`;
}

function testSource(language, symbol, implementationPath) {
  if (language === "typescript") return `import { ${symbol} } from "../../${implementationPath.replace(/\.ts$/, "")}";\ntest("${symbol}", () => expect(${symbol}(" x ")).toBe("x"));\n`;
  if (language === "python") return `from ${implementationPath.replace(/\.py$/, "").replaceAll("/", ".")} import ${symbol}\n\ndef test_${symbol}():\n    assert ${symbol}(" x ") == "x"\n`;
  if (language === "go") return `package feature\n\nimport "testing"\n\nfunc Test${symbol}(t *testing.T) { if ${symbol}("x") != "x" { t.Fatal("unexpected") } }\n`;
  return `use benchmark::${symbol};\n\n#[test]\nfn focused_${symbol}() { assert_eq!(${symbol}(" x "), "x"); }\n`;
}

function auxiliarySource(language, symbol) {
  if (language === "typescript") return `export type ${capital(symbol)}Contract = { value: string };\n`;
  if (language === "python") return `class ${capital(symbol)}Contract:\n    value: str\n`;
  if (language === "go") return `package feature\n\ntype ${capital(symbol)}Contract struct { Value string }\n`;
  return `pub trait ${capital(symbol)}Contract { fn value(&self) -> &str; }\n`;
}

function noiseSource(language, index) {
  if (language === "typescript") return `export const unrelated${index} = ${index};\n`;
  if (language === "python") return `unrelated_${index} = ${index}\n`;
  if (language === "go") return `package noise\n\nconst Unrelated${index} = ${index}\n`;
  return `pub const UNRELATED_${index}: usize = ${index};\n`;
}

function highDegreeHubSource(language) {
  const names = Array.from({ length: 18 }, (_, index) => `module_${index}`).join(" ");
  if (language === "typescript") return `export const sharedRegistry = "${names}";\n`;
  if (language === "python") return `shared_registry = "${names}"\n`;
  if (language === "go") return `package shared\n\nconst SharedRegistry = "${names}"\n`;
  return `pub const SHARED_REGISTRY: &str = "${names}";\n`;
}

async function writeReferenceCache(root, target) {
  const repository = `vertex-palace-bench/${target.id}`;
  const number = target.referenceNumber;
  const key = sha256(`${repository.toLowerCase()}#${number}`).slice(0, 24);
  const title = target.metadata.title;
  const bodyExcerpt = target.metadata.body.slice(0, 8192);
  const labels = target.metadata.labels || [];
  const kind = /\b(?:pr|pull request)\b/i.test(target.task) ? "pull" : "issue";
  const cache = {
    schemaVersion: 1,
    fetchedAt: "2026-08-26T00:00:00.000Z",
    expiresAt: "2099-01-01T00:00:00.000Z",
    reference: {
      provider: "github",
      kind,
      repository,
      number,
      url: `https://github.com/${repository}/${kind === "pull" ? "pull" : "issues"}/${number}`,
      resolutionStatus: "fetched",
      title,
      contentHash: sha256(`${title}\n${bodyExcerpt}\n${labels.join("\n")}`)
    },
    bodyExcerpt,
    labels
  };
  const cachePath = path.join(root, ".palace", "cache", "references", `github-${key}.json`);
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

function routeFilesFromContext(output) {
  const values = [];
  if (typeof output.primaryCandidate === "string") values.push(output.primaryCandidate);
  for (const group of [output.route?.primary, output.route?.support, output.route?.deferred]) {
    for (const item of group || []) {
      if (typeof item === "string") values.push(item);
      else if (typeof item?.sourcePath === "string") values.push(item.sourcePath);
    }
  }
  for (const item of output.context || []) {
    if (typeof item?.sourcePath === "string") values.push(item.sourcePath);
  }
  for (const item of output.deferredReferences || []) {
    if (typeof item === "string") values.push(item);
    else if (typeof item?.sourcePath === "string") values.push(item.sourcePath);
  }
  return [...new Set(values.map(stripLocation).filter(Boolean))].sort();
}

function measureLayer(files, routeFiles) {
  const route = new Set(routeFiles.map(pathKey));
  const matchedFiles = files.filter((file) => route.has(pathKey(file)));
  const missedFiles = files.filter((file) => !route.has(pathKey(file)));
  return {
    files,
    matchedFiles,
    missedFiles,
    coverage: files.length ? roundNumber(matchedFiles.length / files.length) : 1
  };
}

function analyze(manifest, observations) {
  const candidate = observations.filter((item) => item.condition === "candidate");
  const baseline = observations.filter((item) => item.condition === "baseline");
  const routableCandidate = candidate.filter((item) => item.stratum !== "control");
  const referenceCandidate = candidate.filter((item) => item.stratum === "reference");
  const controls = candidate.filter((item) => item.stratum === "control");
  const macroCoreCoverage = mean(routableCandidate.map((item) => item.core.coverage));
  const macroRouteFocus = mean(routableCandidate.map((item) => item.routeFocus));
  const commonTargets = manifest.targets.filter((target) => {
    const candidateRuns = candidate.filter((item) => item.targetId === target.id);
    const baselineRuns = baseline.filter((item) => item.targetId === target.id);
    return target.stratum !== "control"
      && candidateRuns.every((item) => item.completed)
      && baselineRuns.every((item) => item.completed);
  });
  const commonCandidate = candidate.filter((item) => commonTargets.some((target) => target.id === item.targetId));
  const commonBaseline = baseline.filter((item) => commonTargets.some((target) => target.id === item.targetId));
  const coverageDelta = mean(commonCandidate.map((item) => item.core.coverage))
    - mean(commonBaseline.map((item) => item.core.coverage));
  const focusDelta = mean(commonCandidate.map((item) => item.routeFocus))
    - mean(commonBaseline.map((item) => item.routeFocus));
  const gates = {
    referenceGrounding100: referenceCandidate.every((item) =>
      item.decision === "route"
        && item.grounding?.status === "resolved"
        && ["cache-hit", "fetched"].includes(item.grounding?.resolutionStatus)
    ),
    controlAbstention100: controls.every((item) => item.decision === "abstain" && item.routeFileCount === 0),
    routableCoreClosure100: routableCandidate.every((item) => item.core.coverage === 1),
    macroCoreCoverage90: macroCoreCoverage >= 0.9,
    macroRouteFocus70: macroRouteFocus >= 0.7,
    perTargetCoverage50: routableCandidate.every((item) => item.core.coverage >= 0.5),
    perTargetFocus40: routableCandidate.every((item) => item.routeFocus >= 0.4),
    declaredAuxiliary100: routableCandidate.every((item) => item.declaredAuxiliary.coverage === 1),
    commonCoverageNonInferior: commonTargets.length === 0 || coverageDelta >= -0.05,
    commonFocusNonInferior: commonTargets.length === 0 || focusDelta >= -0.05,
    zeroOverconfidence: routableCandidate.every((item) => item.confidence === null || item.confidence <= item.core.coverage),
    zeroWrongForcedStops: candidate.every((item) => item.stopEnforced === false || item.completed),
    zeroTrackedPollution: candidate.every((item) => item.trackedFilePollution === ""),
    zeroMetricDisagreement: candidate.every((item) => item.payloadMetricAgreement),
    deterministicRoutes: deterministicRoutes(candidate),
    contextCeiling6000: candidate.every((item) => item.contextTokens <= 6000)
  };
  return {
    pass: Object.values(gates).every(Boolean),
    gates,
    metrics: {
      candidateRoutableRuns: routableCandidate.length,
      candidateControlRuns: controls.length,
      macroCoreCoverage: roundNumber(macroCoreCoverage),
      macroRouteFocus: roundNumber(macroRouteFocus),
      commonCompletedTargets: commonTargets.map((target) => target.id),
      commonCoverageDelta: roundNumber(coverageDelta),
      commonFocusDelta: roundNumber(focusDelta),
      candidateMeanContextTokens: roundNumber(mean(candidate.map((item) => item.contextTokens))),
      baselineMeanContextTokens: roundNumber(mean(baseline.map((item) => item.contextTokens)))
    }
  };
}

function deterministicRoutes(candidate) {
  const byTarget = new Map();
  for (const observation of candidate) {
    const key = observation.targetId;
    const signature = JSON.stringify({ decision: observation.decision, routeFiles: observation.routeFiles });
    const signatures = byTarget.get(key) || new Set();
    signatures.add(signature);
    byTarget.set(key, signatures);
  }
  return [...byTarget.values()].every((signatures) => signatures.size === 1);
}

function extensionFor(language) {
  return language === "typescript" ? ".ts" : language === "python" ? ".py" : language === "go" ? ".go" : ".rs";
}

function stripLocation(value) {
  return String(value).replaceAll("\\", "/").replace(/:\d+(?:-\d+)?$/, "");
}

function pathKey(value) {
  return stripLocation(value).toLowerCase();
}

function capital(value) {
  return value.replace(/(^|[_-])(\w)/g, (_match, _prefix, character) => character.toUpperCase());
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function mean(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function roundNumber(value) {
  return Number(value.toFixed(3));
}

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function runNpm(args, options) {
  if (process.platform === "win32") {
    const commandLine = `npm ${args.map(quoteCmdArgument).join(" ")}`;
    return run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], options);
  }
  return run("npm", args, options);
}

function quoteCmdArgument(value) {
  const text = String(value);
  assert.ok(!text.includes('"'), "npm arguments must not contain quotes");
  return /\s/.test(text) ? `"${text}"` : text;
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(" ")} failed with exit code ${result.status}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join("\n"));
  }
  return result;
}
