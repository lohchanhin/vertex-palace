import path from "node:path";
import type { LoadLevel, PalaceEdge, PalaceNode, PalaceRoute, RouteTier, TaskType } from "@vertex-palace/shared";
import { DEFAULT_BUDGET } from "../config/defaults";
import { indexPalace } from "../indexer/index-palace";
import { readIndex } from "../storage/read-palace";
import { getPalaceStatus } from "../storage/status";
import { appendRoute } from "../storage/write-palace";
import { hashText } from "../scanner/file-hash";
import { tokenizeLexical } from "../utils/lexical-tokens";
import { analyzeTask } from "./analyze-task";
import { classifyTask } from "./classify-task";
import { locateEntry } from "./locate-entry";
import {
  isTypeDeclarationIntent,
  matchesRouteSurface,
  requestedRouteSurfaces,
  routePathTaskAffinity,
  scoreNodes,
  type RouteSurface,
  type ScoredNode
} from "./route-scorer";
import { expandRoute } from "./route-expander";

export type RoutePalaceOptions = {
  budget?: number;
  routeLimit?: number;
};

export async function routePalace(root: string, task: string, options: number | RoutePalaceOptions = DEFAULT_BUDGET.maxInputTokens): Promise<PalaceRoute> {
  const normalized = normalizeOptions(options);
  const budget = normalized.budget;
  await ensureFreshIndex(root);
  const index = await readIndex(root);
  const analysis = analyzeTask(task);
  const taskType = classifyTask(task);
  const scored = scoreNodes(index.nodes, index.edges, analysis, taskType);
  const requestedSurfaces = requestedRouteSurfaces(analysis);
  const typeDeclarationTask = taskType === "bugfix" && isTypeDeclarationIntent(analysis);
  const routeLimit =
    taskType === "evaluation"
      ? evaluationRouteLimit(normalized.routeLimit, requestedSurfaces, analysis)
      : normalized.routeLimit;
  const codeTask = isCodeTaskType(taskType);
  const implementationAnchor = codeTask
    ? scored.find((item) => isImplementationCandidate(item.node))
    : undefined;
  const top = implementationAnchor ?? scored[0];
  const crossStack = analysis.wingHints.includes("frontend") && analysis.wingHints.includes("backend");
  const boundedBugfix = typeDeclarationTask || (
    taskType === "bugfix"
    && (
      (Boolean(top?.node.startLine) && (top?.matchedKeywordCount ?? 0) >= 4)
      || (implementationAnchor ? routePathTaskAffinity(implementationAnchor.node.sourcePath, analysis) >= 1.5 : false)
    )
    && requestedSurfaces.length <= 1
    && !crossStack
  );
  const focused = boundedBugfix && analysis.roomHints.length <= 1;
  const expansionCandidates = boundedBugfix && implementationAnchor
    ? [implementationAnchor, ...scored.filter((item) => item.node.id !== implementationAnchor.node.id)]
    : scored;
  const initialRoute = expandRoute(expansionCandidates, index.edges, index.nodes, {
    limit: routeLimit,
    focused,
    bounded: boundedBugfix,
    preferVerificationRelations: boundedBugfix,
    minSeedScoreRatio: boundedBugfix ? 0.75 : undefined
  });
  const surfaceExpanded =
    taskType === "evaluation"
      ? ensureRequestedSurfaceCoverage(initialRoute, scored, requestedSurfaces, analysis, routeLimit)
      : taskType === "release"
        ? ensureReleaseSurfaceCoverage(scored, requestedSurfaces, analysis, routeLimit)
        : taskType === "bugfix"
          ? typeDeclarationTask
            ? ensureTypeDeclarationCoverage(initialRoute, scored, requestedSurfaces, routeLimit)
            : ensureBugfixVerificationCoverage(initialRoute, scored, requestedSurfaces, implementationAnchor, analysis, routeLimit, focused)
          : ensureGeneralSurfaceCoverage(initialRoute, scored, requestedSurfaces, analysis, routeLimit);
  const coreSelection = selectEvidenceSufficientCoreRoute(
    scored,
    index.edges,
    index.nodes,
    analysis,
    taskType,
    requestedSurfaces,
    routeLimit
  );
  const expanded = coreSelection?.route ?? surfaceExpanded;
  const now = new Date().toISOString();

  const routeSteps = expanded.map((item, index) => {
    const loadLevel = chooseLoadLevel(item.node.kind, index, item.score, item.node.tags.includes("generated-artifact"));
    const tier = chooseRouteTier(item, index, taskType);
    return {
      nodeId: item.node.id,
      palacePath: item.node.palacePath,
      sourcePath: linePath(item.node.sourcePath, item.node.startLine, item.node.endLine),
      reason: item.reasons[0] ?? `Matched ${analysis.keywords.join(", ") || "task"} against palace index.`,
      loadLevel,
      estimatedTokens: estimatedTokensForLevel(item.node.tokenCost, loadLevel),
      priority: index + 1,
      tier,
      confidence: Number(Math.max(0.1, Math.min(0.99, item.score / 160)).toFixed(2)),
      evidence: item.reasons.slice(0, 3)
    };
  });

  const estimatedTokens = routeSteps.reduce((sum, step) => sum + step.estimatedTokens, 0);
  const route: PalaceRoute = {
    id: `route_${hashText(`${task}:${now}`).slice(0, 16)}`,
    task,
    taskType,
    entry: locateEntry(taskType, analysis),
    route: routeSteps,
    excluded: buildExcluded(index.nodes, routeSteps.map((step) => step.nodeId), analysis),
    budget: {
      maxInputTokens: budget,
      estimatedTokens,
      reservedOutputTokens: DEFAULT_BUDGET.reservedOutputTokens
    },
    confidence: confidence(expanded, analysis, estimatedTokens, budget, taskType, coreSelection?.confidenceCap),
    createdAt: now
  };

  await appendRoute(root, index.routes, route);
  return route;
}

function isImplementationCandidate(node: Awaited<ReturnType<typeof readIndex>>["nodes"][number]): boolean {
  return node.floor !== "05-verification" && !["test", "config", "doc", "runtime-log", "directory"].includes(node.kind);
}

function isCodeTaskType(taskType: TaskType): boolean {
  return ["bugfix", "feature", "refactor"].includes(taskType);
}

function ensureBugfixVerificationCoverage(
  selected: ScoredNode[],
  scored: ScoredNode[],
  requested: RouteSurface[],
  implementationAnchor: ScoredNode | undefined,
  analysis: ReturnType<typeof analyzeTask>,
  limit: number,
  focused: boolean
): ScoredNode[] {
  if (
    requested.includes("implementation")
    && (requested.length >= 3 || routingImplementationConcernCount(analysis.raw) >= 3)
  ) {
    return ensureGeneralSurfaceCoverage(selected, scored, requested, analysis, limit, false);
  }
  const requiredSurfaces = requested.filter((surface) => ["test", "config", "docs", "shared"].includes(surface));
  const focusedTestCompanion = focused
    ? [...scored]
      .filter(isDirectTestCandidate)
      .sort(
        (left, right) => focusedTestCompanionPriority(right, implementationAnchor, analysis, selected)
          - focusedTestCompanionPriority(left, implementationAnchor, analysis, selected)
          || right.score - left.score
          || left.node.sourcePath.localeCompare(right.node.sourcePath)
      )
      .find(
        (item) => focusedTestCompanionPriority(item, implementationAnchor, analysis, selected) >= 500
      )
    : undefined;
  if (focusedTestCompanion && !requiredSurfaces.includes("test")) requiredSurfaces.unshift("test");
  if (!requiredSurfaces.length) return selected;

  const result: ScoredNode[] = [];
  const selectedPaths = new Set<string>();
  const append = (item: ScoredNode | undefined): void => {
    if (!item || result.length >= limit || selectedPaths.has(item.node.sourcePath)) return;
    result.push(item);
    selectedPaths.add(item.node.sourcePath);
  };

  append(implementationAnchor ?? selected[0]);
  append(focusedTestCompanion);
  for (const surface of requiredSurfaces) {
    const matchesSurface = (item: ScoredNode): boolean => surface === "test"
      ? isDirectTestCandidate(item)
      : matchesRouteSurface(item.node, surface);
    if (result.some(matchesSurface)) continue;
    const existing = selected.find(matchesSurface);
    const companion = existing ?? scored.find(
      (item) => matchesSurface(item) && item.matchedKeywordCount > 0
    );
    append(companion);
  }
  if (
    focused
    && analysis.roomHints.length <= 1
    && requiredSurfaces.every((surface) => surface === "test")
    && result.some(isDirectTestCandidate)
  ) {
    return result;
  }
  for (const item of selected) {
    if (focused && isDirectTestCandidate(item)) continue;
    append(item);
  }

  return result.sort((a, b) => {
    if (a.node.id === implementationAnchor?.node.id) return -1;
    if (b.node.id === implementationAnchor?.node.id) return 1;
    return b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath);
  });
}

function focusedTestCompanionPriority(
  item: ScoredNode,
  implementationAnchor: ScoredNode | undefined,
  analysis: ReturnType<typeof analyzeTask>,
  selected: ScoredNode[]
): number {
  const taskAffinity = routePathTaskAffinity(item.node.sourcePath, analysis);
  const testTokens = tokenizeLexical(path.posix.basename(item.node.sourcePath));
  const implementationTokens = implementationAnchor
    ? tokenizeLexical(path.posix.basename(implementationAnchor.node.sourcePath))
    : new Set<string>();
  const pairAffinity = [...testTokens].filter(
    (token) => !["test", "spec"].includes(token) && implementationTokens.has(token)
  ).length;
  const relationEvidence = selected.some(
    (candidate) => candidate.node.sourcePath === item.node.sourcePath
      && candidate.reasons.some((reason) => reason.startsWith("expanded through"))
  ) ? 800 : 0;
  const semanticEvidence = item.matchedKeywordCount ** 2 * 160;
  return taskAffinity ** 2 * 250 + relationEvidence + semanticEvidence + pairAffinity * 80 + item.score;
}

type CoreEvidenceCandidate = {
  item: ScoredNode;
  directEvidence: number;
  relationEvidence: number;
  pairEvidence: number;
  totalEvidence: number;
  taskCoverage: Set<string>;
  entityCoverage: Set<string>;
};

type CoreEvidencePair = {
  implementation: CoreEvidenceCandidate;
  test: CoreEvidenceCandidate;
  relationEvidence: number;
  pairEvidence: number;
  taskCoverage: Set<string>;
  entityCoverage: Set<string>;
  totalEvidence: number;
};

type CoreRouteSelection = {
  route: ScoredNode[];
  confidenceCap: number;
};

type CoreEvidenceRole = "implementation" | "test";

const CORE_EVIDENCE_NOISE = new Set([
  "add",
  "bug",
  "change",
  "enhance",
  "feat",
  "feature",
  "fix",
  "keep",
  "perform",
  "preserve",
  "test"
]);

const CORE_EVIDENCE_LOW_SIGNAL = new Set([
  "collection",
  "command",
  "help",
  "method",
  "node",
  "order",
  "output",
  "request",
  "value"
]);

const CORE_PATH_NOISE = new Set([
  "app",
  "file",
  "js",
  "jsx",
  "lib",
  "main",
  "package",
  "packages",
  "py",
  "spec",
  "src",
  "test",
  "tests",
  "ts",
  "tsx",
  "unit"
]);

const CORE_RELATION_TYPES = new Set([
  "changed_with",
  "depends_on",
  "imports",
  "tested_by",
  "tests"
]);

function selectEvidenceSufficientCoreRoute(
  scored: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType,
  requested: RouteSurface[],
  limit: number
): CoreRouteSelection | undefined {
  if (!isCodeTaskType(taskType) || requested.length > 1) return undefined;
  if (analysis.wingHints.includes("frontend") && analysis.wingHints.includes("backend")) return undefined;

  const implementationCandidates = bestPhysicalEvidenceCandidates(
    scored.filter((item) => isImplementationCandidate(item.node) && !isDirectTestCandidate(item)),
    analysis,
    "implementation"
  ).slice(0, 12);
  if (!implementationCandidates.length || implementationCandidates[0].directEvidence < 100) return undefined;
  const sourceRelations = buildSourceRelations(edges, nodes);

  const testCandidates = bestPhysicalEvidenceCandidates(
    scored.filter(isDirectTestCandidate),
    analysis,
    "test"
  ).slice(0, 32);
  const pairs = implementationCandidates.flatMap((implementation) =>
    testCandidates.map((test) => buildCoreEvidencePair(
      implementation,
      test,
      testCandidates,
      sourceRelations,
      analysis
    ))
  ).filter(
    (pair) => pair.implementation.directEvidence >= 100
      && pair.test.directEvidence >= 100
      && (
        pair.relationEvidence >= 0.6
        || pair.pairEvidence >= 1
        || pair.taskCoverage.size >= 3
        || pair.entityCoverage.size > 0
      )
  ).sort(
    (left, right) => right.totalEvidence - left.totalEvidence
      || right.relationEvidence - left.relationEvidence
      || right.implementation.item.score - left.implementation.item.score
      || left.implementation.item.node.sourcePath.localeCompare(right.implementation.item.node.sourcePath)
  );
  const anchor = pairs[0];
  if (!anchor || anchor.totalEvidence < 650) return undefined;

  const competitor = pairs.find(
    (pair) => pair.implementation.item.node.sourcePath !== anchor.implementation.item.node.sourcePath
  );
  const margin = competitor
    ? (anchor.totalEvidence - competitor.totalEvidence) / Math.max(anchor.totalEvidence, 1)
    : 1;
  const implementationMargin = competitor
    ? (anchor.implementation.directEvidence - competitor.implementation.directEvidence)
      / Math.max(anchor.implementation.directEvidence, 1)
    : 1;
  const primaryTaskTokens = corePrimaryTaskTokens(analysis);
  const anchorImplementationPrimaryCoverage = intersection(
    anchor.implementation.taskCoverage,
    primaryTaskTokens
  ).size;
  const competitorImplementationPrimaryCoverage = competitor
    ? intersection(competitor.implementation.taskCoverage, primaryTaskTokens).size
    : 0;
  const anchorHasDirectIdentity = anchor.relationEvidence >= 0.75
    || anchor.entityCoverage.size > 0
    || (anchor.taskCoverage.size >= 3 && anchor.pairEvidence >= 1)
    || (anchor.taskCoverage.size >= 2 && anchor.pairEvidence >= 1 && implementationMargin >= 0.15);
  const competitorComplementsImplementation = competitor !== undefined
    && sourcePathFamilyEvidence(
      anchor.implementation.item.node.sourcePath,
      competitor.implementation.item.node.sourcePath
    ) >= 0.5
    && setDifference(competitor.implementation.entityCoverage, anchor.implementation.entityCoverage).size > 0;
  const anchorBeatsCompetingConcepts = !competitor
    || margin >= 0.08
    || implementationMargin >= 0.15
    || anchorImplementationPrimaryCoverage > competitorImplementationPrimaryCoverage
    || anchor.taskCoverage.size > competitor.taskCoverage.size
    || anchor.entityCoverage.size > competitor.entityCoverage.size
    || competitorComplementsImplementation;
  if (!anchorHasDirectIdentity || !anchorBeatsCompetingConcepts) return undefined;

  const implementations = [anchor.implementation];
  const tests = [anchor.test];
  const coveredImplementationTaskTokens = new Set(anchor.implementation.taskCoverage);
  const coveredImplementationEntities = new Set(anchor.implementation.entityCoverage);
  const coveredTestTaskTokens = new Set(anchor.test.taskCoverage);
  const coveredTestEntities = new Set(anchor.test.entityCoverage);
  const outcomeTaskTokens = coreOutcomeTokens(analysis.raw);
  const primaryImplementationTaskTokens = corePrimaryTaskTokens(analysis);
  const explicitPrimaryTaskTokens = coreExplicitPrimaryTaskTokens(analysis.raw);
  const compoundIdentityEntities = coreCompoundIdentityEntities(analysis);

  for (const candidate of implementationCandidates) {
    if (implementations.length >= 3 || candidate.item.node.sourcePath === anchor.implementation.item.node.sourcePath) continue;
    const newTaskCoverage = setDifference(candidate.taskCoverage, coveredImplementationTaskTokens);
    const newPrimaryTaskCoverage = intersection(newTaskCoverage, primaryImplementationTaskTokens);
    const newEntityCoverage = setDifference(candidate.entityCoverage, coveredImplementationEntities);
    const sharedCompoundIdentityCoverage = intersection(
      intersection(candidate.entityCoverage, coveredImplementationEntities),
      intersection(coveredTestEntities, compoundIdentityEntities)
    );
    const primaryCoverageRatio = explicitPrimaryTaskTokens.size
      ? intersection(candidate.taskCoverage, explicitPrimaryTaskTokens).size
        / explicitPrimaryTaskTokens.size
      : 0;
    const relationToSelectedTests = strongestRelationTo(
      candidate.item.node.sourcePath,
      new Set(tests.map((test) => test.item.node.sourcePath)),
      sourceRelations
    );
    const relationToSelectedImplementations = strongestRelationTo(
      candidate.item.node.sourcePath,
      new Set(implementations.map((implementation) => implementation.item.node.sourcePath)),
      sourceRelations
    );
    const entityExpansion = newEntityCoverage.size > 0 && candidate.directEvidence >= 180;
    const relatedConceptExpansion = relationToSelectedTests >= 0.9
      && newPrimaryTaskCoverage.size > 0
      && candidate.directEvidence >= Math.max(160, anchor.implementation.directEvidence * 0.45);
    const relatedPeerExpansion = relationToSelectedImplementations >= 0.75
      && (
        newPrimaryTaskCoverage.size > 0
        || newEntityCoverage.size > 0
        || primaryCoverageRatio >= 2 / 3
      )
      && candidate.directEvidence >= anchor.implementation.directEvidence * 0.75;
    const sharedIdentityExpansion = sourcePathFamilyEvidence(
      anchor.implementation.item.node.sourcePath,
      candidate.item.node.sourcePath
    ) >= 0.5
      && sharedCompoundIdentityCoverage.size > 0
      && candidate.directEvidence >= Math.max(180, anchor.implementation.directEvidence * 0.55);
    if (!entityExpansion && !relatedConceptExpansion && !relatedPeerExpansion && !sharedIdentityExpansion) continue;
    implementations.push(candidate);
    addAll(coveredImplementationTaskTokens, candidate.taskCoverage);
    addAll(coveredImplementationEntities, candidate.entityCoverage);
  }

  while (tests.length < 3) {
    const anchorTestEvidence = testEvidenceForImplementations(anchor.test, implementations, sourceRelations);
    const next = testCandidates
      .filter((candidate) => !tests.some((selected) => selected.item.node.sourcePath === candidate.item.node.sourcePath))
      .map((candidate) => {
        const evidence = testEvidenceForImplementations(candidate, implementations, sourceRelations);
        const newTaskCoverage = setDifference(candidate.taskCoverage, coveredTestTaskTokens);
        const relevantNewTaskCoverage = outcomeTaskTokens.size
          ? new Set(
              [...newTaskCoverage].filter(
                (token) => outcomeTaskTokens.has(token) || !coveredImplementationTaskTokens.has(token)
              )
            )
          : newTaskCoverage;
        const newEntityCoverage = setDifference(candidate.entityCoverage, coveredTestEntities);
        const evidenceRatio = evidence.totalEvidence / Math.max(anchorTestEvidence.totalEvidence, 1);
        const directEvidenceRatio = candidate.directEvidence / Math.max(anchor.test.directEvidence, 1);
        const anchorModuleMirrorEvidence = strongestTestModuleMirrorEvidence(anchor.test, implementations);
        const moduleMirrorEvidence = strongestTestModuleMirrorEvidence(candidate, implementations);
        const mirrorDominated = anchorModuleMirrorEvidence >= 0.75
          && moduleMirrorEvidence < anchorModuleMirrorEvidence;
        return {
          candidate,
          evidence,
          newTaskCoverage: relevantNewTaskCoverage,
          newEntityCoverage,
          evidenceRatio,
          directEvidenceRatio,
          mirrorDominated
        };
      })
      .filter(({ evidence, evidenceRatio, directEvidenceRatio, newTaskCoverage, newEntityCoverage, mirrorDominated }) =>
        evidence.relationEvidence >= 0.75
        && evidenceRatio >= 0.55
        && directEvidenceRatio >= 0.55
        && (!mirrorDominated || newEntityCoverage.size > 0)
        && (newTaskCoverage.size > 0 || newEntityCoverage.size > 0)
      )
      .sort((left, right) =>
        (right.newEntityCoverage.size + right.newTaskCoverage.size)
          - (left.newEntityCoverage.size + left.newTaskCoverage.size)
        || right.evidence.relationEvidence - left.evidence.relationEvidence
        || right.evidence.totalEvidence - left.evidence.totalEvidence
        || left.candidate.item.node.sourcePath.localeCompare(right.candidate.item.node.sourcePath)
      )[0];
    if (!next) break;
    tests.push(next.evidence);
    addAll(coveredTestTaskTokens, next.candidate.taskCoverage);
    addAll(coveredTestEntities, next.candidate.entityCoverage);
  }

  const route = [...implementations, ...tests]
    .map((candidate) => candidate.item)
    .filter(
      (item, index, items) => items.findIndex((candidate) => candidate.node.sourcePath === item.node.sourcePath) === index
    )
    .slice(0, limit);
  if (!route.some((item) => isImplementationCandidate(item.node)) || !route.some(isDirectTestCandidate)) return undefined;

  const confidenceCap = anchor.relationEvidence >= 0.75 && margin >= 0.08
    ? 0.9
    : anchor.entityCoverage.size > 0 || anchor.taskCoverage.size >= 3
      ? 0.68
      : 0.4;
  return { route, confidenceCap };
}

function buildCoreEvidencePair(
  implementation: CoreEvidenceCandidate,
  test: CoreEvidenceCandidate,
  testCandidates: CoreEvidenceCandidate[],
  relations: Map<string, number>,
  analysis: ReturnType<typeof analyzeTask>
): CoreEvidencePair {
  const relationEvidence = relations.get(sourceRelationKey(
    implementation.item.node.sourcePath,
    test.item.node.sourcePath
  )) ?? 0;
  const pairEvidence = strongestPairEvidence(test.item, [implementation.item]);
  const taskCoverage = new Set([...implementation.taskCoverage, ...test.taskCoverage]);
  const entityCoverage = new Set([...implementation.entityCoverage, ...test.entityCoverage]);
  const familyEvidence = sourcePathFamilyEvidence(
    implementation.item.node.sourcePath,
    test.item.node.sourcePath
  );
  const moduleMirrorEvidence = duplicateTestModuleMirrorEvidence(
    implementation.item.node.sourcePath,
    test.item.node.sourcePath,
    testCandidates
  );
  const primaryTaskTokens = corePrimaryTaskTokens(analysis);
  const implementationPrimaryCoverage = primaryTaskTokens.size
    ? intersection(implementation.taskCoverage, primaryTaskTokens).size / primaryTaskTokens.size
    : 0;
  const totalEvidence = implementation.directEvidence
    + test.directEvidence
    + relationEvidence * 500
    + pairEvidence * 40
    + familyEvidence * 100
    + moduleMirrorEvidence * 640
    + taskCoverage.size * 55
    + entityCoverage.size * 80
    + implementationPrimaryCoverage * 250
    + (implementation.item.score + test.item.score) * 0.15;
  return {
    implementation,
    test,
    relationEvidence,
    pairEvidence,
    taskCoverage,
    entityCoverage,
    totalEvidence
  };
}

function testEvidenceForImplementations(
  test: CoreEvidenceCandidate,
  implementations: CoreEvidenceCandidate[],
  relations: Map<string, number>
): CoreEvidenceCandidate {
  const implementationPaths = new Set(implementations.map((candidate) => candidate.item.node.sourcePath));
  const relationEvidence = strongestRelationTo(test.item.node.sourcePath, implementationPaths, relations);
  const pairEvidence = strongestPairEvidence(test.item, implementations.map((candidate) => candidate.item));
  return {
    ...test,
    relationEvidence,
    pairEvidence,
    totalEvidence: test.directEvidence + relationEvidence * 500 + pairEvidence * 40
  };
}

function strongestTestModuleMirrorEvidence(
  test: CoreEvidenceCandidate,
  implementations: CoreEvidenceCandidate[]
): number {
  return implementations.reduce(
    (strongest, implementation) => Math.max(
      strongest,
      sourceTestModuleMirrorEvidence(
        implementation.item.node.sourcePath,
        test.item.node.sourcePath
      )
    ),
    0
  );
}

function bestPhysicalEvidenceCandidates(
  items: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  role: CoreEvidenceRole
): CoreEvidenceCandidate[] {
  const bySource = new Map<string, Array<{
    item: ScoredNode;
    profile: ReturnType<typeof coreEvidenceProfile>;
  }>>();
  for (const item of items) {
    const profile = coreEvidenceProfile(item, analysis, role);
    const current = bySource.get(item.node.sourcePath) ?? [];
    current.push({ item, profile });
    bySource.set(item.node.sourcePath, current);
  }
  const primaryTokens = corePrimaryTaskTokens(analysis);
  return [...bySource.values()].map((profiles): CoreEvidenceCandidate => {
    const rankedProfiles = [...profiles].sort(
      (left, right) => right.profile.directEvidence - left.profile.directEvidence
        || right.item.score - left.item.score
        || left.item.node.title.localeCompare(right.item.node.title)
    );
    const strongest = rankedProfiles[0];
    const representative = rankedProfiles.find(
      (candidate) => candidate.item.node.startLine
        && candidate.profile.directEvidence >= strongest.profile.directEvidence * 0.7
    ) ?? strongest;
    const taskCoverage = new Set(representative.profile.taskCoverage);
    const entityCoverage = new Set(representative.profile.entityCoverage);
    const representativePrimaryCoverage = intersection(representative.profile.taskCoverage, primaryTokens);
    for (const candidate of profiles) {
      if (candidate === representative || candidate.profile.directEvidence < 100) continue;
      const candidatePrimaryCoverage = intersection(candidate.profile.taskCoverage, primaryTokens);
      const sharesPrimaryEvidence = intersection(
        representativePrimaryCoverage,
        candidatePrimaryCoverage
      ).size > 0;
      const sharesEntityEvidence = intersection(
        representative.profile.entityCoverage,
        candidate.profile.entityCoverage
      ).size > 0;
      if (!sharesPrimaryEvidence && !sharesEntityEvidence) continue;
      addAll(taskCoverage, candidate.profile.taskCoverage);
      addAll(entityCoverage, candidate.profile.entityCoverage);
    }
    const complementaryTaskEvidence = setDifference(
      taskCoverage,
      representative.profile.taskCoverage
    ).size * 90;
    const complementaryEntityEvidence = setDifference(
      entityCoverage,
      representative.profile.entityCoverage
    ).size * 120;
    const evidenceBonus = Math.min(180, complementaryTaskEvidence + complementaryEntityEvidence);
    const directEvidence = representative.profile.directEvidence + evidenceBonus;
    return {
      item: representative.item,
      directEvidence,
      relationEvidence: 0,
      pairEvidence: 0,
      totalEvidence: directEvidence,
      taskCoverage,
      entityCoverage
    };
  }).sort(
    (left, right) => right.directEvidence - left.directEvidence
      || right.item.score - left.item.score
      || left.item.node.sourcePath.localeCompare(right.item.node.sourcePath)
  );
}

function directCoreEvidence(item: ScoredNode, analysis: ReturnType<typeof analyzeTask>): number {
  return coreEvidenceProfile(
    item,
    analysis,
    isDirectTestCandidate(item) ? "test" : "implementation"
  ).directEvidence;
}

function coreEvidenceProfile(
  item: ScoredNode,
  analysis: ReturnType<typeof analyzeTask>,
  role: CoreEvidenceRole
): {
  directEvidence: number;
  taskCoverage: Set<string>;
  entityCoverage: Set<string>;
} {
  const taskTokens = coreTaskTokens(analysis);
  const outcomeTokens = coreOutcomeTokens(analysis.raw);
  const demotedTokens = role === "implementation" ? outcomeTokens : new Set<string>();
  const pathTokens = corePathTokens(item.node.sourcePath);
  const titleTokens = coreNodeTokens(item.node.title);
  const summaryTokens = coreNodeTokens(item.node.summary);
  const nodeTokens = new Set([...pathTokens, ...titleTokens, ...summaryTokens]);
  const identityHaystack = [path.posix.basename(item.node.sourcePath), item.node.title, item.node.summary]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const pathMatches = weightedCoreMatches(pathTokens, taskTokens, demotedTokens);
  const titleMatches = weightedCoreMatches(titleTokens, taskTokens, demotedTokens);
  const summaryMatches = weightedCoreMatches(summaryTokens, taskTokens, demotedTokens);
  const taskCoverage = new Set(
    [...taskTokens].filter((token) => !CORE_EVIDENCE_LOW_SIGNAL.has(token) && nodeTokens.has(token))
  );
  const entityCoverage = new Set(
    analysis.entities.filter((entity) => {
      const entityTokens = [...coreNodeTokens(entity)].filter((token) => !CORE_EVIDENCE_LOW_SIGNAL.has(token));
      const compactEntity = entity.toLowerCase().replace(/[^a-z0-9]+/g, "");
      return (entityTokens.length > 0 && entityTokens.every((token) => nodeTokens.has(token)))
        || (compactEntity.length > 3 && identityHaystack.includes(compactEntity));
    })
  );
  const auxiliaryPath = /(^|\/)(?:bench|benchmark|benchmarks|example|examples)(\/|$)|(?:^|[-_.])bench(?:mark)?(?:[-_.]|$)/i.test(item.node.sourcePath);
  const auxiliaryRequested = analysis.keywords.some((keyword) => ["bench", "benchmark", "example", "examples"].includes(keyword));
  const auxiliaryPenalty = auxiliaryPath && !auxiliaryRequested ? 500 : 0;
  const primaryCoverage = intersection(taskCoverage, corePrimaryTaskTokens(analysis));
  const outcomeCoverage = intersection(taskCoverage, outcomeTokens);
  const implementationCoverageEvidence = primaryCoverage.size * 25 + outcomeCoverage.size * 5;
  const primaryCoverageSynergy = role === "implementation" && primaryCoverage.size >= 2 ? 180 : 0;
  const outcomePathEvidence = role === "test"
    ? weightedCoreMatches(pathTokens, outcomeTokens) * 160
    : 0;
  const directEvidence = pathMatches * 110
    + titleMatches * 140
    + Math.min(5, summaryMatches) * 40
    + routePathTaskAffinity(item.node.sourcePath, analysis) * 70
    + entityCoverage.size * 140
    + (role === "implementation" ? implementationCoverageEvidence : taskCoverage.size * 25)
    + primaryCoverageSynergy
    + outcomePathEvidence
    + (item.node.startLine && titleMatches > 0 ? 20 : 0)
    - auxiliaryPenalty;
  return {
    directEvidence: Math.max(0, directEvidence),
    taskCoverage,
    entityCoverage
  };
}

function coreTaskTokens(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  return new Set(
    analysis.keywords.flatMap((keyword) => [...tokenizeLexical(keyword)])
      .filter((token) => token.length > 2 && !CORE_EVIDENCE_NOISE.has(token))
  );
}

function coreOutcomeTokens(task: string): Set<string> {
  const match = task.match(/\b(?:to|while)\s+(?:preserve|maintain|keep|ensure|avoid)\b([\s\S]*)$/i);
  if (!match) return new Set();
  return new Set(
    [...tokenizeLexical(match[1])]
      .filter((token) => token.length > 2 && !CORE_EVIDENCE_NOISE.has(token))
  );
}

function corePrimaryTaskTokens(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  const outcomeTokens = coreOutcomeTokens(analysis.raw);
  return new Set(
    [...coreTaskTokens(analysis)]
      .filter((token) => !outcomeTokens.has(token) && !CORE_EVIDENCE_LOW_SIGNAL.has(token))
  );
}

function coreExplicitPrimaryTaskTokens(task: string): Set<string> {
  const outcomeTokens = coreOutcomeTokens(task);
  return new Set(
    [...tokenizeLexical(task)]
      .filter(
        (token) => token.length > 2
          && !CORE_EVIDENCE_NOISE.has(token)
          && !CORE_EVIDENCE_LOW_SIGNAL.has(token)
          && !outcomeTokens.has(token)
      )
  );
}

function coreCompoundIdentityEntities(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  const identities = (analysis.raw.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) ?? [])
    .filter((candidate) => /[a-z0-9][A-Z]/.test(candidate))
    .map((candidate) => candidate.toLowerCase().replace(/[^a-z0-9]+/g, ""));
  return new Set(analysis.entities.filter((entity) => identities.includes(entity.replace(/[^a-z0-9]+/g, ""))));
}

function corePathTokens(sourcePath: string): Set<string> {
  const tokens = coreNodeTokens(path.posix.basename(sourcePath));
  if (/(?:^|\/)(?:test_)?conftest\.py$/i.test(sourcePath)) tokens.add("fixture");
  return tokens;
}

function coreNodeTokens(value: string): Set<string> {
  return new Set(
    [...tokenizeLexical(value)]
      .filter((token) => token.length > 2 && !CORE_PATH_NOISE.has(token) && !CORE_EVIDENCE_NOISE.has(token))
  );
}

function weightedCoreMatches(
  candidateTokens: Set<string>,
  taskTokens: Set<string>,
  demotedTokens: Set<string> = new Set()
): number {
  return [...candidateTokens]
    .filter((token) => taskTokens.has(token))
    .reduce(
      (sum, token) => sum + (CORE_EVIDENCE_LOW_SIGNAL.has(token) || demotedTokens.has(token) ? 0.25 : 1),
      0
    );
}

function strongestPairEvidence(test: ScoredNode, implementations: ScoredNode[]): number {
  const testTokens = new Set([
    ...coreNodeTokens(path.posix.basename(test.node.sourcePath)),
    ...coreNodeTokens(test.node.title)
  ]);
  return implementations.reduce((strongest, implementation) => {
    const implementationTokens = new Set([
      ...coreNodeTokens(path.posix.basename(implementation.node.sourcePath)),
      ...coreNodeTokens(implementation.node.title)
    ]);
    return Math.max(strongest, weightedCoreMatches(testTokens, implementationTokens));
  }, 0);
}

function buildSourceRelations(edges: PalaceEdge[], nodes: PalaceNode[]): Map<string, number> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const relations = new Map<string, number>();
  for (const edge of edges) {
    if (!CORE_RELATION_TYPES.has(edge.type)) continue;
    const from = byId.get(edge.from)?.sourcePath;
    const to = byId.get(edge.to)?.sourcePath;
    if (!from || !to || from === to) continue;
    const key = sourceRelationKey(from, to);
    relations.set(key, Math.max(relations.get(key) ?? 0, edge.weight));
  }
  return relations;
}

function strongestRelationTo(
  sourcePath: string,
  targets: Set<string>,
  relations: Map<string, number>
): number {
  return [...targets].reduce(
    (strongest, target) => Math.max(strongest, relations.get(sourceRelationKey(sourcePath, target)) ?? 0),
    0
  );
}

function sourceRelationKey(left: string, right: string): string {
  return [left, right].sort().join("\u0000");
}

function sourcePathFamilyEvidence(left: string, right: string): number {
  const leftParts = left.toLowerCase().split("/").slice(0, -1);
  const rightParts = right.toLowerCase().split("/").slice(0, -1);
  let sharedPrefix = 0;
  while (sharedPrefix < leftParts.length && sharedPrefix < rightParts.length && leftParts[sharedPrefix] === rightParts[sharedPrefix]) {
    sharedPrefix += 1;
  }
  return Math.min(1, sharedPrefix / 4);
}

function sourceTestModuleMirrorEvidence(implementationPath: string, testPath: string): number {
  if (canonicalModuleStem(implementationPath) !== canonicalModuleStem(testPath)) return 0;
  const implementationParts = implementationPath.toLowerCase().split("/").slice(0, -1);
  const testParts = testPath.toLowerCase().split("/").slice(0, -1);
  const testRoot = testParts.findIndex((part) => ["spec", "specs", "test", "testing", "tests"].includes(part));
  if (testRoot < 0) return 0;
  const implementationScope = new Set(
    implementationParts.filter((part) => !["lib", "src"].includes(part))
  );
  const unmatchedTestScope = testParts
    .slice(testRoot + 1)
    .filter((part) => !implementationScope.has(part));
  return 1 / (1 + unmatchedTestScope.length);
}

function duplicateTestModuleMirrorEvidence(
  implementationPath: string,
  testPath: string,
  testCandidates: CoreEvidenceCandidate[]
): number {
  const implementationStem = canonicalModuleStem(implementationPath);
  const mirroredCandidates = testCandidates.filter(
    (candidate) => canonicalModuleStem(candidate.item.node.sourcePath) === implementationStem
  );
  return mirroredCandidates.length >= 2
    ? sourceTestModuleMirrorEvidence(implementationPath, testPath)
    : 0;
}

function canonicalModuleStem(sourcePath: string): string {
  return path.posix.basename(sourcePath)
    .replace(/\.[^.]+$/, "")
    .replace(/^(?:test|spec)[_.-]/, "")
    .replace(/[_.-](?:test|spec)$/, "")
    .replace(/^_+/, "");
}

function setDifference(values: Set<string>, covered: Set<string>): Set<string> {
  return new Set([...values].filter((value) => !covered.has(value)));
}

function intersection(left: Set<string>, right: Set<string>): Set<string> {
  return new Set([...left].filter((value) => right.has(value)));
}

function addAll(target: Set<string>, values: Set<string>): void {
  for (const value of values) target.add(value);
}

function isDirectTestCandidate(item: ScoredNode): boolean {
  const sourcePath = item.node.sourcePath.toLowerCase();
  return item.node.kind === "test"
    || /(^|\/)(?:test|tests|testing|spec|__tests__)(\/|$)|\.(?:test|spec)\.[^.]+$/.test(sourcePath)
    || /(^|\/)(?:test_[^/]+|[^/]+_(?:test|spec))\.[a-z0-9]+$/.test(sourcePath)
    || /(^|\/)[^/]+tests?\.(?:cs|java|kt)$/.test(sourcePath);
}

function ensureTypeDeclarationCoverage(
  selected: ScoredNode[],
  scored: ScoredNode[],
  requested: RouteSurface[],
  limit: number
): ScoredNode[] {
  const declaration = scored.find((item) => isTypeDeclarationPath(item.node.sourcePath) && !isTypeTestPath(item.node.sourcePath));
  if (!declaration) return selected;

  const result: ScoredNode[] = [];
  const sourcePaths = new Set<string>();
  const append = (item: ScoredNode | undefined): void => {
    if (!item || result.length >= limit || sourcePaths.has(item.node.sourcePath)) return;
    result.push(item);
    sourcePaths.add(item.node.sourcePath);
  };
  append(declaration);
  if (requested.includes("test")) append(scored.find((item) => isTypeTestPath(item.node.sourcePath)));
  if (requested.includes("package")) append(scored.find((item) => matchesRouteSurface(item.node, "package")));
  for (const item of selected) {
    if (isTypeDeclarationPath(item.node.sourcePath) || matchesRouteSurface(item.node, "package")) append(item);
  }
  return result;
}

function isTypeDeclarationPath(sourcePath: string): boolean {
  return /\.d\.[cm]?ts$/i.test(sourcePath);
}

function isTypeTestPath(sourcePath: string): boolean {
  return /\.(?:test|spec)-d\.[cm]?ts$/i.test(sourcePath)
    || /(^|\/)(?:test-d|type-tests?)(\/|$)/i.test(sourcePath);
}

function ensureGeneralSurfaceCoverage(
  selected: ScoredNode[],
  scored: ScoredNode[],
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>,
  limit: number,
  includeSupplemental = true
): ScoredNode[] {
  if (requested.length < 2) return selected;
  const result: ScoredNode[] = [];
  const sourcePaths = new Set<string>();
  const append = (item: ScoredNode | undefined): void => {
    if (!item || result.length >= limit || sourcePaths.has(item.node.sourcePath)) return;
    result.push(item);
    sourcePaths.add(item.node.sourcePath);
  };

  for (const surface of requested) {
    const quota = generalSurfaceQuota(scored, surface, requested, analysis);
    for (const representative of selectGeneralSurfaceRepresentatives(scored, surface, analysis, quota)) {
      const related = selected.find(
        (item) => item.node.sourcePath === representative.node.sourcePath
          && item.reasons.some((reason) => reason.startsWith("expanded through"))
      );
      append(related ?? representative);
    }
  }

  const roleCoverageIsDense = result.length >= Math.ceil(limit * 0.75);
  const supplementalLimit = !includeSupplemental || roleCoverageIsDense
    ? 0
    : Math.min(2, Math.max(0, limit - result.length));
  let supplementalCount = 0;
  for (const item of selected) {
    if (supplementalCount >= supplementalLimit) break;
    if (!hasIndependentRelationEvidence(item)) continue;
    const before = result.length;
    append(item);
    if (result.length > before) supplementalCount += 1;
  }

  if (!result.length) return selected.slice(0, limit);

  return result.sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
}

function hasIndependentRelationEvidence(item: ScoredNode): boolean {
  return item.reasons.some(
    (reason) => reason.startsWith("expanded through")
      || reason.includes("changed_with")
      || reason.startsWith("generated from")
  );
}

function selectGeneralSurfaceRepresentatives(
  scored: ScoredNode[],
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>,
  quota: number
): ScoredNode[] {
  const ranked = [...scored]
    .filter(
      (item) => matchesRouteSurface(item.node, surface)
        && !(surface === "docs" && matchesRouteSurface(item.node, "evidence"))
    )
    .map((item) => ({ item, priority: generalSurfacePriority(item, surface, analysis) }))
    .sort(
      (a, b) => b.priority - a.priority
        || b.item.score - a.item.score
        || a.item.node.sourcePath.localeCompare(b.item.node.sourcePath)
    )
    .map(({ item }) => item)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.node.sourcePath === item.node.sourcePath) === index);
  if (surface === "docs" && quota > 1) {
    return selectGeneralDocumentRepresentatives(ranked, analysis, quota);
  }
  if (surface === "evidence") {
    return selectGeneralEvidenceRepresentatives(ranked, analysis, quota);
  }
  if (surface === "test") {
    return selectGeneralTestRepresentatives(ranked, analysis, quota);
  }
  if (surface !== "implementation") return ranked.slice(0, quota);

  const result: ScoredNode[] = [];
  const concepts = new Set<string>();
  const conceptual = ranked.filter((item) => implementationPathConcept(item.node.sourcePath, analysis));
  for (const item of conceptual.length ? conceptual : ranked) {
    const concept = implementationPathConcept(item.node.sourcePath, analysis);
    if (concept && concepts.has(concept)) continue;
    result.push(item);
    if (concept) concepts.add(concept);
    if (result.length >= quota) break;
  }
  return result;
}

function generalSurfaceQuota(
  scored: ScoredNode[],
  surface: RouteSurface,
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>
): number {
  if (surface === "docs") {
    return hasAnyKeyword(new Set(analysis.keywords), ["bilingual", "localization"]) ? 2 : 1;
  }
  if (surface === "implementation") {
    const concepts = new Set(
      scored
        .filter((item) => matchesRouteSurface(item.node, "implementation"))
        .map((item) => implementationPathConcept(item.node.sourcePath, analysis))
        .filter((concept): concept is string => Boolean(concept))
    );
    return Math.max(1, Math.min(4, concepts.size));
  }
  if (surface !== "test" || !requested.includes("implementation")) return 1;
  const concepts = new Set(
    scored
      .filter((item) => matchesRouteSurface(item.node, "test") && item.node.kind === "test")
      .map((item) => testRouteConcept(item, analysis))
      .filter((concept): concept is string => Boolean(concept))
  );
  const declaredConcerns = new Set<string>();
  if (hasRoutePlanningIntent(analysis.raw) || hasRouteScoringIntent(analysis.raw) || hasTaskAnalysisIntent(analysis.raw)) {
    declaredConcerns.add("routing");
  }
  if (hasIndexFreshnessIntent(analysis.raw)) declaredConcerns.add("index-freshness");
  const namedTestCount = scored.filter(
    (item) => matchesRouteSurface(item.node, "test")
      && item.node.kind === "test"
      && explicitTestConceptAffinity(item.node.sourcePath, analysis.raw) >= 2
  ).length;
  const requestedConcernCount = Math.max(declaredConcerns.size || concepts.size, namedTestCount);
  const directTestQuota = Math.max(1, Math.min(3, requestedConcernCount));
  return Math.min(5, directTestQuota + requestedVerificationScriptQuota(analysis));
}

function generalSurfacePriority(
  item: ScoredNode,
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const sourcePath = item.node.sourcePath.toLowerCase();
  const keywords = new Set(analysis.keywords);
  let priority = item.score;
  if (surface === "mcp" && hasAnyKeyword(keywords, ["generated", "artifact", "bundle"])) {
    if (item.node.tags.includes("generated-artifact") || /generated\s+\w+\s+artifact/i.test(item.node.summary)) priority += 600;
    else if (/(^|\/)packages\/mcp\/src\//.test(sourcePath)) priority += 200;
  }
  if (surface === "implementation") {
    priority += routePathTaskAffinity(sourcePath, analysis) * 60;
    if (/(?:^|\/)analyze-task\.[^.]+$/.test(sourcePath) && hasTaskAnalysisIntent(analysis.raw)) priority += 260;
    if (/(?:^|\/)classify-task\.[^.]+$/.test(sourcePath) && hasTaskClassificationIntent(analysis.raw)) priority += 260;
    if (/(?:^|\/)publication-intent\.[^.]+$/.test(sourcePath) && hasPublicationIntentIntent(analysis.raw)) priority += 260;
    if (/(?:^|\/)status\.[^.]+$/.test(sourcePath) && hasIndexFreshnessIntent(analysis.raw)) priority += 260;
    if (/(?:^|\/)route-planner\.[^.]+$/.test(sourcePath) && hasRoutePlanningIntent(analysis.raw)) priority += 260;
    if (/(?:^|\/)route-scorer\.[^.]+$/.test(sourcePath) && hasRouteScoringIntent(analysis.raw)) priority += 260;
  }
  if (surface === "test") {
    priority += item.node.kind === "test" ? 100 : -100;
    if (isDirectTestCandidate(item)) priority += explicitTestConceptAffinity(sourcePath, analysis.raw) * 180;
    const routingTestMatchesIntent = (
      /(?:^|\/)router\.(?:test|spec)\./.test(sourcePath)
      && (hasRoutePlanningIntent(analysis.raw) || hasRouteScoringIntent(analysis.raw) || hasTaskAnalysisIntent(analysis.raw))
    ) || (
      /(?:^|\/)route-planner\.(?:test|spec)\./.test(sourcePath)
      && hasRoutePlanningIntent(analysis.raw)
    ) || (
      /(?:^|\/)route-scorer\.(?:test|spec)\./.test(sourcePath)
      && hasRouteScoringIntent(analysis.raw)
    );
    if (routingTestMatchesIntent) priority += 260;
    if (isVerificationScriptPath(sourcePath)) {
      priority += requestedVerificationScriptQuota(analysis) > 0 ? 220 : -120;
      priority += taskPathAffinity(sourcePath, analysis.raw) * 100;
    }
    if (/(?:^|[-_/])(?:release|publish)(?:[-_.\/]|$)/.test(sourcePath) && !hasAnyKeyword(keywords, ["release", "publish"])) {
      priority -= 100;
    }
    const concept = routePathConcept(sourcePath, analysis);
    if (concept) {
      priority += 30;
      if (new RegExp(`(?:^|/)${escapeRegExp(concept)}\\.(?:test|spec)\\.`).test(sourcePath)) priority += 40;
    }
  }
  if (surface === "config" && hasAnyKeyword(keywords, ["test", "verification", "regression"])) {
    if (/(^|\/)(?:vitest|jest|playwright|cypress|pytest|tox|ava|mocha)(?:\.|-|\/)/.test(sourcePath)) priority += 500;
    if (/(?:tsup|rollup|webpack|vite)\./.test(sourcePath) && !/(?:vitest|test)/.test(sourcePath)) priority -= 100;
  }
  if (surface === "evidence" && /evaluation/.test(sourcePath)) priority += 500;
  return priority;
}

function routePathConcept(sourcePath: string, analysis: ReturnType<typeof analyzeTask>): string | undefined {
  const pathTokens = tokenizeLexical(sourcePath);
  return analysis.keywords.find(
    (keyword) => keyword.length > 3
      && ![
        "test",
        "tests",
        "spec",
        "regression",
        "verification",
        "focused",
        "implementation",
        "route",
        "router",
        "routing",
        "shared",
        "generated",
        "artifact",
        "release",
        "publish",
        "changelog"
      ].includes(keyword)
      && pathTokens.has(keyword)
  );
}

function implementationPathConcept(sourcePath: string, analysis: ReturnType<typeof analyzeTask>): string | undefined {
  const basename = path.posix.basename(sourcePath).replace(/\.[^.]+$/, "");
  const pathTokens = tokenizeLexical(basename);
  const rawTokens = [...tokenizeLexical(analysis.raw)];
  if (pathTokens.has("analyze") && pathTokens.has("task") && hasTaskAnalysisIntent(analysis.raw)) {
    return "task-analysis";
  }
  if (pathTokens.has("classify") && pathTokens.has("task") && hasTaskClassificationIntent(analysis.raw)) {
    return "task-classification";
  }
  if (pathTokens.has("publication") && pathTokens.has("intent") && hasPublicationIntentIntent(analysis.raw)) {
    return "publication-intent";
  }
  if (pathTokens.has("status") && hasIndexFreshnessIntent(analysis.raw)) {
    return "index-freshness";
  }
  const routeComponent = [...pathTokens].some((token) => ["route", "router", "routing"].includes(token));
  const routeTask = rawTokens.some((token) => ["route", "router", "routing"].includes(token));
  const planningIntent = hasRoutePlanningIntent(analysis.raw);
  const scoringIntent = hasRouteScoringIntent(analysis.raw);
  if (routeComponent && (routeTask || planningIntent || scoringIntent)) {
    if (pathTokens.has("planner") && planningIntent) return "routing-plan";
    if (pathTokens.has("scorer") && scoringIntent) return "routing-score";
    if (planningIntent || scoringIntent) return undefined;
    return "routing";
  }

  const ignored = new Set([
    "implementation",
    "source",
    "shared",
    "generated",
    "artifact",
    "directory",
    "file",
    "json",
    "task",
    "test",
    "tests"
  ]);
  return rawTokens.find((token) => token.length > 3 && !ignored.has(token) && pathTokens.has(token));
}

function hasRoutePlanningIntent(task: string): boolean {
  return /\b(?:role[-\s]?aware|multi[-\s]?surface|artifact[-\s]?family|evidence[-\s]?sufficien(?:cy|t)|focused[-\s]?anchor|anchor[-\s]?validation|early[-\s]?stop(?:ping)?|route[-\s]?(?:allocation|limit|focus|plan|planning|planner)|routing\s+(?:precision|recall|plan|planning)|stopp?ing\s+(?:condition|rule|logic))\b/i.test(task);
}

function hasRouteScoringIntent(task: string): boolean {
  return /\b(?:score|scorer|scoring|confidence|calibrat(?:e|ed|ion))\b/i.test(task);
}

function hasTaskAnalysisIntent(task: string): boolean {
  return /\b(?:task[-\s]?(?:analysis|analyzer)|analy[sz](?:e|ing)\s+(?:the\s+)?task|compound[-\s]?intent|intent[-\s]?preservation|lexical[-\s]?(?:normalization|tokens?))\b/i.test(task);
}

function hasTaskClassificationIntent(task: string): boolean {
  return /\b(?:action[-\s]?classification|classif(?:y|ication)|task[-\s]?type)\b/i.test(task);
}

function hasPublicationIntentIntent(task: string): boolean {
  return /\b(?:publication[-\s]?intent|release[-\s]?(?:intent|vocabulary))\b/i.test(task);
}

function hasIndexFreshnessIntent(task: string): boolean {
  return /\b(?:index[-\s]?freshness|fresh(?:ness)?|stale|storage[-\s]?status|generated[-\s]?artifact)\b/i.test(task);
}

function routingImplementationConcernCount(task: string): number {
  return [
    hasRoutePlanningIntent(task),
    hasRouteScoringIntent(task),
    hasTaskAnalysisIntent(task),
    hasTaskClassificationIntent(task),
    hasPublicationIntentIntent(task),
    hasIndexFreshnessIntent(task)
  ].filter(Boolean).length;
}

function selectGeneralTestRepresentatives(
  ranked: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  quota: number
): ScoredNode[] {
  const scriptQuota = Math.min(requestedVerificationScriptQuota(analysis), quota);
  const directQuota = Math.max(0, quota - scriptQuota);
  const result: ScoredNode[] = [];
  const concepts = new Set<string>();
  const directTests = ranked.filter(isDirectTestCandidate);
  const conceptualTests = directTests.filter((item) => testRouteConcept(item, analysis));

  for (const item of conceptualTests.length ? conceptualTests : directTests) {
    const concept = testRouteConcept(item, analysis);
    if (concept && concepts.has(concept)) continue;
    result.push(item);
    if (concept) concepts.add(concept);
    if (result.length >= directQuota) break;
  }

  const scriptRoles = new Set<string>();
  for (const item of ranked.filter((candidate) => isVerificationScriptPath(candidate.node.sourcePath))) {
    const role = verificationScriptRole(item.node.sourcePath);
    if (scriptRoles.has(role)) continue;
    result.push(item);
    scriptRoles.add(role);
    if (scriptRoles.size >= scriptQuota) break;
  }

  for (const item of ranked) {
    if (result.length >= quota) break;
    if (result.some((selected) => selected.node.sourcePath === item.node.sourcePath)) continue;
    result.push(item);
  }
  return result.slice(0, quota);
}

function testRouteConcept(item: ScoredNode, analysis: ReturnType<typeof analyzeTask>): string | undefined {
  const pathConcept = routePathConcept(item.node.sourcePath, analysis);
  if (pathConcept) return pathConcept;
  const haystack = nodeHaystack(item);
  if (hasIndexFreshnessIntent(analysis.raw) && /(?:fresh|stale|status|index|generated[-\s]?artifact)/.test(haystack)) {
    return "index-freshness";
  }
  if (
    (hasRoutePlanningIntent(analysis.raw) || hasRouteScoringIntent(analysis.raw) || hasTaskAnalysisIntent(analysis.raw))
    && /(?:route|router|routing|artifact[-\s]?family|confidence|scor|analy)/.test(haystack)
  ) {
    return "routing";
  }
  return undefined;
}

function explicitTestConceptAffinity(sourcePath: string, task: string): number {
  const basenameTokens = [...tokenizeLexical(path.posix.basename(sourcePath))].map(canonicalRouteConceptToken);
  const concepts = basenameTokens.filter(
    (token) => !["test", "tests", "spec", "ts", "js", "tsx", "jsx", "release", "publish", "changelog"].includes(token)
  );
  const taskTokens = new Set([...tokenizeLexical(task)].map(canonicalRouteConceptToken));
  const lexicalTask = [...taskTokens].join(" ");
  let hasDirectMatch = false;
  for (const concept of concepts) {
    const escaped = escapeRegExp(concept);
    const nearTest = new RegExp(`\\b${escaped}\\b.{0,48}\\b(?:regressions?|tests?|specs?)\\b|\\b(?:regressions?|tests?|specs?)\\b.{0,48}\\b${escaped}\\b`, "i");
    if (nearTest.test(lexicalTask)) return 2;
    if (taskTokens.has(concept)) hasDirectMatch = true;
  }
  return hasDirectMatch ? 1 : 0;
}

function canonicalRouteConceptToken(token: string): string {
  return ["router", "routing"].includes(token) ? "route" : token;
}

function selectGeneralDocumentRepresentatives(
  ranked: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  quota: number
): ScoredNode[] {
  const narrative = ranked.filter(
    (item) => item.node.kind === "doc" || /\.(?:md|mdx)$/i.test(item.node.sourcePath)
  );
  const candidates = narrative.length ? narrative : ranked;
  const result: ScoredNode[] = [];
  const selectedPaths = new Set<string>();
  const localized = (sourcePath: string): boolean => /(^|\/)(?:zh-cn|zh-hans|zh_cn)(\/|$)/.test(sourcePath.toLowerCase());
  const append = (item: ScoredNode | undefined): void => {
    if (!item || selectedPaths.has(item.node.sourcePath) || result.length >= quota) return;
    result.push(item);
    selectedPaths.add(item.node.sourcePath);
  };

  const requestedVersion = documentVersionPriority(analysis.raw);
  const groups = new Map<string, ScoredNode[]>();
  for (const item of candidates) {
    const fileName = path.posix.basename(item.node.sourcePath).toLowerCase();
    groups.set(fileName, [...(groups.get(fileName) ?? []), item]);
  }
  const bestGroup = [...groups.values()].sort((left, right) => {
    const leftPath = left[0]?.node.sourcePath ?? "";
    const rightPath = right[0]?.node.sourcePath ?? "";
    const leftVersion = documentVersionPriority(leftPath);
    const rightVersion = documentVersionPriority(rightPath);
    const leftVersionMatch = requestedVersion > 0 && leftVersion === requestedVersion ? 1 : 0;
    const rightVersionMatch = requestedVersion > 0 && rightVersion === requestedVersion ? 1 : 0;
    const leftComplete = Number(left.some((item) => localized(item.node.sourcePath)) && left.some((item) => !localized(item.node.sourcePath)));
    const rightComplete = Number(right.some((item) => localized(item.node.sourcePath)) && right.some((item) => !localized(item.node.sourcePath)));
    const leftScore = Math.max(...left.map((item) => item.score));
    const rightScore = Math.max(...right.map((item) => item.score));
    return rightVersionMatch - leftVersionMatch
      || documentTaskAffinity(rightPath, analysis.raw) - documentTaskAffinity(leftPath, analysis.raw)
      || rightComplete - leftComplete
      || (requestedVersion === 0 ? rightVersion - leftVersion : 0)
      || rightScore - leftScore
      || leftPath.localeCompare(rightPath);
  })[0] ?? [];

  append(bestGroup.find((item) => !localized(item.node.sourcePath)));
  append(bestGroup.find((item) => localized(item.node.sourcePath)));
  append(candidates.find((item) => localized(item.node.sourcePath)));
  for (const item of candidates) append(item);
  return result;
}

function selectGeneralEvidenceRepresentatives(
  ranked: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  quota: number
): ScoredNode[] {
  return [...ranked]
    .sort((left, right) => {
      const leftPath = left.node.sourcePath;
      const rightPath = right.node.sourcePath;
      return documentLeadAffinity(rightPath, analysis.raw) - documentLeadAffinity(leftPath, analysis.raw)
        || documentTaskAffinity(rightPath, analysis.raw) - documentTaskAffinity(leftPath, analysis.raw)
        || documentVersionPriority(rightPath) - documentVersionPriority(leftPath)
        || right.score - left.score
        || leftPath.localeCompare(rightPath);
    })
    .slice(0, quota);
}

function documentLeadAffinity(sourcePath: string, task: string): number {
  const ignored = new Set([
    "add",
    "and",
    "doc",
    "docs",
    "documentation",
    "evidence",
    "make",
    "record",
    "records",
    "report",
    "research",
    "the"
  ]);
  const taskTokens = (task.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((token) => token.length > 2 && !ignored.has(token) && !/^\d+$/.test(token));
  const pathTokens = new Set(
    (sourcePath.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .filter((token) => token.length > 2 && !ignored.has(token) && !/^\d+$/.test(token))
  );
  return taskTokens.slice(0, 12).reduce(
    (score, token, index) => score + (pathTokens.has(token) ? 12 - index : 0),
    0
  );
}

function documentTaskAffinity(sourcePath: string, task: string): number {
  const ignored = new Set([
    "doc",
    "docs",
    "documentation",
    "evidence",
    "machine",
    "readable",
    "record",
    "records",
    "report",
    "research"
  ]);
  const taskTokens = new Set(
    (task.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .filter((token) => !ignored.has(token) && !/^\d+$/.test(token))
  );
  const pathTokens = new Set(
    (sourcePath.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .filter((token) => !ignored.has(token) && !/^\d+$/.test(token))
  );
  return [...pathTokens].filter((token) => taskTokens.has(token)).length;
}

function documentVersionPriority(value: string): number {
  const versions = [...value.toLowerCase().matchAll(/(?:^|[^a-z0-9])v?(\d+)[._-](\d+)(?:[._-](\d+))?/g)];
  return versions.reduce((highest, match) => {
    const major = Number(match[1] ?? 0);
    const minor = Number(match[2] ?? 0);
    const patch = Number(match[3] ?? 0);
    return Math.max(highest, major * 1_000_000 + minor * 1_000 + patch);
  }, 0);
}

function requestedVerificationScriptQuota(analysis: ReturnType<typeof analyzeTask>): number {
  const raw = analysis.raw.toLowerCase();
  const plural = /\b(?:release[-\s]?verification|verification|verify|smoke)\b.{0,48}\bscripts\b|\bscripts\b.{0,48}\b(?:release[-\s]?verification|verification|verify|smoke)\b/.test(raw);
  if (plural) return 2;
  const chineseMatches = raw.match(/(?:验证|驗證|冒烟|冒煙|检查|檢查).{0,16}(?:脚本|腳本)|(?:脚本|腳本).{0,16}(?:验证|驗證|冒烟|冒煙|检查|檢查)/g) ?? [];
  if (chineseMatches.length > 1 || /(?:验证|驗證).{0,8}(?:与|和|及|、).{0,8}(?:冒烟|冒煙).{0,8}(?:脚本|腳本)/.test(raw)) return 2;
  if (chineseMatches.length === 1) return 1;
  const singular = /\b(?:release[-\s]?verification|verification|verify|smoke)\b.{0,48}\bscript\b|\bscript\b.{0,48}\b(?:release[-\s]?verification|verification|verify|smoke)\b/.test(raw);
  return singular ? 1 : 0;
}

function verificationScriptRole(sourcePath: string): string {
  const normalized = sourcePath.toLowerCase();
  if (/(^|[-_/])smoke([-_.\/]|$)/.test(normalized)) return "smoke";
  if (/(^|[-_/])benchmark([-_.\/]|$)/.test(normalized)) return "benchmark";
  return "verify";
}

function taskPathAffinity(sourcePath: string, task: string): number {
  const ignored = new Set(["script", "scripts", "verify", "verification", "test", "tests"]);
  const taskTokens = new Set([...tokenizeLexical(task)].filter((token) => !ignored.has(token)));
  const pathTokens = new Set([...tokenizeLexical(sourcePath)].filter((token) => !ignored.has(token)));
  return [...pathTokens].filter((token) => taskTokens.has(token)).length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isVerificationScriptPath(sourcePath: string): boolean {
  return /(^|\/)scripts\/[^/]*(?:verify|smoke|benchmark)[^/]*$/.test(sourcePath);
}

async function ensureFreshIndex(root: string): Promise<void> {
  const status = await getPalaceStatus(root);
  if (!status.initialized || !status.indexed || status.stale) {
    await indexPalace(root);
  }
}

function normalizeOptions(options: number | RoutePalaceOptions): Required<RoutePalaceOptions> {
  const budget = typeof options === "number" ? options : options.budget ?? DEFAULT_BUDGET.maxInputTokens;
  const routeLimit = typeof options === "number" ? defaultRouteLimitForBudget(budget) : options.routeLimit ?? defaultRouteLimitForBudget(budget);
  return {
    budget,
    routeLimit: Math.max(4, Math.min(24, routeLimit))
  };
}

function defaultRouteLimitForBudget(budget: number): number {
  if (budget <= 6000) return 6;
  if (budget <= 12000) return 10;
  return 12;
}

function chooseLoadLevel(kind: string, index: number, score: number, generatedArtifact = false): LoadLevel {
  if (generatedArtifact) return "summary";
  if (index > 10) return "summary";
  if (["function", "class", "interface", "type", "symbol"].includes(kind)) return score > 80 || index < 4 ? "full_symbol" : "signature";
  if (kind === "test") return "snippet";
  if (kind === "doc" || kind === "config") return "summary";
  return index < 3 ? "snippet" : "summary";
}

function chooseRouteTier(item: ScoredNode, index: number, taskType: TaskType): Exclude<RouteTier, "excluded"> {
  const supportKind = item.node.floor === "05-verification"
    || ["test", "config", "doc"].includes(item.node.kind)
    || isTypeTestPath(item.node.sourcePath);
  const expandedByRelation = item.reasons.some((reason) => reason.startsWith("expanded through"));
  const taskMakesSupportPrimary =
    (taskType === "test" && item.node.kind === "test") ||
    (taskType === "explain" && item.node.kind === "doc") ||
    (taskType === "release" && ["config", "doc"].includes(item.node.kind));

  if (index < 2 && (!supportKind || taskMakesSupportPrimary)) return "primary";
  if (index < 5 || supportKind || expandedByRelation) return "support";
  return "deferred";
}

function estimatedTokensForLevel(base: number, loadLevel: LoadLevel): number {
  switch (loadLevel) {
    case "full_file":
      return Math.max(800, base * 8);
    case "full_symbol":
      return Math.max(240, base * 5);
    case "snippet":
      return Math.max(180, base * 3);
    case "signature":
      return Math.max(80, base * 2);
    case "summary":
      return Math.max(40, base);
    default:
      return 0;
  }
}

function linePath(sourcePath: string, startLine?: number, endLine?: number): string {
  if (!startLine) return sourcePath;
  return `${sourcePath}:${startLine}${endLine && endLine !== startLine ? `-${endLine}` : ""}`;
}

function buildExcluded(nodes: Awaited<ReturnType<typeof readIndex>>["nodes"], selectedIds: string[], analysis: ReturnType<typeof analyzeTask>): PalaceRoute["excluded"] {
  const selected = new Set(selectedIds);
  const selectedSourcePaths = nodes
    .filter((node) => selected.has(node.id))
    .map((node) => node.sourcePath);
  const selectedSourcePathSet = new Set(selectedSourcePaths);
  const byTop = new Map<string, number>();
  for (const node of nodes) {
    if (selected.has(node.id) || selectedSourcePathSet.has(node.sourcePath)) continue;
    const parts = node.sourcePath.split("/");
    const top = parts[0] === "src" && parts[1] ? `${parts[0]}/${parts[1]}` : parts[0] ?? node.sourcePath;
    if (selectedSourcePaths.some((sourcePath) => pathsOverlap(top, sourcePath))) continue;
    const haystack = [node.sourcePath, node.wing, node.room, node.title].join(" ").toLowerCase();
    if (analysis.keywords.some((keyword) => haystack.includes(keyword))) continue;
    byTop.set(top, (byTop.get(top) ?? 0) + 1);
  }
  return [...byTop.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([sourcePath]) => ({
      sourcePath,
      reason: "No strong keyword, room, or route relation match."
    }));
}

function pathsOverlap(left: string, right: string): boolean {
  const normalizedLeft = left.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "").toLowerCase();
  const normalizedRight = right.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "").toLowerCase();
  return normalizedLeft === normalizedRight
    || normalizedLeft.startsWith(`${normalizedRight}/`)
    || normalizedRight.startsWith(`${normalizedLeft}/`);
}

function confidence(
  selected: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  estimatedTokens: number,
  budget: number,
  taskType: TaskType,
  coreEvidenceCap?: number
): number {
  if (!selected.length) return 0.1;
  const top = selected.slice(0, 12);
  const keywords = analysis.keywords.filter((keyword) => !["task", "fresh"].includes(keyword));
  const covered = keywords.filter((keyword) => top.some((item) => nodeHaystack(item).includes(keyword))).length;
  const keywordCoverage = keywords.length ? covered / keywords.length : 0.45;
  const averageScore = top.reduce((sum, item) => sum + item.score, 0) / top.length;
  const scoreStrength = Math.min(1, averageScore / 140);
  const focus = dominantTopSegmentShare(top);
  const budgetFit = estimatedTokens <= budget ? 1 : 0;
  const surfacePenalty = requestedSurfacePenalty(top, analysis);
  const value = (0.08 + keywordCoverage * 0.34 + scoreStrength * 0.28 + focus * 0.2 + budgetFit * 0.1) * surfacePenalty;
  const requestedSurfaceCount = requestedRouteSurfaces(analysis).length;
  const breadthEvidence = requestedSurfaceEvidence(top, analysis, taskType);
  const breadthCap = requestedSurfaceCount >= 3
    ? 0.5 + breadthEvidence * 0.4
    : requestedSurfaceCount === 2
      ? 0.65 + breadthEvidence * 0.25
      : 0.98;
  const taskCap = Math.min(taskType === "release" ? 0.65 : 0.98, breadthCap);
  const artifactFamilyCoverage = leadingArtifactEntityCoverage(top, analysis);
  const artifactFamilyCap = artifactFamilyCoverage === undefined
    ? 0.98
    : 0.15 + artifactFamilyCoverage * 0.75;
  const directEvidenceCap = coreEvidenceCap ?? directCodeEvidenceCap(top, analysis, taskType);
  const compoundBugfixCap = taskType === "bugfix" && requestedSurfaceCount >= 3 && keywords.length >= 12
    ? 0.4
    : 0.98;
  return Number(Math.max(0.1, Math.min(taskCap, artifactFamilyCap, directEvidenceCap, compoundBugfixCap, value)).toFixed(2));
}

function directCodeEvidenceCap(
  items: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType
): number {
  if (!isCodeTaskType(taskType)) return 0.98;
  if (hasExplicitSelectedPathReference(items, analysis.raw)) return 0.98;
  const requestedSurfaceCount = requestedRouteSurfaces(analysis).length;
  const strongestDirectEvidence = items
    .filter((candidate) => isImplementationCandidate(candidate.node) && !isDirectTestCandidate(candidate))
    .reduce(
      (strongest, item) => Math.max(strongest, directCoreEvidence(item, analysis)),
      0
    );
  if (strongestDirectEvidence < 140) return requestedSurfaceCount >= 2 ? 0.4 : 0.15;
  if (strongestDirectEvidence < 220) return 0.4;
  return 0.68;
}

function hasExplicitSelectedPathReference(items: ScoredNode[], task: string): boolean {
  const normalizedTask = task.replaceAll("\\", "/").toLowerCase();
  return items.some((item) => normalizedTask.includes(item.node.sourcePath.toLowerCase()));
}

function requestedSurfaceEvidence(
  items: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType
): number {
  const requested = requestedRouteSurfaces(analysis);
  if (!requested.length || !items.length) return 1;
  const covered = requested.filter((surface) => items.some((item) => matchesRouteSurface(item.node, surface))).length;
  const surfaceCoverage = covered / requested.length;
  const roleSlots = requested.reduce((sum, surface) => {
    const quota = taskType === "evaluation"
      ? evaluationSurfaceQuota(surface, analysis)
      : generalSurfaceQuota(items, surface, requested, analysis);
    return sum + quota;
  }, 0);
  const routeFocus = Math.min(1, roleSlots / items.length);
  return surfaceCoverage * routeFocus;
}

function requestedSurfacePenalty(items: ScoredNode[], analysis: ReturnType<typeof analyzeTask>): number {
  const requested = requestedRouteSurfaces(analysis);
  if (!requested.length) return 1;
  const covered = requested.filter((surface) => items.some((item) => matchesRouteSurface(item.node, surface))).length;
  return 0.65 + (covered / requested.length) * 0.35;
}

function ensureRequestedSurfaceCoverage(
  selected: ScoredNode[],
  scored: ScoredNode[],
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>,
  limit: number
): ScoredNode[] {
  if (!requested.length) return selected;

  const result: ScoredNode[] = [];
  const protectedIds = new Set<string>();
  const artifactFamilyAnchor = selectEvaluationArtifactFamilyAnchor(scored, requested, analysis);
  const firstAlreadyHasRequestedSurface = selected[0]
    && requested.some((surface) => matchesRouteSurface(selected[0].node, surface));
  if (!artifactFamilyAnchor && !requested.includes("implementation") && selected[0] && !firstAlreadyHasRequestedSurface) {
    result.push(selected[0]);
    protectedIds.add(selected[0].node.id);
  }

  for (const surface of requested) {
    const quota = evaluationSurfaceQuota(surface, analysis);
    const representatives = selectEvaluationSurfaceRepresentatives(
      scored.filter(
        (item) =>
          matchesRouteSurface(item.node, surface)
          && !protectedIds.has(item.node.id)
          && !result.some((selectedItem) => selectedItem.node.sourcePath === item.node.sourcePath)
      ),
      surface,
      analysis,
      quota,
      artifactFamilyAnchor
    );
    for (const representative of representatives) {
      if (!result.some((item) => item.node.id === representative.node.id)) result.push(representative);
      protectedIds.add(representative.node.id);
    }
  }

  if (!result.length) return selected.slice(0, limit);
  result.sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
  while (result.length > limit) {
    let removableIndex = -1;
    for (let index = result.length - 1; index >= 0; index -= 1) {
      if (!protectedIds.has(result[index].node.id)) {
        removableIndex = index;
        break;
      }
    }
    if (removableIndex < 0) break;
    result.splice(removableIndex, 1);
  }
  return result;
}

function evaluationRouteLimit(
  baseLimit: number,
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>
): number {
  const required = requested.reduce(
    (sum, surface) => sum + evaluationSurfaceQuota(surface, analysis),
    0
  );
  return Math.max(baseLimit, Math.min(12, required));
}

function evaluationSurfaceQuota(surface: RouteSurface, analysis: ReturnType<typeof analyzeTask>): number {
  if (surface !== "docs") return 1;
  const keywords = new Set(analysis.keywords);
  let quota = 1;
  if (keywords.has("evidence")) quota += 1;
  if (keywords.has("protocol")) quota += 1;
  if (keywords.has("readme")) quota += 1;
  if (hasAnyKeyword(keywords, ["bilingual", "localization"])) quota += 1;
  return Math.min(5, quota);
}

function selectEvaluationSurfaceRepresentatives(
  candidates: ScoredNode[],
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>,
  quota: number,
  artifactFamilyAnchor?: string
): ScoredNode[] {
  const artifactEntities = orderedArtifactIdentityEntities(analysis);
  const ranked = [...candidates]
    .filter((item) => !(surface === "docs" && matchesRouteSurface(item.node, "evidence")))
    .map((item) => ({
      item,
      cohesion: artifactFamilyCohesion(item.node.sourcePath, artifactFamilyAnchor),
      familyAffinity: evaluationArtifactFamilyAffinity(item.node.sourcePath, analysis, artifactEntities),
      surfacePriority: evaluationSurfacePriority(item, surface, analysis),
      versionPriority: evaluationSurfaceVersionPriority(item.node.sourcePath)
    }))
    .sort((a, b) => b.cohesion - a.cohesion
      || b.familyAffinity - a.familyAffinity
      || b.surfacePriority - a.surfacePriority
      || b.versionPriority - a.versionPriority
      || b.item.score - a.item.score
      || a.item.node.sourcePath.localeCompare(b.item.node.sourcePath))
    .map(({ item }) => item)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.node.sourcePath === item.node.sourcePath) === index);
  if (surface !== "docs" || quota <= 1) return ranked.slice(0, quota);

  const keywords = new Set(analysis.keywords);
  const selected: ScoredNode[] = [];
  const selectedPaths = new Set<string>();
  const appendFirst = (predicate: (sourcePath: string) => boolean): void => {
    const representative = ranked.find(
      (item) => !selectedPaths.has(item.node.sourcePath) && predicate(item.node.sourcePath.toLowerCase())
    );
    if (!representative) return;
    selected.push(representative);
    selectedPaths.add(representative.node.sourcePath);
  };
  const localized = (sourcePath: string): boolean => /(^|\/)(?:zh-cn|zh-hans|zh_cn)(\/|$)/.test(sourcePath);
  const narrative = (sourcePath: string): boolean => /\.(?:md|mdx|rst|txt)$/.test(sourcePath);

  if (keywords.has("evidence")) {
    appendFirst(
      (sourcePath) => !localized(sourcePath)
        && narrative(sourcePath)
        && isNarrativeEvidencePath(sourcePath)
        && (!keywords.has("protocol") || !/(?:^|[-_/])protocol(?:[-_.\/]|$)/.test(sourcePath))
    );
  }
  if (keywords.has("protocol")) {
    appendFirst((sourcePath) => !localized(sourcePath) && /protocol/.test(sourcePath));
  }
  if (keywords.has("readme")) {
    appendFirst((sourcePath) => !localized(sourcePath) && /(^|\/)readme\.md$/.test(sourcePath));
  }
  if (hasAnyKeyword(keywords, ["bilingual", "localization"])) {
    if (keywords.has("protocol")) appendFirst((sourcePath) => localized(sourcePath) && /protocol/.test(sourcePath));
    if (keywords.has("readme")) appendFirst((sourcePath) => localized(sourcePath) && /(^|\/)readme\.md$/.test(sourcePath));
    appendFirst(localized);
  }
  for (const item of ranked) {
    if (selected.length >= quota) break;
    if (selectedPaths.has(item.node.sourcePath)) continue;
    selected.push(item);
    selectedPaths.add(item.node.sourcePath);
  }
  return selected.slice(0, quota);
}

function evaluationArtifactFamilyAffinity(
  sourcePath: string,
  analysis: ReturnType<typeof analyzeTask>,
  artifactEntities = orderedArtifactIdentityEntities(analysis)
): number {
  const sourceTokens = artifactIdentityTokens(sourcePath);
  const entityScore = artifactEntities.reduce((score, entity, index) => {
    const matched = [...entity.tokens].filter((token) => sourceTokens.has(token)).length;
    const coverage = matched / entity.tokens.size;
    const positionWeight = Math.max(180, 540 - index * 180);
    if (coverage === 1) return score + positionWeight;
    if (coverage >= 0.67) return score + Math.round(positionWeight * 0.65);
    return score;
  }, 0);
  const pathTokens = new Set(sourcePath.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const keywordMatches = analysis.keywords.filter(
    (keyword) => keyword.length > 2 && pathTokens.has(keyword.toLowerCase())
  ).length;
  return entityScore
    + documentLeadAffinity(sourcePath, analysis.raw) * 10
    + keywordMatches * 30;
}

function selectEvaluationArtifactFamilyAnchor(
  scored: ScoredNode[],
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>
): string | undefined {
  if (!isArtifactFamilyRequest(requested, analysis)) return undefined;
  const artifactEntities = orderedArtifactIdentityEntities(analysis);
  const anchor = [...scored]
    .filter((item) => isEvaluationArtifactPath(item.node.sourcePath))
    .map((item) => ({
      item,
      affinity: evaluationArtifactFamilyAffinity(item.node.sourcePath, analysis, artifactEntities)
    }))
    .sort(
      (a, b) => b.affinity - a.affinity
        || b.item.score - a.item.score
        || a.item.node.sourcePath.localeCompare(b.item.node.sourcePath)
    )[0]?.item;
  return anchor && artifactIdentityTokens(anchor.node.sourcePath).size >= 2
    ? anchor.node.sourcePath
    : undefined;
}

function isArtifactFamilyRequest(
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>
): boolean {
  const keywords = new Set(analysis.keywords);
  return requested.includes("docs")
    && (requested.includes("evidence") || requested.includes("test"))
    && hasAnyKeyword(keywords, ["evidence", "protocol", "replication", "result", "report", "bilingual"]);
}

function isEvaluationArtifactPath(sourcePath: string): boolean {
  const normalized = sourcePath.toLowerCase();
  return /(^|\/)docs\/research\//.test(normalized)
    || /(^|\/)scripts\/[^/]*(?:verify|benchmark|replication|route)[^/]*$/.test(normalized);
}

function artifactFamilyCohesion(sourcePath: string, anchorPath?: string): number {
  if (!anchorPath) return 0;
  const sourceTokens = artifactIdentityTokens(sourcePath);
  const anchorTokens = artifactIdentityTokens(anchorPath);
  if (!sourceTokens.size || !anchorTokens.size) return 0;
  const shared = [...sourceTokens].filter((token) => anchorTokens.has(token)).length;
  const coverage = shared / Math.min(sourceTokens.size, anchorTokens.size);
  if (shared < 2 || coverage < 0.6) return shared * 10;
  return Math.round(coverage * 600) + shared * 30;
}

function leadingArtifactEntityCoverage(
  items: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>
): number | undefined {
  const requested = requestedRouteSurfaces(analysis);
  if (!isArtifactFamilyRequest(requested, analysis)) return undefined;
  const leadingEntity = orderedArtifactIdentityEntities(analysis)[0]?.tokens;
  if (!leadingEntity) return undefined;
  return items.reduce((highest, item) => {
    const sourceTokens = artifactIdentityTokens(item.node.sourcePath);
    const matched = [...leadingEntity].filter((token) => sourceTokens.has(token)).length;
    return Math.max(highest, matched / leadingEntity.size);
  }, 0);
}

const ARTIFACT_IDENTITY_IGNORED = new Set([
  "alpha",
  "cjs",
  "cn",
  "docs",
  "english",
  "evidence",
  "json",
  "markdown",
  "md",
  "protocol",
  "report",
  "research",
  "result",
  "script",
  "scripts",
  "simplified",
  "verify",
  "verification",
  "zh"
]);

type ArtifactIdentityEntity = {
  explicitIndex: number;
  originalIndex: number;
  tokens: Set<string>;
};

function orderedArtifactIdentityEntities(
  analysis: ReturnType<typeof analyzeTask>
): ArtifactIdentityEntity[] {
  const raw = analysis.raw.toLowerCase();
  return analysis.entities
    .map((entity, originalIndex) => ({
      explicitIndex: raw.indexOf(entity.toLowerCase()),
      originalIndex,
      tokens: artifactIdentityTokens(entity)
    }))
    .filter((entity) => entity.tokens.size >= 2)
    .sort((a, b) => {
      const aExplicit = a.explicitIndex >= 0;
      const bExplicit = b.explicitIndex >= 0;
      if (aExplicit !== bExplicit) return aExplicit ? -1 : 1;
      if (aExplicit && bExplicit && a.explicitIndex !== b.explicitIndex) {
        return a.explicitIndex - b.explicitIndex;
      }
      return b.tokens.size - a.tokens.size || a.originalIndex - b.originalIndex;
    });
}

function artifactIdentityTokens(value: string): Set<string> {
  return new Set(
    (value.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .map(normalizeArtifactIdentityToken)
      .filter((token) => token.length > 2 && !/^\d+$/.test(token) && !ARTIFACT_IDENTITY_IGNORED.has(token))
  );
}

function normalizeArtifactIdentityToken(token: string): string {
  if (["post", "following", "followup"].includes(token)) return "after";
  if (["routes", "routing"].includes(token)) return "route";
  if (token === "repositories") return "repository";
  if (token === "results") return "result";
  if (token === "reports") return "report";
  return token;
}

function evaluationSurfaceVersionPriority(sourcePath: string): number {
  const versions = [...sourcePath.toLowerCase().matchAll(/(?:^|[^a-z0-9])v(\d+)(?:[._-](\d+))?/g)];
  return versions.reduce((highest, match) => {
    const major = Number(match[1] ?? 0);
    const minor = Number(match[2] ?? 0);
    return Math.max(highest, major * 1000 + minor);
  }, 0);
}

function evaluationSurfacePriority(
  item: ScoredNode,
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const sourcePath = item.node.sourcePath.toLowerCase();
  const keywords = new Set(analysis.keywords);
  if (surface === "implementation") {
    if (hasAnyKeyword(keywords, ["plan", "protocol", "frozen"]) && /(^|\/)src\/commands?\/study\./.test(sourcePath)) return 600;
    return 100;
  }
  if (surface === "test") {
    if (hasAnyKeyword(keywords, ["plan", "protocol", "frozen"]) && /(^|\/)(?:test|tests)\/study\.test\./.test(sourcePath)) return 600;
    return 100;
  }
  if (surface === "config") {
    if (keywords.has("plan") && /(^|\/)results\/[^/]+\/plan\.json$/.test(sourcePath)) return 600;
    if (keywords.has("plan") && /(^|\/)plan\.json$/.test(sourcePath)) return 550;
    if (keywords.has("manifest") && /(^|\/)manifest\.json$/.test(sourcePath)) return 500;
    return 100;
  }
  if (surface === "evidence") {
    if (/evaluation/.test(sourcePath)) return 650;
    if (/(?:sync|validation|audit|summary|report)/.test(sourcePath)) return 600;
    return 100;
  }
  if (surface !== "docs") return 100;

  let priority = 100;
  if (keywords.has("evidence") && isNarrativeEvidencePath(sourcePath)) priority += 500;
  if (keywords.has("protocol") && /protocol/.test(sourcePath)) priority += 450;
  if (keywords.has("readme") && /(^|\/)readme\.md$/.test(sourcePath)) priority += 400;
  if (keywords.has("readme") && sourcePath === "readme.md") priority += 200;
  if (hasAnyKeyword(keywords, ["bilingual", "localization"]) && /(^|\/)(?:zh-cn|zh-hans|zh_cn)(\/|$)/.test(sourcePath)) priority += 125;
  const compactSourcePath = compactRouteValue(sourcePath);
  if (analysis.entities.some((entity) => {
    const compactEntity = compactRouteValue(entity);
    return compactEntity.length > 0 && compactSourcePath.includes(compactEntity);
  })) priority += 75;
  return priority;
}

function isNarrativeEvidencePath(sourcePath: string): boolean {
  const fileName = sourcePath.split("/").at(-1) ?? sourcePath;
  return /\.(?:md|mdx|rst|txt)$/.test(fileName)
    && /(?:preflight|evidence|research|protocol|report|result)/.test(fileName);
}

function compactRouteValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function ensureReleaseSurfaceCoverage(
  scored: ScoredNode[],
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>,
  limit: number
): ScoredNode[] {
  const packageQuota = requested.includes("implementation") ? 2 : 5;
  const quotas: Array<[RouteSurface, number]> = [
    ["implementation", 4],
    ["test", 3],
    ["shared", 1],
    ["docs", 3],
    ["plugin", 3],
    ["mcp", 1],
    ["cli", 1],
    ["package", packageQuota],
    ["ci", 1]
  ];
  const result: ScoredNode[] = [];
  const sourcePaths = new Set<string>();
  const append = (item: ScoredNode): boolean => {
    if (result.length >= limit || sourcePaths.has(item.node.sourcePath)) return false;
    result.push(item);
    sourcePaths.add(item.node.sourcePath);
    return true;
  };

  const addedBySurface = new Map<RouteSurface, number>();
  const maxQuota = Math.max(...quotas.map(([, quota]) => quota));
  for (let round = 0; round < maxQuota && result.length < limit; round += 1) {
    for (const [surface, quota] of quotas) {
      if (!requested.includes(surface) || (addedBySurface.get(surface) ?? 0) >= quota) continue;
      const representative = [...scored]
        .filter(
          (item) =>
          matchesRouteSurface(item.node, surface)
          && isReleaseSurfaceCandidate(item, surface, analysis)
          && !sourcePaths.has(item.node.sourcePath)
        )
        .sort((a, b) => releaseSurfacePriority(b, surface, analysis) - releaseSurfacePriority(a, surface, analysis) || b.score - a.score)[0];
      if (representative && append(representative)) {
        addedBySurface.set(surface, (addedBySurface.get(surface) ?? 0) + 1);
      }
      if (result.length >= limit) break;
    }
  }

  const remaining = [...scored]
    .filter((item) => requested.some(
      (surface) => matchesRouteSurface(item.node, surface) && isReleaseSurfaceCandidate(item, surface, analysis)
    ))
    .sort(
      (a, b) => maxReleaseSurfacePriority(b, requested, analysis) - maxReleaseSurfacePriority(a, requested, analysis)
        || b.score - a.score
    );
  for (const item of remaining) {
    if (result.length >= limit) break;
    append(item);
  }

  return result.sort((a, b) => b.score - a.score || a.node.sourcePath.localeCompare(b.node.sourcePath));
}

function maxReleaseSurfacePriority(
  item: ScoredNode,
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>
): number {
  return Math.max(
    0,
    ...requested
      .filter((surface) => matchesRouteSurface(item.node, surface))
      .map((surface) => releaseSurfacePriority(item, surface, analysis))
  );
}

function releaseSurfacePriority(
  item: ScoredNode,
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const sourcePath = item.node.sourcePath.toLowerCase();
  if (surface === "implementation") {
    const keywords = new Set(analysis.keywords);
    if (hasAnyKeyword(keywords, ["route", "router"]) && /route-planner\.[cm]?[jt]s$/.test(sourcePath)) return 500;
    if (hasAnyKeyword(keywords, ["route", "router"]) && /route-scorer\.[cm]?[jt]s$/.test(sourcePath)) return 475;
    if (/context-packer\.[cm]?[jt]s$/.test(sourcePath)) return 450;
    if (/mode-selector\.[cm]?[jt]s$/.test(sourcePath)) return 425;
    if (/pitfall-board\.[cm]?[jt]s$/.test(sourcePath)) return 400;
    if (/analyze-task\.[cm]?[jt]s$/.test(sourcePath)) return 350;
    if (/packages\/core\/src\/index\.[cm]?[jt]s$/.test(sourcePath)) return 200;
    return 100;
  }
  if (surface === "test") {
    const keywords = new Set(analysis.keywords);
    if (hasAnyKeyword(keywords, ["route", "router"]) && /release-routing\.test\./.test(sourcePath)) return 500;
    if (/context\.test\./.test(sourcePath)) return 450;
    if (/mode-selector\.test\./.test(sourcePath)) return 425;
    if (/router\.test\./.test(sourcePath)) return 400;
    if (/scripts\/(?:verify-release-candidate|smoke-mcp)\./.test(sourcePath)) return 350;
    return 100;
  }
  if (surface === "mcp") {
    if (/(^|\/)packages\/mcp\/src\//.test(sourcePath)) return 300;
    if (/\.mcp\.json$/.test(sourcePath)) return 200;
    return 100;
  }
  if (surface === "cli") {
    if (/(^|\/)packages\/cli\/src\//.test(sourcePath)) return 300;
    return 100;
  }
  if (surface === "package") {
    if (sourcePath === "package.json") return 500;
    return 100;
  }
  if (surface !== "plugin") return 0;
  if (/\.codex-plugin\/plugin\.json$/.test(sourcePath)) return 400;
  if (/\.mcp\.json$/.test(sourcePath)) return 350;
  if (/(^|\/)\.agents\/plugins\/marketplace\.json$/.test(sourcePath)) return 300;
  if (/(^|\/)skills?\//.test(sourcePath)) return 200;
  return 100;
}

function isReleaseSurfaceCandidate(
  item: ScoredNode,
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>
): boolean {
  const sourcePath = item.node.sourcePath.toLowerCase();
  const keywords = new Set(analysis.keywords);
  if (surface === "implementation" && hasAnyKeyword(keywords, ["preflight", "bypass", "boundaries", "boundary"])) {
    const routeCandidate = hasAnyKeyword(keywords, ["route", "router"]) && /(route-planner|route-scorer|analyze-task)/.test(sourcePath);
    return routeCandidate || /(context-packer|mode-selector|pitfall-board)|packages\/core\/src\/index\.ts$/.test(sourcePath);
  }
  if (surface === "test") {
    if (
      hasAnyKeyword(keywords, ["release", "tarball", "verification", "mcp"])
      && /scripts\/(?:verify-release-candidate|smoke-mcp)\./.test(sourcePath)
    ) return true;
    if (hasAnyKeyword(keywords, ["bypass", "boundaries", "boundary", "preflight"])) {
      return /(mode-selector|context|router|release-routing)\.test\./.test(sourcePath);
    }
    return /(release|publish|version|plugin|marketplace|mcp|mode-selector|context|packer|adaptive)/.test(sourcePath);
  }
  if (surface === "shared" && hasAnyKeyword(keywords, ["bypass", "boundaries", "boundary", "transport", "telemetry", "payload"])) {
    return /(^|\/)packages\/shared\/src\/(types?|schemas?)\.[cm]?[jt]s$/.test(sourcePath);
  }
  if (surface === "docs" && hasAnyKeyword(keywords, ["documentation", "bilingual", "changelog", "release"])) {
    return /(^|\/)(readme|changelog|build_week)\.md$|^docs\/research\/.*(?:adaptive|bypass|0_3_0)/.test(sourcePath);
  }
  if (surface !== "package") return true;

  if (keywords.has("python") || keywords.has("pypi")) return /(^|\/)(pyproject\.toml|setup\.(?:py|cfg))$/.test(sourcePath);
  if (keywords.has("rust") || keywords.has("cargo") || keywords.has("crate")) return /(^|\/)cargo\.toml$/.test(sourcePath);
  if (keywords.has("java") || keywords.has("maven") || keywords.has("gradle")) return /(^|\/)(pom\.xml|build\.gradle(?:\.kts)?)$/.test(sourcePath);
  if (keywords.has("dotnet") || keywords.has("nuget")) return /\.csproj$/.test(sourcePath);
  return true;
}

function hasAnyKeyword(keywords: Set<string>, candidates: string[]): boolean {
  return candidates.some((candidate) => keywords.has(candidate));
}

function nodeHaystack(item: ScoredNode): string {
  return [item.node.sourcePath, item.node.title, item.node.summary, item.node.wing, item.node.room, ...item.node.tags].filter(Boolean).join(" ").toLowerCase();
}

function dominantTopSegmentShare(items: ScoredNode[]): number {
  const counts = new Map<string, number>();
  for (const item of items) {
    const [first, second] = item.node.sourcePath.split("/");
    const top = first === "packages" && second ? `${first}/${second}` : first || item.node.sourcePath;
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  const max = Math.max(...counts.values());
  return max / items.length;
}
