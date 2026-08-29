const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { cp, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..", "..");
const fixtureRoot = path.join(root, "packages", "core", "test", "fixtures", "room-inventory-relations");
const oraclePath = path.join(fixtureRoot, "oracle.json");
const protocolPath = path.join(root, "docs", "research", "evidence", "room-inventory-phase-3-preregistration-0.5.json");
const relationTypes = new Set(["contains", "calls", "tests", "tested_by"]);

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

async function main() {
  const outputPath = resolveOutputPath(process.argv.slice(2));
  const oracle = JSON.parse(await readFile(oraclePath, "utf8"));
  const protocol = JSON.parse(await readFile(protocolPath, "utf8"));
  const oracleSha256 = await sha256File(oraclePath);
  if (oracleSha256 !== protocol.fixture.oracleSha256) {
    throw new Error(`Oracle hash mismatch: expected ${protocol.fixture.oracleSha256}, received ${oracleSha256}.`);
  }
  if (protocol.execution.candidateObserved !== false) {
    throw new Error("Phase 3 protocol no longer authorizes a first observation.");
  }

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vertex-palace-phase-3-"));
  const repositoryRoot = path.join(temporaryRoot, "repository");
  try {
    await cp(fixtureRoot, repositoryRoot, { recursive: true });
    const core = await import(pathToFileURL(path.join(root, "packages", "core", "dist", "index.js")).href);
    const baseline = await indexCondition(core, repositoryRoot, false);
    const first = await indexCondition(core, repositoryRoot, true);
    const second = await indexCondition(core, repositoryRoot, true);
    const result = buildResult({ oracle, oracleSha256, baseline, first, second });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function indexCondition(core, repositoryRoot, roomInventory) {
  const summary = await core.indexPalace(repositoryRoot, { roomInventory });
  const index = await core.readIndex(repositoryRoot);
  const objects = index.nodes.filter((node) => node.object);
  const objectById = new Map(objects.map((node) => [node.id, node]));
  const relations = index.edges
    .filter((edge) => relationTypes.has(edge.type) && objectById.has(edge.from) && objectById.has(edge.to))
    .map((edge) => relationRecord(objectById.get(edge.from), edge.type, objectById.get(edge.to)))
    .sort((left, right) => left.key.localeCompare(right.key));
  const outgoing = new Map();
  for (const relation of relations) {
    outgoing.set(relation.from.key, (outgoing.get(relation.from.key) ?? 0) + 1);
  }
  return {
    summary,
    objects: objects.map(objectRecord),
    relations,
    maximumOutgoingObjectRelations: Math.max(0, ...outgoing.values())
  };
}

function buildResult({ oracle, oracleSha256, baseline, first, second }) {
  const expected = oracle.cases.flatMap((entry) => entry.expected.map((relation) => ({
    language: entry.language,
    tuple: relation,
    key: tupleKey(relation)
  })));
  const forbidden = oracle.cases.flatMap((entry) => entry.forbidden.map((relation) => ({
    language: entry.language,
    tuple: relation,
    key: tupleKey(relation)
  })));
  const expectedKeys = new Set(expected.map((entry) => entry.key));
  const forbiddenKeys = new Set(forbidden.map((entry) => entry.key));
  const endpointKeys = new Set([...expected, ...forbidden].flatMap((entry) => [
    objectKey(entry.tuple[0], entry.tuple[1]),
    objectKey(entry.tuple[3], entry.tuple[4])
  ]));
  const groupedObjects = groupBy(first.objects, (object) => object.key);
  const unresolvedEndpoints = [...endpointKeys]
    .filter((key) => (groupedObjects.get(key) ?? []).length !== 1)
    .map((key) => ({ key, matches: (groupedObjects.get(key) ?? []).length }));
  const actualKeys = new Set(first.relations.map((relation) => relation.key));
  const matchedExpected = expected.filter((entry) => actualKeys.has(entry.key));
  const missedExpected = expected.filter((entry) => !actualKeys.has(entry.key));
  const forbiddenHits = forbidden.filter((entry) => actualKeys.has(entry.key));
  const inScopeActual = first.relations.filter((relation) => (
    endpointKeys.has(relation.from.key) && endpointKeys.has(relation.to.key)
  ));
  const unexpectedInScope = inScopeActual.filter((relation) => (
    !expectedKeys.has(relation.key) && !forbiddenKeys.has(relation.key)
  ));
  const falsePositiveCount = forbiddenHits.length + unexpectedInScope.length;
  const precision = ratio(matchedExpected.length, matchedExpected.length + falsePositiveCount);
  const recall = ratio(matchedExpected.length, expected.length);
  const testExpected = expected.filter((entry) => ["tests", "tested_by"].includes(entry.tuple[2]));
  const testClosureRecall = ratio(
    testExpected.filter((entry) => actualKeys.has(entry.key)).length,
    testExpected.length
  );
  const forbiddenRelationRate = ratio(forbiddenHits.length, forbidden.length);
  const firstKeys = first.relations.map((relation) => relation.key);
  const secondKeys = second.relations.map((relation) => relation.key);
  const deterministicAgreement = JSON.stringify(firstKeys) === JSON.stringify(secondKeys) ? 1 : 0;
  const perLanguage = oracle.cases.map((entry) => {
    const entries = expected.filter((candidate) => candidate.language === entry.language);
    const matched = entries.filter((candidate) => actualKeys.has(candidate.key));
    return {
      language: entry.language,
      expected: entries.length,
      matched: matched.length,
      recall: ratio(matched.length, entries.length),
      missed: entries.filter((candidate) => !actualKeys.has(candidate.key)).map((candidate) => candidate.tuple)
    };
  });
  const testObjects = oracle.cases.map((entry) => {
    const testRelation = entry.expected.find((relation) => relation[2] === "tests");
    const key = objectKey(testRelation[0], testRelation[1]);
    const matches = groupedObjects.get(key) ?? [];
    return {
      language: entry.language,
      key,
      matches: matches.length,
      objectKinds: matches.map((object) => object.objectKind)
    };
  });
  const gates = {
    objectEndpointResolution: ratio(endpointKeys.size - unresolvedEndpoints.length, endpointKeys.size) >= 1,
    macroRelationPrecision: precision >= 0.95,
    macroRelationRecall: recall >= 0.8,
    perLanguageRelationRecall: perLanguage.every((entry) => entry.recall >= 0.5),
    testClosureRecall: testClosureRecall >= 0.8,
    forbiddenRelationRate: forbiddenRelationRate <= 0,
    deterministicRelationAgreement: deterministicAgreement >= 1,
    maximumOutgoingObjectRelations: first.maximumOutgoingObjectRelations <= 32,
    defaultOffObjectRelations: baseline.relations.length <= 0
  };

  return {
    schemaVersion: 1,
    featureVersion: "0.5",
    phase: 3,
    observation: "first",
    immutable: true,
    observedAt: new Date().toISOString(),
    candidate: {
      sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      entrypoint: "packages/core/dist/index.js",
      roomInventoryDefaultEnabled: false
    },
    oracle: {
      sha256: oracleSha256,
      expectedRelations: expected.length,
      forbiddenRelations: forbidden.length,
      declaredEndpoints: endpointKeys.size
    },
    baseline: conditionSummary(baseline),
    enabled: conditionSummary(first),
    metrics: {
      resolvedEndpoints: endpointKeys.size - unresolvedEndpoints.length,
      endpointResolution: ratio(endpointKeys.size - unresolvedEndpoints.length, endpointKeys.size),
      matchedExpectedRelations: matchedExpected.length,
      relationPrecision: precision,
      relationRecall: recall,
      testClosureRecall,
      forbiddenHits: forbiddenHits.length,
      forbiddenRelationRate,
      unexpectedInScopeRelations: unexpectedInScope.length,
      deterministicRelationAgreement: deterministicAgreement,
      perLanguage
    },
    diagnostics: {
      unresolvedEndpoints,
      missedExpectedRelations: missedExpected.map((entry) => entry.tuple),
      forbiddenHits: forbiddenHits.map((entry) => entry.tuple),
      unexpectedInScopeRelations: unexpectedInScope.map((entry) => entry.tuple),
      testObjects
    },
    gates,
    overallPass: Object.values(gates).every(Boolean),
    claimBoundary: "This disclosed synthetic first observation does not establish fresh Round 26 qualification or Agent performance."
  };
}

function conditionSummary(condition) {
  return {
    files: condition.summary.fileCount,
    nodes: condition.summary.nodeCount,
    objects: condition.objects.length,
    edges: condition.summary.edgeCount,
    objectRelations: condition.relations.length,
    maximumOutgoingObjectRelations: condition.maximumOutgoingObjectRelations
  };
}

function relationRecord(from, type, to) {
  const fromRecord = objectRecord(from);
  const toRecord = objectRecord(to);
  return {
    key: `${fromRecord.key}|${type}|${toRecord.key}`,
    from: fromRecord,
    type,
    to: toRecord,
    tuple: [from.sourcePath, from.object.qualifiedName, type, to.sourcePath, to.object.qualifiedName]
  };
}

function objectRecord(node) {
  return {
    key: objectKey(node.sourcePath, node.object.qualifiedName),
    sourcePath: node.sourcePath,
    qualifiedName: node.object.qualifiedName,
    objectKind: node.object.objectKind
  };
}

function objectKey(sourcePath, qualifiedName) {
  return `${sourcePath}|${qualifiedName}`;
}

function tupleKey(tuple) {
  return `${objectKey(tuple[0], tuple[1])}|${tuple[2]}|${objectKey(tuple[3], tuple[4])}`;
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 1 : Number((numerator / denominator).toFixed(4));
}

function groupBy(items, keyFor) {
  const grouped = new Map();
  for (const item of items) grouped.set(keyFor(item), [...(grouped.get(keyFor(item)) ?? []), item]);
  return grouped;
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function resolveOutputPath(arguments_) {
  const outputIndex = arguments_.indexOf("--out");
  if (outputIndex < 0 || !arguments_[outputIndex + 1]) {
    throw new Error("Usage: node scripts/research/measure-room-inventory-phase-3.cjs --out <new-json-path>");
  }
  return path.resolve(root, arguments_[outputIndex + 1]);
}
