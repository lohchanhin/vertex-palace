const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { cp, mkdtemp, readFile, readdir, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..", "..");
const fixtureRoot = path.join(root, "packages", "core", "test", "fixtures", "room-inventory-evidence-roles");
const oraclePath = path.join(fixtureRoot, "oracle.json");
const protocolPath = path.join(root, "docs", "research", "evidence", "room-inventory-phase-4-preregistration-0.5.json");

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

async function main() {
  const outputPath = resolveOutputPath(process.argv.slice(2));
  const oracle = JSON.parse(await readFile(oraclePath, "utf8"));
  const protocol = JSON.parse(await readFile(protocolPath, "utf8"));
  await verifyFrozenInputs(protocol);

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-phase-4-"));
  const repositoryRoot = path.join(temporaryRoot, "repository");
  try {
    await cp(fixtureRoot, repositoryRoot, { recursive: true });
    await rm(path.join(repositoryRoot, "oracle.json"), { force: true });
    const core = await import(pathToFileURL(path.join(root, "packages", "core", "dist", "index.js")).href);
    const baseline = await indexSummary(core, repositoryRoot, false);
    const enabled = await indexSummary(core, repositoryRoot, true);
    const targets = [];
    for (const target of oracle.targets) {
      const first = await runRoute(core, repositoryRoot, target);
      const second = await runRoute(core, repositoryRoot, target);
      targets.push(measureTarget(target, first, second));
    }
    const result = buildResult({ oracle, protocol, baseline, enabled, targets });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function indexSummary(core, repositoryRoot, roomInventory) {
  const summary = await core.indexPalace(repositoryRoot, { roomInventory });
  const index = await core.readIndex(repositoryRoot);
  const byId = new Map(index.nodes.map((node) => [node.id, node]));
  return {
    files: summary.fileCount,
    nodes: summary.nodeCount,
    objects: summary.objectCount,
    edges: summary.edgeCount,
    objectRelations: index.edges.filter((edge) => (
      Boolean(byId.get(edge.from)?.object && byId.get(edge.to)?.object)
    )).length
  };
}

async function runRoute(core, repositoryRoot, target) {
  const route = await core.routePalace(repositoryRoot, target.task, {
    routeLimit: target.routeLimit,
    budget: 6000,
    referencePolicy: "off"
  });
  return {
    decision: route.decision,
    confidence: route.confidence,
    evidenceStatus: route.evidenceClosure?.status ?? "unknown",
    estimatedTokens: route.budget.estimatedTokens,
    files: unique(route.route.map((step) => physicalPath(step.sourcePath)))
  };
}

function measureTarget(target, first, second) {
  const required = target.requiredEvidence.map((entry) => entry.path);
  const requiredSet = new Set(required);
  const allowedSet = new Set([...required, ...target.allowedSupport]);
  const selectedSet = new Set(first.files);
  const matchedRequired = required.filter((sourcePath) => selectedSet.has(sourcePath));
  const missedRequired = required.filter((sourcePath) => !selectedSet.has(sourcePath));
  const matchedFacets = target.requiredEvidence
    .filter((entry) => selectedSet.has(entry.path))
    .map((entry) => entry.facet);
  const requiredFacets = unique(target.requiredEvidence.map((entry) => entry.facet));
  const missedFacets = requiredFacets.filter((facet) => !matchedFacets.includes(facet));
  const relevantSelected = first.files.filter((sourcePath) => allowedSet.has(sourcePath));
  const coverage = ratio(matchedRequired.length, requiredSet.size);
  const focus = ratio(relevantSelected.length, first.files.length);
  return {
    id: target.id,
    language: target.language,
    task: target.task,
    routeLimit: target.routeLimit,
    decision: first.decision,
    confidence: first.confidence,
    evidenceStatus: first.evidenceStatus,
    estimatedTokens: first.estimatedTokens,
    routeFiles: first.files,
    repeatedRouteFiles: second.files,
    deterministic: first.decision === second.decision
      && JSON.stringify(first.files) === JSON.stringify(second.files),
    requiredFiles: required.length,
    matchedRequiredFiles: matchedRequired,
    missedRequiredFiles: missedRequired,
    requiredFileCoverage: coverage,
    routeFocus: focus,
    requiredFacets,
    matchedFacets: unique(matchedFacets),
    missedFacets,
    explicitFacetClosure: missedFacets.length === 0,
    forbiddenHits: [],
    overconfidentIncomplete: coverage < 1 && first.confidence > coverage + 0.15
  };
}

function buildResult({ oracle, protocol, baseline, enabled, targets }) {
  const forbidden = new Set(oracle.forbiddenEvidence);
  for (const target of targets) {
    target.forbiddenHits = target.routeFiles.filter((sourcePath) => forbidden.has(sourcePath));
  }
  const requiredFiles = sum(targets.map((target) => target.requiredFiles));
  const matchedFiles = sum(targets.map((target) => target.matchedRequiredFiles.length));
  const focusedTargets = targets.filter((target) => target.requiredFacets.includes("focused-verification"));
  const generatedTargets = targets.filter((target) => target.requiredFacets.includes("generated-artifact"));
  const metrics = {
    routeDecisionRate: ratio(targets.filter((target) => target.decision === "route").length, targets.length),
    macroRequiredFileCoverage: ratio(matchedFiles, requiredFiles),
    minimumPerTargetRequiredFileCoverage: Math.min(...targets.map((target) => target.requiredFileCoverage)),
    explicitFacetClosureRate: ratio(targets.filter((target) => target.explicitFacetClosure).length, targets.length),
    focusedVerificationCoverage: ratio(
      focusedTargets.filter((target) => !target.missedFacets.includes("focused-verification")).length,
      focusedTargets.length
    ),
    generatedArtifactCoverage: ratio(
      generatedTargets.filter((target) => !target.missedFacets.includes("generated-artifact")).length,
      generatedTargets.length
    ),
    macroRouteFocus: average(targets.map((target) => target.routeFocus)),
    minimumPerTargetRouteFocus: Math.min(...targets.map((target) => target.routeFocus)),
    forbiddenDecoyHits: sum(targets.map((target) => target.forbiddenHits.length)),
    deterministicRouteAgreement: ratio(targets.filter((target) => target.deterministic).length, targets.length),
    maximumContextTokens: Math.max(...targets.map((target) => target.estimatedTokens)),
    wrongForcedStops: targets.filter((target) => target.decision !== "route").length,
    overconfidentIncompleteRoutes: targets.filter((target) => target.overconfidentIncomplete).length
  };
  const gates = {
    routeDecisionRate: metrics.routeDecisionRate >= protocol.gates.routeDecisionRate,
    macroRequiredFileCoverage: metrics.macroRequiredFileCoverage >= protocol.gates.minimumMacroRequiredFileCoverage,
    perTargetRequiredFileCoverage: metrics.minimumPerTargetRequiredFileCoverage >= protocol.gates.minimumPerTargetRequiredFileCoverage,
    explicitFacetClosureRate: metrics.explicitFacetClosureRate >= protocol.gates.explicitFacetClosureRate,
    focusedVerificationCoverage: metrics.focusedVerificationCoverage >= protocol.gates.focusedVerificationCoverage,
    generatedArtifactCoverage: metrics.generatedArtifactCoverage >= protocol.gates.generatedArtifactCoverage,
    macroRouteFocus: metrics.macroRouteFocus >= protocol.gates.minimumMacroRouteFocus,
    perTargetRouteFocus: metrics.minimumPerTargetRouteFocus >= protocol.gates.minimumPerTargetRouteFocus,
    forbiddenDecoyHits: metrics.forbiddenDecoyHits <= protocol.gates.maximumForbiddenDecoyHits,
    deterministicRouteAgreement: metrics.deterministicRouteAgreement >= protocol.gates.deterministicRouteAgreement,
    contextTokenCeiling: metrics.maximumContextTokens <= protocol.gates.maximumContextTokens,
    wrongForcedStops: metrics.wrongForcedStops <= protocol.gates.maximumWrongForcedStops,
    overconfidentIncompleteRoutes: metrics.overconfidentIncompleteRoutes <= protocol.gates.maximumOverconfidentIncompleteRoutes,
    defaultOffCompatibility: baseline.objects === 0 && baseline.objectRelations === 0
  };
  return {
    schemaVersion: 1,
    featureVersion: "0.5",
    phase: 4,
    observation: "first",
    immutable: true,
    observedAt: new Date().toISOString(),
    candidate: {
      sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      entrypoint: "packages/core/dist/index.js",
      roomInventoryEnabled: true
    },
    fixture: {
      oracleSha256: protocol.fixture.oracleSha256,
      fixtureSourcesSha256: protocol.fixture.fixtureSourcesSha256,
      targets: oracle.targets.length,
      requiredFiles,
      forbiddenFiles: oracle.forbiddenEvidence.length
    },
    baseline,
    enabled,
    metrics,
    targets,
    gates,
    overallPass: Object.values(gates).every(Boolean),
    claimBoundary: "This disclosed synthetic first observation is development evidence only, not Round 26 qualification or Agent-performance evidence."
  };
}

async function verifyFrozenInputs(protocol) {
  if (protocol.status !== "evidence-facet-protocol-frozen-candidate-unobserved" || protocol.candidate.observed !== false) {
    throw new Error("Phase 4 protocol does not authorize a first observation.");
  }
  const oracleSha256 = await sha256File(oraclePath);
  const sourcesSha256 = await fixtureSourcesSha256();
  if (oracleSha256 !== protocol.fixture.oracleSha256) {
    throw new Error(`Oracle hash mismatch: expected ${protocol.fixture.oracleSha256}, received ${oracleSha256}.`);
  }
  if (sourcesSha256 !== protocol.fixture.fixtureSourcesSha256) {
    throw new Error(`Fixture sources hash mismatch: expected ${protocol.fixture.fixtureSourcesSha256}, received ${sourcesSha256}.`);
  }
}

async function fixtureSourcesSha256() {
  const digest = createHash("sha256");
  for (const filePath of (await walkFiles(fixtureRoot))
    .filter((file) => file !== oraclePath)
    .sort((left, right) => left.localeCompare(right))) {
    const relative = path.relative(fixtureRoot, filePath).replaceAll("\\", "/");
    digest.update(relative);
    digest.update("\0");
    digest.update(await readFile(filePath));
    digest.update("\0");
  }
  return digest.digest("hex");
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function resolveOutputPath(arguments_) {
  const outputIndex = arguments_.indexOf("--out");
  if (outputIndex < 0 || !arguments_[outputIndex + 1]) {
    throw new Error("Usage: node scripts/research/measure-room-inventory-phase-4.cjs --out <new-json-path>");
  }
  return path.resolve(root, arguments_[outputIndex + 1]);
}

function physicalPath(sourcePath) {
  return sourcePath.replace(/:\d+(?:-\d+)?$/, "");
}

function unique(values) {
  return [...new Set(values)];
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 1 : Number((numerator / denominator).toFixed(4));
}

function average(values) {
  return values.length ? Number((sum(values) / values.length).toFixed(4)) : 1;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
