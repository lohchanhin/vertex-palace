import path from "node:path";
import type { LoadLevel, PalaceEdge, PalaceEvidenceFact, PalaceNode, PalaceReferencePolicy, PalaceRoute, RouteTier, TaskIntent, TaskType } from "@vertex-palace/shared";
import { DEFAULT_BUDGET } from "../config/defaults";
import { buildRouteConfidenceEvidence, evaluateEvidenceClosure } from "../evidence/evidence-closure";
import { nodeEvidenceScope, nodeHasEvidenceRole } from "../evidence/evidence-model";
import { indexPalace } from "../indexer/index-palace";
import { readIndex } from "../storage/read-palace";
import { getPalaceStatus } from "../storage/status";
import { appendRoute } from "../storage/write-palace";
import { hashText } from "../scanner/file-hash";
import { expandedTaskAcronyms } from "../utils/lexical-acronyms";
import { compactCodeIdentifier, extractCodeIdentifierCompacts, extractCodeIdentifiers, normalizeLexicalToken, tokenizeLexical } from "../utils/lexical-tokens";
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
import { buildTaskIntent } from "./task-intent";
import { groundTask, type GroundTaskOptions } from "./task-grounding";
import { applyExplicitEvidenceContractToClosure, enforceExplicitEvidenceContract } from "./task-evidence-contract";
import { closeTaskEvidenceFacets } from "./evidence-facet-planner";

export type RoutePalaceOptions = {
  budget?: number;
  routeLimit?: number;
  referencePolicy?: PalaceReferencePolicy;
  grounding?: Omit<GroundTaskOptions, "referencePolicy">;
};

type NormalizedRoutePalaceOptions = {
  budget: number;
  routeLimit: number;
  referencePolicy: PalaceReferencePolicy;
  grounding?: Omit<GroundTaskOptions, "referencePolicy">;
};

export async function routePalace(root: string, task: string, options: number | RoutePalaceOptions = DEFAULT_BUDGET.maxInputTokens): Promise<PalaceRoute> {
  const normalized = normalizeOptions(options);
  const budget = normalized.budget;
  await ensureFreshIndex(root);
  const index = await readIndex(root);
  const groundedTask = await groundTask(root, task, index.nodes, {
    ...normalized.grounding,
    referencePolicy: normalized.referencePolicy
  });
  if (groundedTask.grounding.decision === "abstain") {
    return appendAbstainedRoute(root, task, budget, index, groundedTask.grounding);
  }
  const obligationAnalysis = analyzeTask(groundedTask.obligationTask);
  const analysis = groundedTask.routingTask === groundedTask.obligationTask
    ? obligationAnalysis
    : analyzeTask(groundedTask.routingTask);
  const taskType = classifyTask(groundedTask.obligationTask);
  const taskScored = scoreNodes(index.nodes, index.edges, analysis, taskType, index.facts);
  const scored = taskScored.length
    ? taskScored
    : conventionalEntryFallback(index.nodes, analysis, taskType);
  const requestedSurfaces = requestedRouteSurfaces(obligationAnalysis);
  const intent = buildTaskIntent(obligationAnalysis, taskType, requestedSurfaces);
  const codeTask = isCodeTaskType(taskType);
  const artifactLifecycleTask = codeTask
    && isArtifactFamilyRequest(requestedSurfaces, analysis);
  const typeDeclarationTask = taskType === "bugfix" && isTypeDeclarationIntent(analysis);
  const routeLimit =
    taskType === "evaluation"
      ? evaluationRouteLimit(normalized.routeLimit, requestedSurfaces, analysis)
      : normalized.routeLimit;
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
  const conventionalFallbackRoute = taskScored.length === 0 && scored.length > 0;
  const expansionCandidates = boundedBugfix && implementationAnchor
    ? [implementationAnchor, ...scored.filter((item) => item.node.id !== implementationAnchor.node.id)]
    : scored;
  const expandedInitialRoute = expandRoute(expansionCandidates, index.edges, index.nodes, {
    limit: routeLimit,
    focused: focused || conventionalFallbackRoute,
    bounded: boundedBugfix || conventionalFallbackRoute,
    preferVerificationRelations: boundedBugfix || conventionalFallbackRoute,
    minSeedScoreRatio: boundedBugfix || conventionalFallbackRoute ? 0.75 : undefined,
    requiredRoles: intent.requiredRoles,
    taskTerms: [...analysis.identifiers, ...analysis.keywords]
  });
  const initialRoute = conventionalFallbackRoute
    ? uniqueScoredNodes([
        ...scored,
        ...expandedInitialRoute
      ])
        .filter((item) => typeDeclarationTask || !isTypeTestPath(item.node.sourcePath))
        .slice(0, routeLimit)
    : expandedInitialRoute;
  const surfaceExpanded =
    taskType === "evaluation" || artifactLifecycleTask
      ? ensureRequestedSurfaceCoverage(
          initialRoute,
          scored,
          requestedSurfaces,
          analysis,
          taskType,
          routeLimit
        )
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
    intent,
    routeLimit
  );
  const additiveContractSelection = selectAdditiveExternalContractRoute(
    coreSelection?.route ?? surfaceExpanded,
    scored,
    analysis,
    taskType,
    routeLimit
  );
  const effectiveCoreSelection = additiveContractSelection ?? coreSelection;
  const causallyExpanded = effectiveCoreSelection?.causalClosed
    ? effectiveCoreSelection.route
    : materializeMissingCausalSources(
        effectiveCoreSelection?.route ?? surfaceExpanded,
        scored,
        index.edges,
        index.nodes,
        analysis,
        intent,
        routeLimit
      );
  const expandedWithCommonCaller = materializeCommonCallerBridge(
    causallyExpanded,
    scored,
    index.edges,
    index.nodes,
    analysis,
    routeLimit
  );
  const expandedWithAdditiveFamily = ensureAdditiveApiFamilyClosure(
    expandedWithCommonCaller,
    scored,
    index.edges,
    index.nodes,
    analysis,
    taskType,
    routeLimit
  );
  const expandedWithApiCompanions = ensureAdditiveApiCompanionEvidence(
    expandedWithAdditiveFamily,
    scored,
    index.nodes,
    analysis,
    taskType,
    routeLimit
  );
  const expandedWithPlatformVerification = ensurePlatformFamilyVerification(
    expandedWithApiCompanions,
    scored,
    analysis,
    routeLimit
  );
  const expandedWithAuxiliaryEvidence = ensureRoleAwareAuxiliaryEvidence(
    expandedWithPlatformVerification,
    scored,
    index.nodes,
    analysis,
    requestedSurfaces,
    taskType,
    routeLimit
  );
  const verificationPruned = pruneRedundantVerificationNoise(
    expandedWithAuxiliaryEvidence,
    index.edges,
    index.nodes,
    analysis,
    taskType
  );
  const lexicallyPruned = pruneRedundantLexicalRouteNoise(
    verificationPruned,
    index.edges,
    index.nodes,
    analysis,
    taskType
  );
  const transitivelyClosed = materializeTransitiveRoleBridge(
    lexicallyPruned,
    scored,
    index.edges,
    index.nodes,
    analysis,
    intent,
    routeLimit
  );
  const ownerClosed = ensureTaskOwnerVerificationClosure(
    transitivelyClosed,
    scored,
    index.edges,
    index.nodes,
    analysis,
    routeLimit
  );
  const facetClosure = closeTaskEvidenceFacets({
    selected: ownerClosed,
    scored,
    nodes: index.nodes,
    edges: index.edges,
    analysis: obligationAnalysis,
    taskType,
    limit: routeLimit
  });
  const explicitEvidenceContract = enforceExplicitEvidenceContract(
    facetClosure.route,
    scored,
    index.nodes,
    groundedTask.authoritativeTask,
    routeLimit
  );
  const expanded = explicitEvidenceContract.route;
  const evidenceClosure = applyExplicitEvidenceContractToClosure(evaluateEvidenceClosure({
    intent,
    selectedNodes: expanded.map((item) => item.node),
    selectedFacts: expanded.flatMap((item) => item.matchedFact ? [item.matchedFact] : []),
    allNodes: index.nodes,
    edges: index.edges
  }), explicitEvidenceContract);
  const confidenceEvidence = buildRouteConfidenceEvidence(
    evidenceClosure,
    competingImplementationAnchorCount(scored, intent, analysis)
  );
  const directImplementationVerificationClosure = evidenceClosure.connectedRolePairs.some((pair) =>
    pair.hops <= 1
    && pair.strength >= 0.75
    && new Set([pair.from, pair.to]).has("implementation")
    && new Set([pair.from, pair.to]).has("verification")
  );
  const verificationCoversSubject = expanded
    .filter(isDirectTestCandidate)
    .some((item) => {
      const profile = coreEvidenceProfile(item, obligationAnalysis, "test");
      return intersection(profile.taskCoverage, coreSubjectTokens(obligationAnalysis)).size > 0;
    });
  const facetConfidenceCap = facetClosure.applied && facetClosure.missingFacets.length ? 0.4 : undefined;
  const confidenceCaps = [effectiveCoreSelection?.confidenceCap, facetConfidenceCap]
    .filter((value): value is number => value !== undefined);
  const provisionalCoreConfidenceCap = confidenceCaps.length ? Math.min(...confidenceCaps) : undefined;
  const closureValidatedCoreConfidenceCap = (provisionalCoreConfidenceCap === undefined
      || provisionalCoreConfidenceCap <= 0.4)
    && evidenceClosure.status === "sufficient"
    && confidenceEvidence.completeness >= 0.95
    && confidenceEvidence.connectivity >= 0.95
    && confidenceEvidence.ambiguity === 0
    && directImplementationVerificationClosure
    && verificationCoversSubject
    ? 0.9
    : provisionalCoreConfidenceCap;
  const narrowingEvidence = independentImplementationAnchorEvidence(
    expanded,
    obligationAnalysis,
    taskType,
    closureValidatedCoreConfidenceCap,
    index.nodes,
    index.edges
  );
  const now = new Date().toISOString();

  const routeSteps = expanded.map((item, index) => {
    const loadLevel = item.matchedFact
      ? "full_symbol"
      : chooseLoadLevel(item.node.kind, index, item.score, item.node.tags.includes("generated-artifact"));
    const tier = chooseRouteTier(item, index, taskType);
    return {
      nodeId: item.node.id,
      palacePath: item.node.palacePath,
      sourcePath: linePath(
        item.node.sourcePath,
        item.matchedFact?.startLine ?? item.node.startLine,
        item.matchedFact?.endLine ?? item.node.endLine
      ),
      reason: item.reasons[0] ?? `Matched ${analysis.keywords.join(", ") || "task"} against palace index.`,
      loadLevel,
      estimatedTokens: estimatedTokensForLevel(item.node.tokenCost, loadLevel),
      priority: index + 1,
      tier,
      confidence: Number(Math.max(0.1, Math.min(0.99, item.score / 160)).toFixed(2)),
      evidence: [
        ...(item.matchedFact ? [`Matched ${item.matchedFact.kind} fact: ${item.matchedFact.name}`] : []),
        ...item.reasons
      ].slice(0, 3)
    };
  });

  const estimatedTokens = routeSteps.reduce((sum, step) => sum + step.estimatedTokens, 0);
  const route: PalaceRoute = {
    id: `route_${hashText(`${task}:${now}`).slice(0, 16)}`,
    task,
    taskType,
    decision: "route",
    taskGrounding: groundedTask.grounding,
    entry: locateEntry(taskType, analysis),
    route: routeSteps,
    excluded: buildExcluded(index.nodes, routeSteps.map((step) => step.nodeId), analysis),
    budget: {
      maxInputTokens: budget,
      estimatedTokens,
      reservedOutputTokens: DEFAULT_BUDGET.reservedOutputTokens
    },
    confidence: confidence(
      expanded,
      analysis,
      estimatedTokens,
      budget,
      taskType,
      confidenceEvidence,
      closureValidatedCoreConfidenceCap,
      narrowingEvidence
    ),
    intent,
    evidenceClosure,
    confidenceEvidence,
    narrowingEvidence,
    createdAt: now
  };

  await appendRoute(root, index.routes, route);
  return route;
}

function isImplementationCandidate(node: Awaited<ReturnType<typeof readIndex>>["nodes"][number]): boolean {
  return nodeHasEvidenceRole(node, "implementation")
    && nodeEvidenceScope(node) === "product"
    && !isOperationalMetadataPath(node.sourcePath);
}

function isCodeTaskType(taskType: TaskType): boolean {
  return ["bugfix", "feature", "refactor"].includes(taskType);
}

function conventionalEntryFallback(
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType
): ScoredNode[] {
  if (!isCodeTaskType(taskType)) return [];
  const physicalBySource = new Map<string, PalaceNode>();
  for (const node of nodes) {
    if (
      node.startLine
      || node.kind === "directory"
      || nodeEvidenceScope(node) !== "product"
    ) continue;
    const current = physicalBySource.get(node.sourcePath);
    if (!current || conventionalPhysicalNodePriority(node) > conventionalPhysicalNodePriority(current)) {
      physicalBySource.set(node.sourcePath, node);
    }
  }

  const implementationCandidates = [...physicalBySource.values()]
    .filter((node) => nodeHasEvidenceRole(node, "implementation"))
    .filter((node) => !isDirectTestPath(node.sourcePath))
    .filter((node) => !isOperationalMetadataPath(node.sourcePath))
    .filter((node) => isRuntimeSourcePath(node.sourcePath))
    .map((node) => ({ node, rank: conventionalImplementationEntryRank(node.sourcePath) }))
    .filter(({ rank }) => rank > 0)
    .sort((left, right) => right.rank - left.rank
      || left.node.sourcePath.localeCompare(right.node.sourcePath));
  const implementation = implementationCandidates[0];
  if (!implementation) return [];
  if (
    implementationCandidates[1]
    && implementationCandidates[1].rank === implementation.rank
  ) return [];

  const implementationItem: ScoredNode = {
    node: implementation.node,
    score: 18,
    reasons: ["low-confidence conventional implementation entry fallback"],
    matchedKeywordCount: 0
  };
  const typeDeclarationTask = isTypeDeclarationIntent(analysis);
  const verification = [...physicalBySource.values()]
    .filter((node) => nodeHasEvidenceRole(node, "verification"))
    .filter((node) => isDirectTestPath(node.sourcePath))
    .filter((node) => typeDeclarationTask || !isTypeTestPath(node.sourcePath))
    .map((node) => ({
      node,
      rank: conventionalVerificationRank(implementation.node.sourcePath, node.sourcePath)
    }))
    .filter(({ rank }) => rank > 0)
    .sort((left, right) => right.rank - left.rank
      || left.node.sourcePath.localeCompare(right.node.sourcePath))[0];
  if (!verification) return [implementationItem];
  return [
    implementationItem,
    {
      node: verification.node,
      score: 16,
      reasons: ["bounded conventional verification fallback for the implementation entry"],
      matchedKeywordCount: 0
    }
  ];
}

function conventionalPhysicalNodePriority(node: PalaceNode): number {
  if (["file", "test"].includes(node.kind)) return 3;
  if (["function", "class", "interface", "type", "symbol"].includes(node.kind)) return 1;
  return 2;
}

function isRuntimeSourcePath(sourcePath: string): boolean {
  const normalized = sourcePath.replaceAll("\\", "/").toLowerCase();
  if (isTypeDeclarationPath(normalized)) return false;
  return /\.(?:c|cc|cpp|cs|go|java|js|jsx|kt|mjs|php|py|rb|rs|swift|ts|tsx)$/.test(normalized);
}

function isDirectTestPath(sourcePath: string): boolean {
  const normalized = sourcePath.replaceAll("\\", "/").toLowerCase();
  return isTypeTestPath(normalized)
    || /(^|\/)(?:test|tests|testing|spec|__tests__)(\/|$)|\.(?:test|spec)\.[^.]+$/.test(normalized)
    || /(^|\/)(?:test|tests|spec)\.[a-z0-9]+$/.test(normalized)
    || /(^|\/)(?:test_[^/]+|[^/]+_(?:test|spec))\.[a-z0-9]+$/.test(normalized)
    || /(^|\/)[^/]+tests?\.(?:cs|java|kt)$/.test(normalized);
}

function conventionalImplementationEntryRank(sourcePath: string): number {
  const normalized = sourcePath.replaceAll("\\", "/").toLowerCase();
  const parts = normalized.split("/");
  const basename = parts.at(-1) ?? "";
  const stem = basename.replace(/\.[^.]+$/, "");
  const stemOrder = ["index", "lib", "main", "mod", "__init__"];
  const stemIndex = stemOrder.indexOf(stem);
  if (stemIndex < 0 || parts.length > 2) return 0;
  return (parts.length === 1 ? 200 : 150) - stemIndex * 2;
}

function conventionalVerificationRank(implementationPath: string, testPath: string): number {
  const ownerEvidence = sourceTestOwnerEvidence(implementationPath, testPath);
  const colocatedEvidence = colocatedGenericTestEvidence(implementationPath, testPath);
  const depth = testPath.replaceAll("\\", "/").split("/").length;
  return ownerEvidence * 200 + colocatedEvidence * 180 + Math.max(0, 20 - depth);
}

function materializeCommonCallerBridge(
  selected: ScoredNode[],
  scored: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  limit: number
): ScoredNode[] {
  const result = selected
    .filter(
      (item, index, items) => items.findIndex(
        (candidate) => candidate.node.sourcePath === item.node.sourcePath
    ) === index
    )
    .slice(0, limit);

  const selectedSources = new Set(result.map((item) => item.node.sourcePath));
  const selectedImplementationSources = result
    .filter((item) => isImplementationCandidate(item.node))
    .map((item) => item.node.sourcePath);
  if (selectedImplementationSources.length < 2) return result;
  const selectedImplementationSourceSet = new Set(selectedImplementationSources);

  const sourceByNodeId = new Map(nodes.map((node) => [node.id, node.sourcePath]));
  const dependencyTargets = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.type !== "depends_on" || edge.weight < 0.5) continue;
    const from = sourceByNodeId.get(edge.from);
    const to = sourceByNodeId.get(edge.to);
    if (!from || !to || from === to || !selectedImplementationSourceSet.has(to)) continue;
    const targets = dependencyTargets.get(from) ?? new Set<string>();
    targets.add(to);
    dependencyTargets.set(from, targets);
  }

  const taskAnchoredSource = selectedImplementationSources.find(
    (sourcePath) => moduleStemAppearsInTask(sourcePath, analysis.raw)
  );
  const ownershipAnchor = taskAnchoredSource ?? selectedImplementationSources[0];
  const commonCaller = [...dependencyTargets.entries()]
    .filter(([sourcePath, targets]) =>
      !selectedSources.has(sourcePath)
        && targets.size >= 2
        && sameCoreOwnership(sourcePath, ownershipAnchor)
    )
    .map(([sourcePath, targets]) => {
      const scoredCandidate = scored.find((item) => item.node.sourcePath === sourcePath);
      const node = scoredCandidate?.node ?? nodes.find((candidate) =>
        candidate.sourcePath === sourcePath
          && !candidate.startLine
          && isImplementationCandidate(candidate)
      );
      return node ? { sourcePath, targets, scoredCandidate, node } : undefined;
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) => commonCallerCoordinatorHint(right.sourcePath) - commonCallerCoordinatorHint(left.sourcePath)
      || right.targets.size - left.targets.size
      || (right.scoredCandidate?.score ?? 0) - (left.scoredCandidate?.score ?? 0)
      || left.sourcePath.localeCompare(right.sourcePath))[0];
  if (!commonCaller) return result;

  if (result.length >= limit) {
    let replaceableVerificationIndex = -1;
    for (let index = result.length - 1; index >= 0; index -= 1) {
      const item = result[index];
      const testStem = item ? canonicalModuleStem(item.node.sourcePath).toLowerCase() : "";
      const mirrorsSelectedImplementation = item
        ? selectedImplementationSources.some(
            (sourcePath) => sourceTestOwnerEvidence(sourcePath, item.node.sourcePath) > 0
          )
        : false;
      if (
        item
        && isDirectTestCandidate(item)
        && !isTypeTestPath(item.node.sourcePath)
        && !mirrorsSelectedImplementation
        && !["api", "index", "main", "public"].includes(testStem)
      ) {
        replaceableVerificationIndex = index;
        break;
      }
    }
    if (replaceableVerificationIndex < 0) return result;
    result.splice(replaceableVerificationIndex, 1);
  }

  const routedBridge: ScoredNode = commonCaller.scoredCandidate
    ? {
        ...commonCaller.scoredCandidate,
        reasons: [
          `directly coordinates ${commonCaller.targets.size} selected implementation sources`,
          ...commonCaller.scoredCandidate.reasons
        ]
      }
    : {
        node: commonCaller.node,
        score: 10,
        reasons: [`directly coordinates ${commonCaller.targets.size} selected implementation sources`],
        matchedKeywordCount: 0
      };
  const verificationIndex = result.findIndex(
    (item) => nodeHasEvidenceRole(item.node, "verification")
      && !nodeHasEvidenceRole(item.node, "implementation")
  );
  if (verificationIndex >= 0) result.splice(verificationIndex, 0, routedBridge);
  else result.push(routedBridge);
  return result.slice(0, limit);
}

function commonCallerCoordinatorHint(sourcePath: string): number {
  const stem = canonicalModuleStem(sourcePath).toLowerCase();
  return /(?:connector|coordinator|controller|handler|service|manager|orchestrator|workflow|runtime|main|client|factory|builder)/.test(stem)
    ? 1
    : 0;
}

function materializeMissingCausalSources(
  selected: ScoredNode[],
  scored: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  intent: TaskIntent,
  limit: number
): ScoredNode[] {
  const result = selected
    .filter(
      (item, index, items) => items.findIndex(
        (candidate) => candidate.node.sourcePath === item.node.sourcePath
      ) === index
    )
    .slice(0, limit);
  const selectedSources = new Set(result.map((item) => item.node.sourcePath));
  const selectedImplementationSources = result
    .filter((item) => isImplementationCandidate(item.node))
    .map((item) => item.node.sourcePath);
  const selectedWorkspaceScopes = new Set(
    selectedImplementationSources
      .map(coreWorkspaceScope)
      .filter((scope): scope is string => Boolean(scope))
  );
  const dominantWorkspaceScope = selectedWorkspaceScopes.size === 1
    ? [...selectedWorkspaceScopes][0]
    : undefined;
  const taskAnchoredSource = selectedImplementationSources.find(
    (sourcePath) => moduleStemAppearsInTask(sourcePath, analysis.raw)
  );
  let additions = 0;
  const maxAdditions = 3;

  while (result.length < limit && additions < maxAdditions) {
    const closure = evaluateEvidenceClosure({
      intent,
      selectedNodes: result.map((item) => item.node),
      selectedFacts: result.flatMap((item) => item.matchedFact ? [item.matchedFact] : []),
      allNodes: nodes,
      edges
    });
    const bridge = closure.missingCausalSources
      .filter((sourcePath) => !selectedSources.has(sourcePath))
      .filter((sourcePath) => {
        if (
          dominantWorkspaceScope
          && coreWorkspaceScope(sourcePath) !== dominantWorkspaceScope
        ) return false;
        if (!taskAnchoredSource) return true;
        return isCorePackageBoundaryPath(sourcePath)
          || moduleStemAppearsInTask(sourcePath, analysis.raw)
          || canonicalModuleStem(taskAnchoredSource) === canonicalModuleStem(sourcePath);
      })
      .flatMap((sourcePath) => {
        const candidate = scored.find((item) => item.node.sourcePath === sourcePath);
        return candidate ? [candidate] : [];
      })
      .sort((left, right) => right.score - left.score
        || right.matchedKeywordCount - left.matchedKeywordCount
        || left.node.sourcePath.localeCompare(right.node.sourcePath))[0];
    if (!bridge) break;
    const missingSource = bridge.node.sourcePath;
    const routedBridge: ScoredNode = {
      ...bridge,
      reasons: [
        "required task-aligned causal implementation participant",
        ...bridge.reasons
      ]
    };
    const verificationIndex = result.findIndex(
      (item) => nodeHasEvidenceRole(item.node, "verification")
        && !nodeHasEvidenceRole(item.node, "implementation")
    );
    if (verificationIndex >= 0) result.splice(verificationIndex, 0, routedBridge);
    else result.push(routedBridge);
    selectedSources.add(missingSource);
    additions += 1;
  }

  return result;
}

function materializeTransitiveRoleBridge(
  selected: ScoredNode[],
  scored: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  intent: TaskIntent,
  limit: number
): ScoredNode[] {
  const result = uniqueScoredNodes(selected).slice(0, limit);
  if (result.length >= limit) return result;
  const closure = evaluateEvidenceClosure({
    intent,
    selectedNodes: result.map((item) => item.node),
    selectedFacts: result.flatMap((item) => item.matchedFact ? [item.matchedFact] : []),
    allNodes: nodes,
    edges
  });
  if (closure.status === "sufficient") return result;

  const bridgeMultiplicity = new Map<string, number>();
  for (const pair of closure.connectedRolePairs) {
    if (
      pair.hops < 2
      || !new Set([pair.from, pair.to]).has("implementation")
      || !new Set([pair.from, pair.to]).has("verification")
    ) continue;
    for (const sourcePath of pair.via) {
      bridgeMultiplicity.set(sourcePath, (bridgeMultiplicity.get(sourcePath) ?? 0) + 1);
    }
  }
  if (!bridgeMultiplicity.size) return result;

  const selectedPaths = new Set(result.map((item) => item.node.sourcePath));
  const selectedBySource = new Map(result.map((item) => [item.node.sourcePath, item]));
  const selectedImplementationSources = result
    .filter((item) => isImplementationCandidate(item.node))
    .map((item) => item.node.sourcePath);
  const selectedImplementationScopes = selectedImplementationSources
    .map(coreWorkspaceScope);
  const definedImplementationScopes = new Set(
    selectedImplementationScopes.filter((scope): scope is string => Boolean(scope))
  );
  const dominantWorkspaceScope = selectedImplementationScopes.length > 0
    && selectedImplementationScopes.every((scope): scope is string => Boolean(scope))
    && definedImplementationScopes.size === 1
    ? [...definedImplementationScopes][0]
    : undefined;
  const physicalBySource = physicalEvidenceNodesBySource(nodes);
  const scoredBySource = strongestScoredNodeBySource(scored);
  const bridge = [...bridgeMultiplicity.entries()]
    .flatMap(([sourcePath, multiplicity]) => {
      const existing = selectedBySource.get(sourcePath) ?? scoredBySource.get(sourcePath);
      const node = existing?.node ?? physicalBySource.get(sourcePath);
      if (
        !node
        || !isImplementationCandidate(node)
        || (dominantWorkspaceScope && coreWorkspaceScope(sourcePath) !== dominantWorkspaceScope)
      ) return [];
      return [{
        item: existing ?? {
          node,
          score: 20,
          reasons: [],
          matchedKeywordCount: 0
        },
        multiplicity,
        affinity: routePathTaskAffinity(sourcePath, analysis)
      }];
    })
    .sort((left, right) => right.multiplicity - left.multiplicity
      || right.affinity - left.affinity
      || right.item.score - left.item.score
      || left.item.node.sourcePath.localeCompare(right.item.node.sourcePath))[0];
  if (!bridge) return result;

  const routedBridge: ScoredNode = {
    ...bridge.item,
    reasons: [
      "materialized transitive implementation bridge between selected code and verification",
      ...bridge.item.reasons
    ]
  };
  if (selectedPaths.has(bridge.item.node.sourcePath)) {
    return result.map((item) =>
      item.node.sourcePath === bridge.item.node.sourcePath ? routedBridge : item
    );
  }
  const verificationIndex = result.findIndex(
    (item) => nodeHasEvidenceRole(item.node, "verification")
      && !nodeHasEvidenceRole(item.node, "implementation")
  );
  if (verificationIndex >= 0) result.splice(verificationIndex, 0, routedBridge);
  else result.push(routedBridge);
  return result.slice(0, limit);
}

function ensureAdditiveApiFamilyClosure(
  selected: ScoredNode[],
  scored: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType,
  limit: number
): ScoredNode[] {
  if (
    taskType !== "feature"
    || !/\b(?:add|introduce|expose|implement)\b[\s\S]{0,80}\b[A-Za-z_$][A-Za-z0-9_$]*\s*\(\s*\)/i.test(analysis.raw)
    || analysis.identifiers.some((identifier) => /[.:]/.test(identifier))
  ) return selected;

  const result = uniqueScoredNodes(selected).slice(0, limit);
  if (result.length + 2 > limit) return result;
  const selectedImplementations = result
    .filter((item) => isImplementationCandidate(item.node) && !isDirectTestCandidate(item));
  if (!selectedImplementations.length || !result.some(isDirectTestCandidate)) return result;

  const selectedPaths = new Set(result.map((item) => item.node.sourcePath));
  const physicalBySource = physicalEvidenceNodesBySource(nodes);
  const scoredBySource = strongestScoredNodeBySource(scored);
  const implementationNodes = [...physicalBySource.values()]
    .filter((node) => isImplementationCandidate(node) && !isDirectTestPath(node.sourcePath));
  const verificationNodes = [...physicalBySource.values()]
    .filter((node) => nodeHasEvidenceRole(node, "verification") && isDirectTestPath(node.sourcePath));
  const relevantSources = new Set([
    ...selectedImplementations.map((item) => item.node.sourcePath),
    ...implementationNodes.map((node) => node.sourcePath),
    ...verificationNodes.map((node) => node.sourcePath)
  ]);
  const relations = buildSourceRelations(edges, nodes, relevantSources, analysis);
  const selectedImplementationPaths = new Set(
    selectedImplementations.map((item) => item.node.sourcePath)
  );

  const companion = implementationNodes
    .filter((node) => !selectedPaths.has(node.sourcePath))
    .flatMap((node) => {
      const familyAnchor = selectedImplementations
        .map((item) => ({
          item,
          familyEvidence: implementationVariantFamilyEvidence(
            item.node.sourcePath,
            node.sourcePath
          )
        }))
        .filter(({ familyEvidence }) => familyEvidence > 0)
        .sort((left, right) => right.familyEvidence - left.familyEvidence)[0];
      if (!familyAnchor) return [];
      const relationEvidence = strongestRelationTo(
        node.sourcePath,
        selectedImplementationPaths,
        relations
      );
      if (relationEvidence < 0.6) return [];
      const test = verificationNodes
        .filter((candidate) => !selectedPaths.has(candidate.sourcePath))
        .filter((candidate) => sourceTestModuleMirrorEvidence(
          node.sourcePath,
          candidate.sourcePath
        ) >= 0.75)
        .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath))[0];
      if (!test) return [];
      return [{
        node,
        test,
        relationEvidence,
        familyEvidence: familyAnchor.familyEvidence,
        scoredItem: scoredBySource.get(node.sourcePath),
        scoredTest: scoredBySource.get(test.sourcePath)
      }];
    })
    .sort((left, right) => right.relationEvidence - left.relationEvidence
      || right.familyEvidence - left.familyEvidence
      || (right.scoredItem?.score ?? 0) - (left.scoredItem?.score ?? 0)
      || left.node.sourcePath.localeCompare(right.node.sourcePath))[0];
  if (!companion) return result;

  const implementationItem: ScoredNode = companion.scoredItem
    ? {
        ...companion.scoredItem,
        reasons: [
          "directly related additive API variant in the same implementation family",
          ...companion.scoredItem.reasons
        ]
      }
    : {
        node: companion.node,
        score: 20,
        reasons: ["directly related additive API variant in the same implementation family"],
        matchedKeywordCount: 0
      };
  const testItem: ScoredNode = companion.scoredTest
    ? {
        ...companion.scoredTest,
        reasons: [
          `mirror verification for additive API variant ${companion.node.sourcePath}`,
          ...companion.scoredTest.reasons
        ]
      }
    : {
        node: companion.test,
        score: 18,
        reasons: [`mirror verification for additive API variant ${companion.node.sourcePath}`],
        matchedKeywordCount: 0
      };
  const verificationIndex = result.findIndex(isDirectTestCandidate);
  if (verificationIndex >= 0) result.splice(verificationIndex, 0, implementationItem);
  else result.push(implementationItem);
  result.push(testItem);
  return uniqueScoredNodes(result).slice(0, limit);
}

function implementationVariantFamilyEvidence(leftPath: string, rightPath: string): number {
  const normalizedLeft = leftPath.replaceAll("\\", "/").toLowerCase();
  const normalizedRight = rightPath.replaceAll("\\", "/").toLowerCase();
  if (path.posix.dirname(normalizedLeft) !== path.posix.dirname(normalizedRight)) return 0;
  const left = canonicalModuleStem(normalizedLeft).split(/[_-]+/).filter(Boolean);
  const right = canonicalModuleStem(normalizedRight).split(/[_-]+/).filter(Boolean);
  let sharedSuffix = 0;
  while (
    sharedSuffix < left.length
    && sharedSuffix < right.length
    && left[left.length - sharedSuffix - 1] === right[right.length - sharedSuffix - 1]
  ) sharedSuffix += 1;
  if (sharedSuffix < 2 || Math.abs(left.length - right.length) > 2) return 0;
  return Math.min(1, sharedSuffix / Math.min(left.length, right.length));
}

function physicalEvidenceNodesBySource(nodes: PalaceNode[]): Map<string, PalaceNode> {
  const bySource = new Map<string, PalaceNode>();
  for (const node of nodes) {
    if (node.startLine || node.kind === "directory") continue;
    const current = bySource.get(node.sourcePath);
    if (!current || conventionalPhysicalNodePriority(node) > conventionalPhysicalNodePriority(current)) {
      bySource.set(node.sourcePath, node);
    }
  }
  return bySource;
}

function strongestScoredNodeBySource(scored: ScoredNode[]): Map<string, ScoredNode> {
  const bySource = new Map<string, ScoredNode>();
  for (const item of scored) {
    const current = bySource.get(item.node.sourcePath);
    if (!current || item.score > current.score) bySource.set(item.node.sourcePath, item);
  }
  return bySource;
}

function ensureAdditiveApiCompanionEvidence(
  selected: ScoredNode[],
  scored: ScoredNode[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType,
  limit: number
): ScoredNode[] {
  if (
    taskType !== "feature"
    || !/\b(?:argument|flag|option|parameter|property)\b/i.test(analysis.raw)
    || !analysis.identifiers.some((identifier) =>
      /[_$]/.test(identifier) || /[a-z0-9][A-Z]/.test(identifier)
    )
  ) return selected;

  const result = uniqueScoredNodes(selected).slice(0, limit);
  if (!result.some(isDirectTestCandidate)) return result;
  const runtimeEntries = result
    .filter((item) => isImplementationCandidate(item.node))
    .filter((item) => !isTypeDeclarationPath(item.node.sourcePath))
    .filter((item) => conventionalImplementationEntryRank(item.node.sourcePath) > 0);
  if (runtimeEntries.length !== 1) return result;

  const runtime = runtimeEntries[0];
  const runtimeScope = coreOwnershipScope(runtime.node.sourcePath);
  const runtimeStem = externalContractStem(runtime.node.sourcePath);
  const selectedPaths = new Set(result.map((item) => item.node.sourcePath));
  const scoredBySource = new Map<string, ScoredNode>();
  for (const item of scored) {
    const current = scoredBySource.get(item.node.sourcePath);
    if (!current || item.score > current.score) scoredBySource.set(item.node.sourcePath, item);
  }
  const physicalBySource = new Map<string, PalaceNode>();
  for (const node of nodes) {
    if (node.startLine || node.kind === "directory") continue;
    const current = physicalBySource.get(node.sourcePath);
    if (!current || conventionalPhysicalNodePriority(node) > conventionalPhysicalNodePriority(current)) {
      physicalBySource.set(node.sourcePath, node);
    }
  }
  const companionItem = (node: PalaceNode, reason: string): ScoredNode => {
    const existing = scoredBySource.get(node.sourcePath);
    return existing
      ? { ...existing, reasons: [reason, ...existing.reasons] }
      : { node, score: 20, reasons: [reason], matchedKeywordCount: 0 };
  };
  const declaration = [...physicalBySource.values()]
    .filter((node) => !selectedPaths.has(node.sourcePath))
    .filter((node) => nodeEvidenceScope(node) === "product")
    .filter((node) => nodeHasEvidenceRole(node, "implementation"))
    .filter((node) => isTypeDeclarationPath(node.sourcePath))
    .filter((node) => coreOwnershipScope(node.sourcePath) === runtimeScope)
    .filter((node) => externalContractStem(node.sourcePath) === runtimeStem)
    .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath))[0];
  const documentation = [...physicalBySource.values()]
    .filter((node) => !selectedPaths.has(node.sourcePath))
    .filter((node) => nodeHasEvidenceRole(node, "documentation"))
    .filter((node) => coreOwnershipScope(node.sourcePath) === runtimeScope)
    .filter((node) => /(^|\/)readme(?:\.[^/]+)?$/i.test(node.sourcePath))
    .sort((left, right) => left.sourcePath.split("/").length - right.sourcePath.split("/").length
      || left.sourcePath.localeCompare(right.sourcePath))[0];

  const additions = [
    ...(declaration
      ? [companionItem(declaration, "bounded public type-declaration companion for an additive option")]
      : []),
    ...(documentation
      ? [companionItem(documentation, "bounded public documentation companion for an additive option")]
      : [])
  ];
  if (!additions.length) return result;
  const runtimeIndex = result.findIndex((item) => item.node.sourcePath === runtime.node.sourcePath);
  return [
    ...result.slice(0, runtimeIndex + 1),
    ...additions,
    ...result.slice(runtimeIndex + 1)
  ].slice(0, limit);
}

function externalContractStem(sourcePath: string): string {
  return path.posix.basename(sourcePath.replaceAll("\\", "/"))
    .toLowerCase()
    .replace(/\.d\.(?:cts|mts|ts)$/, "")
    .replace(/\.(?:c|cc|cpp|cs|go|java|js|jsx|kt|mjs|php|py|pyi|rb|rs|swift|ts|tsx)$/, "");
}

function ensurePlatformFamilyVerification(
  selected: ScoredNode[],
  scored: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  limit: number
): ScoredNode[] {
  if (!/\b(?:apple|ios|tvos|vision\s*os|visionos|watchos)\b/i.test(analysis.raw)) {
    return selected;
  }
  const result = uniqueScoredNodes(selected).slice(0, limit);
  if (!result.some((item) => isImplementationCandidate(item.node))) return result;
  const selectedPaths = new Set(result.map((item) => item.node.sourcePath));
  const selectedTests = result.filter(isDirectTestCandidate);
  if (selectedTests.length >= 2 || result.length >= limit) return result;
  const selectedFacets = new Set(
    selectedTests
      .map((item) => runtimeVerificationFacet(item.node.sourcePath))
      .filter((facet): facet is string => Boolean(facet))
  );
  const candidate = bestPhysicalEvidenceCandidates(
    scored.filter((item) =>
      isDirectTestCandidate(item)
      && !selectedPaths.has(item.node.sourcePath)
    ),
    analysis,
    "test"
  )
    .filter((item) => item.taskCoverage.size > 0)
    .sort((left, right) => {
      const leftFacet = runtimeVerificationFacet(left.item.node.sourcePath);
      const rightFacet = runtimeVerificationFacet(right.item.node.sourcePath);
      return Number(Boolean(rightFacet && !selectedFacets.has(rightFacet)))
        - Number(Boolean(leftFacet && !selectedFacets.has(leftFacet)))
        || right.directEvidence - left.directEvidence
        || left.item.node.sourcePath.localeCompare(right.item.node.sourcePath);
    })[0];
  if (!candidate) return result;
  return [
    ...result,
    {
      ...candidate.item,
      reasons: [
        "bounded distinct verification surface for a platform-family change",
        ...candidate.item.reasons
      ]
    }
  ];
}

function ensureRoleAwareAuxiliaryEvidence(
  selected: ScoredNode[],
  scored: ScoredNode[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  requested: RouteSurface[],
  taskType: TaskType,
  limit: number
): ScoredNode[] {
  const result = selected
    .filter(
      (item, index, items) => items.findIndex(
        (candidate) => candidate.node.sourcePath === item.node.sourcePath
      ) === index
    )
    .slice(0, limit);
  if (
    taskType !== "feature"
    || !result.some((item) => isImplementationCandidate(item.node))
    || !result.some(isDirectTestCandidate)
  ) return result;

  const selectedPaths = new Set(result.map((item) => item.node.sourcePath));
  const ownershipScopes = new Set(
    result
      .filter((item) => isImplementationCandidate(item.node))
      .map((item) => coreOwnershipScope(item.node.sourcePath))
  );
  const dominantOwnershipScope = ownershipScopes.size === 1
    ? [...ownershipScopes][0]
    : undefined;
  const scoredBySource = new Map<string, ScoredNode>();
  for (const item of scored) {
    const current = scoredBySource.get(item.node.sourcePath);
    if (!current || item.score > current.score) scoredBySource.set(item.node.sourcePath, item);
  }
  const physicalNodes = new Map<string, PalaceNode>();
  for (const node of nodes) {
    const current = physicalNodes.get(node.sourcePath);
    if (
      !current
      || Number(Boolean(current.startLine)) > Number(Boolean(node.startLine))
      || (["config", "doc"].includes(node.kind) && !["config", "doc"].includes(current.kind))
    ) physicalNodes.set(node.sourcePath, node);
  }
  const candidateFor = (node: PalaceNode, reason: string): ScoredNode => {
    const existing = scoredBySource.get(node.sourcePath);
    return existing
      ? { ...existing, reasons: [reason, ...existing.reasons] }
      : {
          node,
          score: 20,
          reasons: [reason],
          matchedKeywordCount: 0
        };
  };
  const ownershipRank = (sourcePath: string): number => {
    const normalized = sourcePath.replaceAll("\\", "/");
    const scope = coreOwnershipScope(normalized);
    if (dominantOwnershipScope && scope === dominantOwnershipScope) return 3;
    if (!normalized.includes("/")) return 2;
    return dominantOwnershipScope === undefined ? 1 : 0;
  };
  const appendBest = (
    predicate: (sourcePath: string) => boolean,
    reason: string
  ): void => {
    if (result.length >= limit) return;
    const best = [...physicalNodes.values()]
      .filter((node) => !selectedPaths.has(node.sourcePath) && predicate(node.sourcePath))
      .map((node) => ({ node, rank: ownershipRank(node.sourcePath) }))
      .filter(({ rank }) => rank > 0)
      .sort((left, right) => right.rank - left.rank
        || left.node.sourcePath.split("/").length - right.node.sourcePath.split("/").length
        || left.node.sourcePath.localeCompare(right.node.sourcePath))[0]?.node;
    if (!best) return;
    result.push(candidateFor(best, reason));
    selectedPaths.add(best.sourcePath);
  };

  const taskOwnerStems = new Set(
    result
      .filter((item) => isImplementationCandidate(item.node))
      .flatMap((item) => [...taskOwnedSymbolStems(item.node, analysis)])
  );
  const genericTaskOwnerImplementation = result
    .filter((item) => isImplementationCandidate(item.node))
    .some((item) =>
      CORE_GENERIC_MODULE_STEMS.has(compactCodeIdentifier(canonicalModuleStem(item.node.sourcePath)))
      && taskOwnedSymbolStems(item.node, analysis).size > 0
    );
  const taskOwnerDocumentation = taskOwnerStems.size
    && (requested.includes("docs") || genericTaskOwnerImplementation)
    ? [...physicalNodes.values()]
        .filter((node) => nodeHasEvidenceRole(node, "documentation"))
        .filter((node) => !isChangelogArtifactPath(node.sourcePath))
        .map((node) => {
          const evidenceStems = [...tokenizeLexical([
            node.sourcePath,
            node.title,
            node.summary
          ].join(" "))]
            .map((token) => compactCodeIdentifier(token))
            .filter((token) => token.length >= 4);
          const ownerMatches = [...taskOwnerStems].filter((ownerStem) =>
            evidenceStems.some((evidenceStem) => ownerStemEquivalent(ownerStem, evidenceStem))
          ).length;
          const scoredCandidate = scoredBySource.get(node.sourcePath);
          return {
            node,
            ownerMatches,
            matchedKeywordCount: scoredCandidate?.matchedKeywordCount ?? 0,
            score: scoredCandidate?.score ?? 0
          };
        })
        .filter(({ ownerMatches }) => ownerMatches > 0)
        .sort((left, right) => right.ownerMatches - left.ownerMatches
          || right.matchedKeywordCount - left.matchedKeywordCount
          || right.score - left.score
          || left.node.sourcePath.split("/").length - right.node.sourcePath.split("/").length
          || left.node.sourcePath.localeCompare(right.node.sourcePath))[0]?.node
    : undefined;
  if (taskOwnerDocumentation) {
    if (!taskRequestsChangelogArtifact(analysis.raw)) {
      for (let index = result.length - 1; index >= 0; index -= 1) {
        if (!isChangelogArtifactPath(result[index].node.sourcePath)) continue;
        selectedPaths.delete(result[index].node.sourcePath);
        result.splice(index, 1);
      }
    }
    if (!selectedPaths.has(taskOwnerDocumentation.sourcePath) && result.length < limit) {
      result.push(candidateFor(
        taskOwnerDocumentation,
        "bounded task-owner documentation for a feature change"
      ));
      selectedPaths.add(taskOwnerDocumentation.sourcePath);
    }
  } else if (!result.some((item) => nodeHasEvidenceRole(item.node, "documentation"))) {
    appendBest(
      isChangelogArtifactPath,
      "bounded project-history evidence for a feature change"
    );
  }
  if (taskRequestsVerificationConfiguration(analysis.raw)) {
    appendBest(
      isVerificationConfigArtifactPath,
      "bounded verification configuration for a feature change"
    );
  }
  return result;
}

function isChangelogArtifactPath(sourcePath: string): boolean {
  return /(^|\/)(?:changes|changelog|history|news)(?:\.[^/]+)?$/i.test(sourcePath);
}

function taskRequestsChangelogArtifact(task: string): boolean {
  return /\b(?:change[ -]?log|changes|history|news)(?:\.[a-z0-9]+)?\b/i.test(task);
}

function isVerificationConfigArtifactPath(sourcePath: string): boolean {
  return /(^|\/)(?:tox\.ini|pytest\.ini|noxfile\.py|jest\.config\.[^/]+|vitest\.config\.[^/]+|playwright\.config\.[^/]+)$/i.test(sourcePath);
}

function taskRequestsVerificationConfiguration(task: string): boolean {
  return /(?:^|[\s`])(?:tox\.ini|pytest\.ini|noxfile\.py|jest\.config\.[^\s`]+|vitest\.config\.[^\s`]+|playwright\.config\.[^\s`]+)/i.test(task)
    || /\b(?:test|testing|verification|verify)\s+(?:runner\s+)?config(?:uration)?\b/i.test(task)
    || /\b(?:tox|pytest|nox|jest|vitest|playwright)\b.{0,32}\b(?:config(?:uration)?|environment|runner|setup)\b/i.test(task)
    || /\b(?:config(?:uration)?|environment|runner|setup)\b.{0,32}\b(?:tox|pytest|nox|jest|vitest|playwright)\b/i.test(task)
    || /(?:测试|測試|验证|驗證).{0,12}(?:配置|設定|设置|環境|环境)|(?:配置|設定|设置|環境|环境).{0,12}(?:测试|測試|验证|驗證)/.test(task);
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
  taskAlignedSymbolTestEvidence: number;
  targetIdentityCoverage: number;
  exactImplementationTargetEvidence: number;
  pairEvidence: number;
  moduleMirrorEvidence: number;
  ownerLocalEvidence: number;
  ownerLocalAlternativeAvailable: boolean;
  subjectOwnerEvidence: number;
  generatedArtifactPairEvidence: number;
  structuralEvidence: number;
  workspaceEvidence: number;
  sharedLeadingEntityCoverage: Set<string>;
  taskCoverage: Set<string>;
  entityCoverage: Set<string>;
  totalEvidence: number;
};

type CoreRouteSelection = {
  route: ScoredNode[];
  confidenceCap: number;
  causalClosed?: boolean;
};

type CoreScopeHypothesis = {
  scope: string;
  implementations: CoreEvidenceCandidate[];
  tests: CoreEvidenceCandidate[];
  score: number;
  connectedEvidenceCount: number;
  crossSurfaceTaskCoverage: number;
  targetIdentityCoverage: number;
};

type CoreSourceRelations = {
  direct: Map<string, number>;
  directCounts: Map<string, number>;
  all: Map<string, number>;
  taskAlignedSymbolTests: Set<string>;
  directDependencies: Set<string>;
  directImports: Set<string>;
  importReachability: Map<string, { strength: number; hops: number }>;
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
  "name",
  "node",
  "order",
  "output",
  "request",
  "value"
]);

const CORE_DIAGNOSTIC_BEHAVIOR = new Set([
  "empty",
  "error",
  "fail",
  "invalid",
  "missing",
  "panic",
  "unexpected"
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

const CORE_GENERIC_MODULE_STEMS = new Set([
  "base",
  "common",
  "config",
  "constants",
  "fixture",
  "fixtures",
  "helper",
  "helpers",
  "index",
  "lib",
  "main",
  "mod",
  "types",
  "util",
  "utils"
]);

const CORE_RELATION_TYPES = new Set([
  "changed_with",
  "depends_on",
  "imports",
  "tested_by",
  "tests"
]);

const CORE_TRANSITIVE_IMPACT_RELATION_THRESHOLD = 0.7;

const CORE_WORKSPACE_SOURCE_ROOTS = new Set([
  "app",
  "benches",
  "examples",
  "lib",
  "src",
  "test",
  "tests"
]);

const CORE_LOCALE_ALIASES = new Map<string, string>([
  ["arabic", "ar"],
  ["chinese", "zh"],
  ["dutch", "nl"],
  ["english", "en"],
  ["french", "fr"],
  ["german", "de"],
  ["hindi", "hi"],
  ["italian", "it"],
  ["japanese", "ja"],
  ["korean", "ko"],
  ["polish", "pl"],
  ["portuguese", "pt"],
  ["russian", "ru"],
  ["spanish", "es"],
  ["turkish", "tr"],
  ["ukrainian", "uk"]
]);

const CORE_LOCALE_CODES = new Set([
  ...CORE_LOCALE_ALIASES.values(),
  "pt-br",
  "zh-cn",
  "zh-tw"
]);

function ensureTaskOwnerVerificationClosure(
  selected: ScoredNode[],
  scored: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  limit: number
): ScoredNode[] {
  const implementations = selected.filter((item) => isImplementationCandidate(item.node));
  const selectedTests = selected.filter(isDirectTestCandidate);
  if (!implementations.length) return selected;

  if (!selectedTests.length && selected.length < limit) {
    const selectedPaths = new Set(selected.map((item) => item.node.sourcePath));
    const packageBoundaryPaths = implementations
      .map((item) => item.node.sourcePath)
      .filter(isCorePackageBoundaryPath);
    const physicalTestsBySource = new Map<string, PalaceNode>();
    for (const node of nodes) {
      if (
        node.startLine
        || selectedPaths.has(node.sourcePath)
        || nodeEvidenceScope(node) !== "product"
        || !nodeHasEvidenceRole(node, "verification")
        || !packageBoundaryPaths.some(
          (sourcePath) => packageRootIntegrationTestEvidence(sourcePath, node.sourcePath) >= 0.75
        )
      ) continue;
      physicalTestsBySource.set(node.sourcePath, node);
    }

    if (physicalTestsBySource.size === 1) {
      const [sourcePath, node] = [...physicalTestsBySource.entries()][0];
      const scoredCandidate = scored
        .filter((item) => item.node.sourcePath === sourcePath)
        .sort((left, right) => right.score - left.score)[0];
      return [...selected, {
        node,
        score: Math.max(20, scoredCandidate?.score ?? 0),
        reasons: [
          "conventional package-root integration verification closure",
          ...(scoredCandidate?.reasons ?? [])
        ],
        matchedKeywordCount: scoredCandidate?.matchedKeywordCount ?? 0
      }];
    }
  }

  const subjectTokens = coreSubjectTokens(analysis);
  const primaryTokens = corePrimaryTaskTokens(analysis);
  const explicitDottedOwnerModules = new Set(
    analysis.identifiers
      .filter((identifier) => /[.:]/.test(identifier))
      .map((identifier) => compactCodeIdentifier(identifier.split(/[.:]/)[0] ?? ""))
      .filter(Boolean)
  );
  const implementationProfiles = implementations
    .map((implementation) => {
      const profile = coreEvidenceProfile(implementation, analysis, "implementation");
      const routeIndex = selected.findIndex((item) => item.node.id === implementation.node.id);
      const subjectOwnerEvidence = coreSubjectOwnerEvidence(implementation, analysis);
      const symbolOwnerEvidence = taskOwnedSymbolStems(implementation.node, analysis).size;
      const leadingIdentityEvidence = coreExactLeadingCodeIdentityEvidence(implementation, analysis);
      const explicitOwnerModuleEvidence = Number(explicitDottedOwnerModules.has(
        compactCodeIdentifier(canonicalModuleStem(implementation.node.sourcePath))
      ));
      const subjectCoverage = intersection(profile.taskCoverage, subjectTokens).size;
      const primaryCoverage = intersection(profile.taskCoverage, primaryTokens).size;
      const relevance = leadingIdentityEvidence * 1200
        + explicitOwnerModuleEvidence * 1200
        + subjectOwnerEvidence * 800
        + profile.entityCoverage.size * 600
        + symbolOwnerEvidence * 700
        + primaryCoverage * 180
        + Math.min(profile.directEvidence, 1200) * 0.1
        + Math.max(0, 8 - routeIndex) * 80;
      return {
        implementation,
        profile,
        routeIndex,
        subjectOwnerEvidence,
        symbolOwnerEvidence,
        leadingIdentityEvidence,
        explicitOwnerModuleEvidence,
        subjectCoverage,
        relevance
      };
    })
    .filter(({ profile, routeIndex, subjectOwnerEvidence, symbolOwnerEvidence, subjectCoverage }) =>
      subjectOwnerEvidence > 0
      || profile.entityCoverage.size > 0
      || symbolOwnerEvidence > 0
      || (routeIndex === 0 && subjectCoverage > 0 && profile.directEvidence >= 100)
    );
  if (!implementationProfiles.length) return selected;

  const selectedPaths = new Set(selected.map((item) => item.node.sourcePath));
  const testCandidates = bestPhysicalEvidenceCandidates(
    scored.filter((item) =>
      nodeHasEvidenceRole(item.node, "verification")
      && nodeEvidenceScope(item.node) === "product"
      && isDirectTestCandidate(item)
    ),
    analysis,
    "test"
  ).filter((candidate) => !selectedPaths.has(candidate.item.node.sourcePath));
  if (!testCandidates.length) return selected;
  const relevantSources = new Set([
    ...implementations.map((item) => item.node.sourcePath),
    ...selectedTests.map((item) => item.node.sourcePath),
    ...testCandidates.map((candidate) => candidate.item.node.sourcePath)
  ]);
  const sourceRelations = buildSourceRelations(edges, nodes, relevantSources, analysis);
  const memberIntent = additiveMemberIntent(analysis);

  const missingOwnerClosures = implementationProfiles.flatMap((profile) => {
    const alreadyClosed = selectedTests.some((test) => {
      const testProfile = coreEvidenceProfile(test, analysis, "test");
      const directRelationEvidence = sourceRelations.direct.get(sourceRelationKey(
        profile.implementation.node.sourcePath,
        test.node.sourcePath
      )) ?? 0;
      const directCausalCoverage = directRelationEvidence >= 0.75
        && (
          intersection(testProfile.taskCoverage, profile.profile.taskCoverage).size > 0
          || intersection(testProfile.taskCoverage, subjectTokens).size > 0
        );
      const publicApiIntegration = memberIntent
        ? candidateIsPublicApiIntegrationTest({
            item: test,
            directEvidence: testProfile.directEvidence,
            relationEvidence: directRelationEvidence,
            pairEvidence: 0,
            totalEvidence: testProfile.directEvidence + directRelationEvidence * 500,
            taskCoverage: testProfile.taskCoverage,
            entityCoverage: testProfile.entityCoverage
          }, memberIntent) > 0
        : false;
      return taskOwnerVerificationEvidence(
        profile.implementation.node,
        test.node.sourcePath,
        analysis
      ) >= 0.75
        || directCausalCoverage
        || publicApiIntegration;
    });
    if (alreadyClosed) return [];

    return testCandidates.flatMap((test) => {
      const ownerEvidence = taskOwnerVerificationEvidence(
        profile.implementation.node,
        test.item.node.sourcePath,
        analysis
      );
      if (ownerEvidence < 0.75) return [];
      const testSubjectCoverage = intersection(test.taskCoverage, subjectTokens).size;
      return [{
        profile,
        test,
        ownerEvidence,
        value: profile.relevance
          + ownerEvidence * 800
          + testSubjectCoverage * 120
          + Math.min(test.directEvidence, 1200) * 0.2
      }];
    });
  }).sort((left, right) => right.value - left.value
    || right.ownerEvidence - left.ownerEvidence
    || right.test.directEvidence - left.test.directEvidence
    || left.profile.routeIndex - right.profile.routeIndex
    || left.test.item.node.sourcePath.localeCompare(right.test.item.node.sourcePath));
  const winner = missingOwnerClosures[0];
  if (!winner) return selected;
  const leadingOwnerAlreadyClosed = implementationProfiles.some((profile) =>
    (profile.leadingIdentityEvidence > 0 || profile.explicitOwnerModuleEvidence > 0)
    && selectedTests.some((test) => taskOwnerVerificationEvidence(
      profile.implementation.node,
      test.node.sourcePath,
      analysis
    ) >= 0.75)
  );
  if (
    leadingOwnerAlreadyClosed
    && winner.profile.leadingIdentityEvidence === 0
    && winner.profile.explicitOwnerModuleEvidence === 0
  ) {
    return selected;
  }

  const closureItem: ScoredNode = {
    ...winner.test.item,
    reasons: [
      `owner-local verification closure for ${winner.profile.implementation.node.sourcePath}`,
      ...winner.test.item.reasons
    ]
  };
  const victim = selectedTests.length ? selectedTests
    .map((test) => {
      const testProfile = coreEvidenceProfile(test, analysis, "test");
      const value = Math.max(0, ...implementationProfiles.map((profile) => {
        const ownerEvidence = taskOwnerVerificationEvidence(
          profile.implementation.node,
          test.node.sourcePath,
          analysis
        );
        return ownerEvidence >= 0.75
          ? profile.relevance
            + ownerEvidence * 800
            + intersection(testProfile.taskCoverage, subjectTokens).size * 120
            + Math.min(testProfile.directEvidence, 1200) * 0.2
          : 0;
      }));
      return { test, value };
    })
    .sort((left, right) => left.value - right.value
      || left.test.score - right.test.score
      || right.test.node.sourcePath.localeCompare(left.test.node.sourcePath))[0] : undefined;
  if (victim && winner.value > victim.value + 100) {
    return selected.map((item) =>
      item.node.sourcePath === victim.test.node.sourcePath ? closureItem : item
    );
  }
  if (selected.length < limit) return [...selected, closureItem];

  return selected;
}

function selectEvidenceSufficientCoreRoute(
  scored: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType,
  requested: RouteSurface[],
  intent: TaskIntent,
  limit: number
): CoreRouteSelection | undefined {
  if (!(isCodeTaskType(taskType) || taskType === "unknown") || requested.length > 1) return undefined;
  if (analysis.wingHints.includes("frontend") && analysis.wingHints.includes("backend")) return undefined;
  if (!intent.preferredScopes.includes("product")) return undefined;

  const coreScored = augmentCoreCausalCandidates(scored, edges, nodes, analysis);

  const implementationPool = bestPhysicalEvidenceCandidates(
    coreScored.filter(
      (item) =>
        nodeHasEvidenceRole(item.node, "implementation")
        && nodeEvidenceScope(item.node) === "product"
        && !isOperationalMetadataPath(item.node.sourcePath)
    ),
    analysis,
    "implementation"
  ).slice(0, 64);
  if (!implementationPool.length || implementationPool[0].directEvidence < 100) return undefined;

  const testPool = bestPhysicalEvidenceCandidates(
    coreScored.filter(
      (item) =>
        nodeHasEvidenceRole(item.node, "verification")
        && nodeEvidenceScope(item.node) === "product"
        && !isOperationalMetadataPath(item.node.sourcePath)
    ),
    analysis,
    "test"
  ).slice(0, 64);
  const packageBoundaryPool = bestPhysicalEvidenceCandidates(
    coreScored.filter(
      (item) => isImplementationCandidate(item.node)
        && isCorePackageBoundaryPath(item.node.sourcePath)
    ),
    analysis,
    "implementation"
  );
  const executableTestPool = testPool.filter((candidate) => isDirectTestCandidate(candidate.item));
  const scopeTestPool = executableTestPool.length ? executableTestPool : testPool;
  const relevantSources = new Set(
    [...implementationPool, ...testPool, ...packageBoundaryPool]
      .map((candidate) => candidate.item.node.sourcePath)
  );
  const sourceRelations = buildSourceRelations(edges, nodes, relevantSources, analysis);
  const scopeHypothesis = selectCoreScopeHypothesis(
    implementationPool,
    scopeTestPool,
    sourceRelations,
    analysis
  );
  const implementationCandidates = (scopeHypothesis
    ? implementationPool.filter(
      (candidate) => coreWorkspaceScope(candidate.item.node.sourcePath) === scopeHypothesis.scope
    )
    : implementationPool
  ).slice(0, 20);
  const testCandidates = (scopeHypothesis
    ? testPool.filter(
      (candidate) => coreWorkspaceScope(candidate.item.node.sourcePath) === scopeHypothesis.scope
    )
    : testPool
  ).slice(0, 64);
  const executableTestCandidates = testCandidates.filter(
    (candidate) => isDirectTestCandidate(candidate.item)
  );
  const anchorTestCandidates = executableTestCandidates.length
    ? executableTestCandidates
    : testCandidates;
  const candidateImplementationPaths = new Set(
    implementationCandidates.map((candidate) => candidate.item.node.sourcePath)
  );
  const hasCommonCallerBridgeCandidate = implementationCandidates.some((candidate) =>
    [...candidateImplementationPaths].filter(
      (targetPath) => targetPath !== candidate.item.node.sourcePath
        && sourceRelations.directDependencies.has(directedSourceRelationKey(
          candidate.item.node.sourcePath,
          targetPath
        ))
    ).length >= 2
  );
  const missingMemberOwnerBoundary = selectMissingMemberOwnerRoute(
    implementationCandidates,
    anchorTestCandidates,
    sourceRelations,
    analysis,
    taskType,
    limit
  );
  if (missingMemberOwnerBoundary) return missingMemberOwnerBoundary;
  const explicitMemberBoundary = selectExplicitMemberBoundaryRoute(
    implementationCandidates,
    anchorTestCandidates,
    analysis,
    limit
  );
  if (explicitMemberBoundary) return explicitMemberBoundary;
  const hasLeadingExplicitIdentifier = coreLeadingExplicitIdentifierCompacts(analysis).size > 0;
  const requestedLocaleScopes = coreRequestedLocaleScopes(analysis);
  const preferDiagnosticTaskNamedPair = taskType === "feature"
    && intersection(corePrimaryTaskTokens(analysis), CORE_DIAGNOSTIC_BEHAVIOR).size > 0;
  const pairs = implementationCandidates.flatMap((implementation) =>
    anchorTestCandidates.map((test) => buildCoreEvidencePair(
      implementation,
      test,
      implementationCandidates,
      testCandidates,
      sourceRelations,
      analysis
    ))
  ).filter(
    (pair) => pair.implementation.directEvidence >= 100
      && (
        pair.test.directEvidence >= 100
        || pair.moduleMirrorEvidence >= 0.75
        || pair.ownerLocalEvidence >= 0.75
        || (pair.relationEvidence >= 0.6 && pair.test.taskCoverage.size >= 2)
      )
      && (
        pair.relationEvidence >= 0.6
        || pair.pairEvidence >= 1
        || pair.structuralEvidence >= 0.75
        || pair.taskCoverage.size >= 3
        || pair.entityCoverage.size > 0
      )
  ).sort((left, right) => {
    const explicitIdentityDifference = coreExplicitIdentifierImplementationEvidence(
      right.implementation.item,
      analysis
    ) - coreExplicitIdentifierImplementationEvidence(
      left.implementation.item,
      analysis
    );
    if (explicitIdentityDifference) return explicitIdentityDifference;
    const exactLeadingTargetDifference = hasLeadingExplicitIdentifier
      ? right.exactImplementationTargetEvidence - left.exactImplementationTargetEvidence
      : 0;
    if (exactLeadingTargetDifference) return exactLeadingTargetDifference;
    const taskNamedImplementationDifference = requestedLocaleScopes.size > 0
      || !preferDiagnosticTaskNamedPair
      ? 0
      : Number(
          isDiscriminativeTaskNamedModule(right.implementation.item.node.sourcePath, analysis.raw)
        ) - Number(
          isDiscriminativeTaskNamedModule(left.implementation.item.node.sourcePath, analysis.raw)
        );
    if (taskNamedImplementationDifference) return taskNamedImplementationDifference;
    const exactIdentityTestDifference = preferDiagnosticTaskNamedPair
      && (
        isDiscriminativeTaskNamedModule(right.implementation.item.node.sourcePath, analysis.raw)
        || isDiscriminativeTaskNamedModule(left.implementation.item.node.sourcePath, analysis.raw)
      )
      ? coreExactExplicitIdentityTestEvidence(
          right.test.item,
          analysis
        ) - coreExactExplicitIdentityTestEvidence(
          left.test.item,
          analysis
        )
      : 0;
    if (exactIdentityTestDifference) return exactIdentityTestDifference;
    const rightTaskNamedModulePair = moduleStemAppearsInTask(
      right.implementation.item.node.sourcePath,
      analysis.raw
    ) && right.moduleMirrorEvidence >= 0.75;
    const leftTaskNamedModulePair = moduleStemAppearsInTask(
      left.implementation.item.node.sourcePath,
      analysis.raw
    ) && left.moduleMirrorEvidence >= 0.75;
    const taskNamedModuleDifference = Number(
      rightTaskNamedModulePair
    ) - Number(leftTaskNamedModulePair);
    if (taskNamedModuleDifference) return taskNamedModuleDifference;
    const taskNamedModulePositionDifference = (
      leftTaskNamedModulePair
        ? moduleStemTaskPosition(left.implementation.item.node.sourcePath, analysis.raw)
        : Number.MAX_SAFE_INTEGER
    ) - (
      rightTaskNamedModulePair
        ? moduleStemTaskPosition(right.implementation.item.node.sourcePath, analysis.raw)
        : Number.MAX_SAFE_INTEGER
    );
    if (taskNamedModulePositionDifference) return taskNamedModulePositionDifference;
    const closePair = Math.abs(right.totalEvidence - left.totalEvidence)
      / Math.max(right.totalEvidence, left.totalEvidence, 1) < 0.08;
    if (closePair) {
      const implementationCoverage = right.implementation.taskCoverage.size
        - left.implementation.taskCoverage.size;
      if (implementationCoverage) return implementationCoverage;
    }
    return right.totalEvidence - left.totalEvidence
      || right.workspaceEvidence - left.workspaceEvidence
      || right.sharedLeadingEntityCoverage.size - left.sharedLeadingEntityCoverage.size
      || right.relationEvidence - left.relationEvidence
      || right.implementation.item.score - left.implementation.item.score
      || left.implementation.item.node.sourcePath.localeCompare(right.implementation.item.node.sourcePath);
  });
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
  const anchorExplicitIdentityCoverage = coreExplicitPathIdentityCoverage(
    anchor.implementation.item.node.sourcePath,
    analysis
  );
  const competitorExplicitIdentityCoverage = competitor
    ? coreExplicitPathIdentityCoverage(competitor.implementation.item.node.sourcePath, analysis)
    : 0;
  const anchorLocaleScope = corePathLocaleScope(anchor.implementation.item.node.sourcePath);
  const competitorLocaleScope = competitor
    ? corePathLocaleScope(competitor.implementation.item.node.sourcePath)
    : undefined;
  const anchorLocaleIdentity = anchorLocaleScope !== undefined
    && requestedLocaleScopes.has(anchorLocaleScope);
  const competitorLocaleIdentity = competitorLocaleScope !== undefined
    && requestedLocaleScopes.has(competitorLocaleScope);
  const anchorHasDirectIdentity = anchor.relationEvidence >= 0.75
    || anchor.structuralEvidence >= 0.75
    || anchorLocaleIdentity
    || anchor.entityCoverage.size > 0
    || (anchor.taskCoverage.size >= 3 && anchor.pairEvidence >= 1)
    || (anchor.taskCoverage.size >= 2 && anchor.pairEvidence >= 1 && implementationMargin >= 0.15);
  const competitorComplementsImplementation = competitor !== undefined
    && sourcePathFamilyEvidence(
      anchor.implementation.item.node.sourcePath,
      competitor.implementation.item.node.sourcePath
    ) >= 0.5
    && setDifference(competitor.implementation.entityCoverage, anchor.implementation.entityCoverage).size > 0;
  const competitorIsScopedCausalPeer = scopeHypothesis !== undefined
    && competitor !== undefined
    && coreWorkspaceScope(competitor.implementation.item.node.sourcePath) === scopeHypothesis.scope
    && strongestRelationTo(
      anchor.implementation.item.node.sourcePath,
      new Set([competitor.implementation.item.node.sourcePath]),
      sourceRelations
    ) >= 0.6
    && intersection(
      anchor.implementation.taskCoverage,
      competitor!.implementation.taskCoverage
    ).size > 0;
  const anchorBeatsCompetingConcepts = !competitor
    || margin >= 0.08
    || implementationMargin >= 0.15
    || anchorImplementationPrimaryCoverage > competitorImplementationPrimaryCoverage
    || anchorExplicitIdentityCoverage > competitorExplicitIdentityCoverage
    || (anchorLocaleIdentity && !competitorLocaleIdentity)
    || anchor.taskCoverage.size > competitor.taskCoverage.size
    || anchor.entityCoverage.size > competitor.entityCoverage.size
    || anchor.workspaceEvidence > competitor.workspaceEvidence
    || anchor.sharedLeadingEntityCoverage.size > competitor.sharedLeadingEntityCoverage.size
    || anchor.structuralEvidence > competitor.structuralEvidence
    || anchor.taskAlignedSymbolTestEvidence > competitor.taskAlignedSymbolTestEvidence
    || anchor.exactImplementationTargetEvidence > competitor.exactImplementationTargetEvidence
    || competitorComplementsImplementation
    || competitorIsScopedCausalPeer;
  if (!anchorHasDirectIdentity) return undefined;
  if (!anchorBeatsCompetingConcepts) {
    if (
      anchor.ownerLocalEvidence < 0.75
      || anchor.relationEvidence < 0.75
      || limit < 4
    ) return undefined;
    const competingOwnerPairs: CoreEvidencePair[] = [];
    const representedImplementations = new Set<string>();
    for (const pair of pairs) {
      const implementationPath = pair.implementation.item.node.sourcePath;
      if (representedImplementations.has(implementationPath)) continue;
      const sharedTaskIdentity = anchor.entityCoverage.size > 0
        ? intersection(pair.entityCoverage, anchor.entityCoverage).size > 0
        : intersection(pair.taskCoverage, anchor.taskCoverage).size >= 2;
      if (
        pair.ownerLocalEvidence < 0.75
        || pair.relationEvidence < 0.75
        || pair.totalEvidence < anchor.totalEvidence * 0.8
        || !sharedTaskIdentity
      ) continue;
      representedImplementations.add(implementationPath);
      competingOwnerPairs.push(pair);
    }
    if (competingOwnerPairs.length !== 2) return undefined;
    const route = [
      ...competingOwnerPairs.map((pair) => pair.implementation.item),
      ...competingOwnerPairs.map((pair) => pair.test.item)
    ].filter((item, index, items) =>
      items.findIndex((candidate) => candidate.node.sourcePath === item.node.sourcePath) === index
    );
    return {
      route,
      confidenceCap: 0.4,
      causalClosed: true
    };
  }

  const anchorClosure = evaluateEvidenceClosure({
    intent,
    selectedNodes: [anchor.implementation.item.node, anchor.test.item.node],
    selectedFacts: [anchor.implementation.item.matchedFact, anchor.test.item.matchedFact]
      .filter((fact): fact is PalaceEvidenceFact => Boolean(fact)),
    allNodes: nodes,
    edges
  });
  const stopAtMinimumEvidenceClosure = anchorClosure.status === "sufficient";

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
  const anchorWorkspaceScope = coreWorkspaceScope(anchor.implementation.item.node.sourcePath);
  const anchorVersionScope = corePathVersionScope(anchor.implementation.item.node.sourcePath)
    ?? corePathVersionScope(anchor.test.item.node.sourcePath);
  const taskAnchoredPackageBoundary = moduleStemAppearsInTask(
    anchor.implementation.item.node.sourcePath,
    analysis.raw
  )
    ? packageBoundaryPool
        .filter((candidate) => candidate.item.node.sourcePath !== anchor.implementation.item.node.sourcePath)
        .filter(
          (candidate) => coreWorkspaceScope(candidate.item.node.sourcePath) === anchorWorkspaceScope
        )
        .map((candidate) => ({
          candidate,
          relationEvidence: strongestRelationTo(
            candidate.item.node.sourcePath,
            new Set([anchor.implementation.item.node.sourcePath]),
            sourceRelations
          )
        }))
        .filter(({ relationEvidence }) => relationEvidence >= 0.75)
        .sort((left, right) => right.relationEvidence - left.relationEvidence
          || left.candidate.item.node.sourcePath.localeCompare(right.candidate.item.node.sourcePath))[0]
    : undefined;
  if (taskAnchoredPackageBoundary && implementations.length < Math.max(1, limit - 1)) {
    implementations.push(taskAnchoredPackageBoundary.candidate);
    addAll(coveredImplementationTaskTokens, taskAnchoredPackageBoundary.candidate.taskCoverage);
    addAll(coveredImplementationEntities, taskAnchoredPackageBoundary.candidate.entityCoverage);
  }
  const anchorColocatedTestEvidence = colocatedGenericTestEvidence(
    anchor.implementation.item.node.sourcePath,
    anchor.test.item.node.sourcePath
  );
  const anchorModuleMirrorEvidence = anchor.moduleMirrorEvidence;
  const workspaceRequiresExpansion = anchorWorkspaceScope !== undefined
    && implementationCandidates.some((candidate) =>
      candidate.item.node.sourcePath !== anchor.implementation.item.node.sourcePath
      && coreWorkspaceScope(candidate.item.node.sourcePath) === anchorWorkspaceScope
      && candidate.directEvidence >= Math.max(120, anchor.implementation.directEvidence * 0.35)
      && intersection(candidate.taskCoverage, primaryImplementationTaskTokens).size > 0
    );
  const causalRequiresExpansion = implementationCandidates.some((candidate) =>
    candidate.item.node.sourcePath !== anchor.implementation.item.node.sourcePath
    && strongestRelationTo(
      candidate.item.node.sourcePath,
      new Set([anchor.implementation.item.node.sourcePath]),
      sourceRelations
    ) >= 0.6
    && (
      setDifference(candidate.taskCoverage, anchor.implementation.taskCoverage).size > 0
      || candidate.directEvidence >= anchor.implementation.directEvidence * 0.65
    )
    && candidate.directEvidence >= Math.max(120, anchor.implementation.directEvidence * 0.35)
  );
  const explicitIdentityEntities = coreExplicitEntityValues(analysis);
  const causalImplementationNeighbors = implementationCandidates.filter((candidate) =>
    candidate.item.node.sourcePath !== anchor.implementation.item.node.sourcePath
    && strongestRelationTo(
      candidate.item.node.sourcePath,
      new Set([anchor.implementation.item.node.sourcePath]),
      sourceRelations
    ) >= 0.6
    && candidate.directEvidence >= Math.max(120, anchor.implementation.directEvidence * 0.35)
  );
  const denseCausalNeighborhood = causalImplementationNeighbors.length >= 2;
  const causalSupportRelationThreshold = 0.6;
  const featureIdentityRequiresExpansion = taskType === "feature"
    && causalImplementationNeighbors.some((candidate) =>
      intersection(candidate.entityCoverage, explicitIdentityEntities).size > 0
      && intersection(anchor.implementation.entityCoverage, explicitIdentityEntities).size > 0
    );
  const anchorDirectRelation = sourceRelations.direct.get(sourceRelationKey(
    anchor.implementation.item.node.sourcePath,
    anchor.test.item.node.sourcePath
  )) ?? 0;
  const anchorPrimaryTaskCoverageRatio = primaryImplementationTaskTokens.size
    ? intersection(anchor.taskCoverage, primaryImplementationTaskTokens).size
      / primaryImplementationTaskTokens.size
    : 1;
  const taskAnchoredModulePair = anchorModuleMirrorEvidence >= 0.75
    && moduleStemAppearsInTask(anchor.implementation.item.node.sourcePath, analysis.raw)
    && anchorPrimaryTaskCoverageRatio >= 0.60;
  const taskScopedLocalePair = anchorLocaleIdentity
    && intersection(anchor.test.taskCoverage, primaryImplementationTaskTokens).size >= 2;
  const exactPairOverridesExpansion = anchorColocatedTestEvidence >= 1
    || anchor.sharedLeadingEntityCoverage.size > 0
    || taskAnchoredModulePair
    || taskScopedLocalePair
    || anchor.generatedArtifactPairEvidence >= 1;
  const exactStructuralPair = anchorColocatedTestEvidence >= 1
    || anchorModuleMirrorEvidence >= 0.75
    || anchorDirectRelation >= 0.98
    || taskScopedLocalePair
    || anchor.generatedArtifactPairEvidence >= 1;
  const causalImplementationCoverageGap = implementationCandidates.some((candidate) => {
    if (candidate.item.node.sourcePath === anchor.implementation.item.node.sourcePath) return false;
    const candidatePath = candidate.item.node.sourcePath;
    const anchorImplementationPath = anchor.implementation.item.node.sourcePath;
    const anchorTestPath = anchor.test.item.node.sourcePath;
    if (!sameCoreOwnership(candidatePath, anchorImplementationPath)) return false;
    const implementationImportRelation = isDirectImport(candidatePath, anchorImplementationPath, sourceRelations)
      || isDirectImport(anchorImplementationPath, candidatePath, sourceRelations);
    return isDirectImport(anchorTestPath, anchorImplementationPath, sourceRelations)
      && implementationImportRelation
      && isDirectImport(anchorTestPath, candidatePath, sourceRelations);
  });
  const testImpactIdentityTokens = coreExplicitIdentityTokens(analysis);
  const testImpactBehaviorTokens = setDifference(
    primaryImplementationTaskTokens,
    testImpactIdentityTokens
  );
  const hasTaskAlignedImpactEvidence = (candidate: CoreEvidenceCandidate): boolean =>
    testImpactIdentityTokens.size > 0
    && intersection(candidate.taskCoverage, testImpactIdentityTokens).size > 0
    && intersection(candidate.taskCoverage, testImpactBehaviorTokens).size >= 2;
  const hasVersionedDependencyImpactEvidence = (candidate: CoreEvidenceCandidate): boolean =>
    isVersionedDependencyImpactTest(
      candidate.item.node.sourcePath,
      anchor.implementation.item.node.sourcePath,
      nodes,
      sourceRelations,
      analysis.raw
    );
  const causalTestImpactRequiresExpansion = testCandidates.some((candidate) =>
    candidate.item.node.sourcePath !== anchor.test.item.node.sourcePath
    && (
      (
        (transitiveImportEvidence(
          candidate.item.node.sourcePath,
          anchor.implementation.item.node.sourcePath,
          sourceRelations
        )?.strength ?? 0) >= CORE_TRANSITIVE_IMPACT_RELATION_THRESHOLD
        && hasTaskAlignedImpactEvidence(candidate)
        && candidate.directEvidence >= Math.max(80, anchor.test.directEvidence * 0.25)
      )
      || hasVersionedDependencyImpactEvidence(candidate)
    )
  );
  const overrideExactPair = (Boolean(scopeHypothesis) && !exactPairOverridesExpansion)
    || (denseCausalNeighborhood && !exactPairOverridesExpansion)
    || featureIdentityRequiresExpansion
    || causalImplementationCoverageGap
    || causalTestImpactRequiresExpansion
    || hasCommonCallerBridgeCandidate;
  const strongModuleMirrorPair = anchorModuleMirrorEvidence >= 0.75
    && anchor.implementation.directEvidence >= 200
    && anchor.pairEvidence >= 1;
  const generatedArtifactPair = anchor.generatedArtifactPairEvidence >= 1;
  const stopAtStrongModulePair = (
    stopAtMinimumEvidenceClosure
    && !causalImplementationCoverageGap
    && !causalTestImpactRequiresExpansion
    && !hasCommonCallerBridgeCandidate
  ) || (
    (
      anchorColocatedTestEvidence >= 1
      || strongModuleMirrorPair
      || generatedArtifactPair
      || taskAnchoredModulePair
      || taskScopedLocalePair
      || (
        anchor.structuralEvidence >= 0.75
        && anchorExplicitIdentityCoverage > 0
      )
      || (
        anchorExplicitIdentityCoverage > 0
        && anchor.pairEvidence >= 1
        && anchor.entityCoverage.size > 0
      )
      || (
        anchor.sharedLeadingEntityCoverage.size > 0
        && anchor.relationEvidence >= 0.75
      )
    )
      && anchor.implementation.directEvidence >= (generatedArtifactPair ? 100 : strongModuleMirrorPair ? 200 : 300)
      && anchor.test.directEvidence >= (generatedArtifactPair || strongModuleMirrorPair ? 0 : 300)
      && (
        (exactStructuralPair && !overrideExactPair)
        || (!workspaceRequiresExpansion
          && !causalRequiresExpansion
          && !featureIdentityRequiresExpansion
          && !causalImplementationCoverageGap
          && !causalTestImpactRequiresExpansion)
      )
  );
  const stopAtTaskAnchoredPackageBoundary = taskAnchoredPackageBoundary !== undefined
    && anchor.test.taskCoverage.has(canonicalModuleStem(anchor.implementation.item.node.sourcePath))
    && (
      anchor.relationEvidence >= 0.75
      || strongestPairEvidence(anchor.test.item, [anchor.implementation.item]) >= 1
    );
  const diagnosticTaskTokens = intersection(
    primaryImplementationTaskTokens,
    CORE_DIAGNOSTIC_BEHAVIOR
  );
  let stopAtTaskNamedCausalCore = false;
  const implementationLimit = hasCommonCallerBridgeCandidate
    ? Math.min(6, Math.max(1, limit - 1))
    : denseCausalNeighborhood
      ? Math.min(5, Math.max(1, limit - 1))
    : 3;
  while (
    !stopAtStrongModulePair
    && !stopAtTaskAnchoredPackageBoundary
    && implementations.length < implementationLimit
  ) {
    const selectedImplementationPaths = new Set(
      implementations.map((implementation) => implementation.item.node.sourcePath)
    );
    const selectedTestPaths = new Set(tests.map((test) => test.item.node.sourcePath));
    const next = implementationCandidates
      .filter((candidate) => !selectedImplementationPaths.has(candidate.item.node.sourcePath))
      .filter((candidate) => {
        const candidateWorkspaceScope = coreWorkspaceScope(candidate.item.node.sourcePath);
        if (
          anchorWorkspaceScope
          && candidateWorkspaceScope
          && candidateWorkspaceScope !== anchorWorkspaceScope
        ) return false;
        const candidateLocaleScope = corePathLocaleScope(candidate.item.node.sourcePath);
        const localeMatches = !candidateLocaleScope
          || requestedLocaleScopes.size === 0
          || requestedLocaleScopes.has(candidateLocaleScope);
        if (!localeMatches) return false;
        const candidateVersionScope = corePathVersionScope(candidate.item.node.sourcePath);
        return !anchorVersionScope
          || !candidateVersionScope
          || candidateVersionScope === anchorVersionScope
          || hasVersionedDependencyImpactEvidence(candidate);
      })
      .map((candidate) => {
        const newTaskCoverage = setDifference(candidate.taskCoverage, coveredImplementationTaskTokens);
        const newPrimaryTaskCoverage = intersection(newTaskCoverage, primaryImplementationTaskTokens);
        const newEntityCoverage = setDifference(candidate.entityCoverage, coveredImplementationEntities);
        const sharedCompoundIdentityCoverage = intersection(
          intersection(candidate.entityCoverage, coveredImplementationEntities),
          intersection(coveredTestEntities, compoundIdentityEntities)
        );
        const sharedExplicitMemberCoverage = intersection(
          intersection(candidate.entityCoverage, coveredImplementationEntities),
          coreExplicitMemberEntities(analysis.raw)
        );
        const primaryCoverageRatio = explicitPrimaryTaskTokens.size
          ? intersection(candidate.taskCoverage, explicitPrimaryTaskTokens).size
            / explicitPrimaryTaskTokens.size
          : 0;
        const relationToSelectedTests = strongestRelationTo(
          candidate.item.node.sourcePath,
          selectedTestPaths,
          sourceRelations
        );
        const relationToSelectedImplementations = strongestRelationTo(
          candidate.item.node.sourcePath,
          selectedImplementationPaths,
          sourceRelations
        );
        const directDependencyCoverage = [...selectedImplementationPaths].filter(
          (selectedPath) => sourceRelations.directDependencies.has(directedSourceRelationKey(
            candidate.item.node.sourcePath,
            selectedPath
          ))
        ).length;
        const candidateWorkspaceScope = coreWorkspaceScope(candidate.item.node.sourcePath);
        const sameWorkspace = anchorWorkspaceScope !== undefined
          && candidateWorkspaceScope === anchorWorkspaceScope;
        const entityExpansion = newEntityCoverage.size > 0 && candidate.directEvidence >= 180;
        const relatedConceptExpansion = relationToSelectedTests >= 0.9
          && newPrimaryTaskCoverage.size > 0
          && candidate.directEvidence >= Math.max(140, anchor.implementation.directEvidence * 0.4);
        const relatedPeerExpansion = relationToSelectedImplementations >= 0.75
          && (
            newPrimaryTaskCoverage.size > 0
            || newEntityCoverage.size > 0
            || primaryCoverageRatio >= 0.35
          )
          && candidate.directEvidence >= Math.max(120, anchor.implementation.directEvidence * 0.45);
        const denseCausalPeerExpansion = denseCausalNeighborhood
          && relationToSelectedImplementations >= 0.7
          && relationToSelectedTests >= 0.6
          && primaryCoverageRatio >= 0.5
          && candidate.directEvidence >= Math.max(120, anchor.implementation.directEvidence * 0.35);
        const taskNamedCausalPeerExpansion = diagnosticTaskTokens.size > 0
          && isDiscriminativeTaskNamedModule(candidate.item.node.sourcePath, analysis.raw)
          && relationToSelectedImplementations >= 0.6
          && candidate.directEvidence >= Math.max(120, anchor.implementation.directEvidence * 0.35);
        const featureIdentityPeerExpansion = taskType === "feature"
          && relationToSelectedImplementations >= 0.75
          && intersection(candidate.entityCoverage, explicitIdentityEntities).size > 0
          && intersection(anchor.implementation.entityCoverage, explicitIdentityEntities).size > 0
          && candidate.directEvidence >= Math.max(120, anchor.implementation.directEvidence * 0.35);
        const workspaceSiblingExpansion = sameWorkspace
          && primaryCoverageRatio >= 1 / 3
          && candidate.directEvidence >= Math.max(120, anchor.implementation.directEvidence * 0.35);
        const explicitMemberSiblingExpansion = sharedExplicitMemberCoverage.size > 0
          && primaryCoverageRatio >= 0.45
          && candidate.taskCoverage.size >= 3
          && candidate.directEvidence >= Math.max(160, anchor.implementation.directEvidence * 0.5);
        const sharedIdentityExpansion = sourcePathFamilyEvidence(
          anchor.implementation.item.node.sourcePath,
          candidate.item.node.sourcePath
        ) >= 0.5
          && sharedCompoundIdentityCoverage.size > 0
          && candidate.directEvidence >= Math.max(160, anchor.implementation.directEvidence * 0.5);
        const scopedCausalBridgeExpansion = Boolean(scopeHypothesis)
          && sameWorkspace
          && relationToSelectedImplementations >= 0.75
          && relationToSelectedTests >= 0.6
          && candidate.directEvidence > 0;
        const commonCallerBridgeExpansion = directDependencyCoverage >= 2
          && sameCoreOwnership(
            candidate.item.node.sourcePath,
            anchor.implementation.item.node.sourcePath
          );
        const dualLinkedImplementationExpansion = sameCoreOwnership(
          candidate.item.node.sourcePath,
          anchor.implementation.item.node.sourcePath
        )
          && (
            isDirectImport(
              candidate.item.node.sourcePath,
              anchor.implementation.item.node.sourcePath,
              sourceRelations
            )
            || isDirectImport(
              anchor.implementation.item.node.sourcePath,
              candidate.item.node.sourcePath,
              sourceRelations
            )
          )
          && isDirectImport(
            anchor.test.item.node.sourcePath,
            anchor.implementation.item.node.sourcePath,
            sourceRelations
          )
          && isDirectImport(
            anchor.test.item.node.sourcePath,
            candidate.item.node.sourcePath,
            sourceRelations
          );
        const eligible = entityExpansion
          || relatedConceptExpansion
          || relatedPeerExpansion
          || workspaceSiblingExpansion
          || explicitMemberSiblingExpansion
          || sharedIdentityExpansion
          || scopedCausalBridgeExpansion
          || commonCallerBridgeExpansion
          || dualLinkedImplementationExpansion
          || denseCausalPeerExpansion
          || taskNamedCausalPeerExpansion
          || featureIdentityPeerExpansion;
        const utility = newPrimaryTaskCoverage.size * 500
          + newEntityCoverage.size * 420
          + relationToSelectedImplementations * 240
          + relationToSelectedTests * 180
          + (sameWorkspace ? 180 : 0)
          + (scopedCausalBridgeExpansion ? 300 : 0)
          + (commonCallerBridgeExpansion ? 720 : 0)
          + directDependencyCoverage * 260
          + (dualLinkedImplementationExpansion ? 520 : 0)
          + (denseCausalPeerExpansion ? 40 : 0)
          + (taskNamedCausalPeerExpansion ? 900 : 0)
          + (featureIdentityPeerExpansion ? 360 : 0)
          + primaryCoverageRatio * 160
          + candidate.directEvidence * 0.1;
        return { candidate, eligible, utility };
      })
      .filter(({ eligible }) => eligible)
      .sort((left, right) =>
        right.utility - left.utility
        || right.candidate.directEvidence - left.candidate.directEvidence
        || left.candidate.item.node.sourcePath.localeCompare(right.candidate.item.node.sourcePath)
      )[0]?.candidate;
    if (!next) break;
    implementations.push(next);
    addAll(coveredImplementationTaskTokens, next.taskCoverage);
    addAll(coveredImplementationEntities, next.entityCoverage);
    if (hasTaskNamedCausalImplementationClosure(
      implementations,
      anchor.test,
      sourceRelations,
      analysis,
      primaryImplementationTaskTokens
    )) {
      stopAtTaskNamedCausalCore = true;
      break;
    }
  }

  const routedImplementationPaths = new Set(
    implementations.map((implementation) => implementation.item.node.sourcePath)
  );
  const anchorTestRelationCoverage = implementations.filter((implementation) =>
    (sourceRelations.direct.get(sourceRelationKey(
      anchor.test.item.node.sourcePath,
      implementation.item.node.sourcePath
    )) ?? 0) >= 0.75
    || strongestPairEvidence(anchor.test.item, [implementation.item]) >= 1
  ).length;
  const anchorTestImplementationCoverageRatio = coveredImplementationTaskTokens.size
    ? intersection(anchor.test.taskCoverage, coveredImplementationTaskTokens).size
      / coveredImplementationTaskTokens.size
    : 0;
  const causalTestSupportRequiresExpansion = denseCausalNeighborhood
    && testCandidates.some((candidate) =>
      candidate.item.node.sourcePath !== anchor.test.item.node.sourcePath
      && /(?:^|[-_.\/])(mock|mocks|fixture|fixtures|support)(?:[-_.\/]|$)/i.test(candidate.item.node.sourcePath)
      && strongestRelationTo(
        candidate.item.node.sourcePath,
        routedImplementationPaths,
        sourceRelations
      ) >= causalSupportRelationThreshold
      && candidate.directEvidence >= Math.max(100, anchor.test.directEvidence * 0.35)
    );
  const stopAfterCausalMultiImplementationTest = implementations.length >= 2
    && anchorTestRelationCoverage >= Math.ceil(implementations.length * 2 / 3)
    && anchorTestImplementationCoverageRatio >= 0.6
    && anchor.test.directEvidence >= 300
    && !causalTestSupportRequiresExpansion
    && !causalTestImpactRequiresExpansion;

  while (
    !stopAtStrongModulePair
    && !stopAtTaskAnchoredPackageBoundary
    && !stopAtTaskNamedCausalCore
    && !stopAfterCausalMultiImplementationTest
    && tests.length < 3
  ) {
    const anchorTestEvidence = testEvidenceForImplementations(anchor.test, implementations, sourceRelations);
    const rankedTestCandidates = testCandidates
      .filter((candidate) => !tests.some((selected) => selected.item.node.sourcePath === candidate.item.node.sourcePath))
      .filter((candidate) => {
        const candidateWorkspaceScope = coreWorkspaceScope(candidate.item.node.sourcePath);
        if (
          anchorWorkspaceScope
          && candidateWorkspaceScope
          && candidateWorkspaceScope !== anchorWorkspaceScope
        ) return false;
        const candidateLocaleScope = corePathLocaleScope(candidate.item.node.sourcePath);
        const localeMatches = !candidateLocaleScope
          || requestedLocaleScopes.size === 0
          || requestedLocaleScopes.has(candidateLocaleScope);
        if (!localeMatches) return false;
        const candidateVersionScope = corePathVersionScope(candidate.item.node.sourcePath);
        return !anchorVersionScope
          || !candidateVersionScope
          || candidateVersionScope === anchorVersionScope;
      })
      .map((candidate) => {
        const directEvidence = testEvidenceForImplementations(candidate, implementations, sourceRelations);
        const newTaskCoverage = setDifference(candidate.taskCoverage, coveredTestTaskTokens);
        const relevantNewTaskCoverage = outcomeTaskTokens.size
          ? new Set(
              [...newTaskCoverage].filter(
                (token) => outcomeTaskTokens.has(token) || !coveredImplementationTaskTokens.has(token)
              )
            )
          : newTaskCoverage;
        const newEntityCoverage = setDifference(candidate.entityCoverage, coveredTestEntities);
        const anchorModuleMirrorEvidence = strongestTestModuleMirrorEvidence(anchor.test, implementations);
        const moduleMirrorEvidence = strongestTestModuleMirrorEvidence(candidate, implementations);
        const mirrorDominated = anchorModuleMirrorEvidence >= 0.75
          && moduleMirrorEvidence < anchorModuleMirrorEvidence;
        const causalSupportCandidate = denseCausalNeighborhood
          && /(?:^|[-_.\/])(mock|mocks|fixture|fixtures|support)(?:[-_.\/]|$)/i.test(
            candidate.item.node.sourcePath
          )
          && candidate.directEvidence >= Math.max(100, anchor.test.directEvidence * 0.35);
        const versionedDependencyImpact = hasVersionedDependencyImpactEvidence(candidate);
        const taskAlignedTransitiveImpact = versionedDependencyImpact || (
          strongestTransitiveImportTo(
            candidate.item.node.sourcePath,
            routedImplementationPaths,
            sourceRelations
          ) >= CORE_TRANSITIVE_IMPACT_RELATION_THRESHOLD
            && hasTaskAlignedImpactEvidence(candidate)
            && candidate.directEvidence >= Math.max(80, anchor.test.directEvidence * 0.25)
        );
        const transitiveRelationEvidence = causalSupportCandidate || taskAlignedTransitiveImpact
          ? strongestRelationTo(
              candidate.item.node.sourcePath,
              routedImplementationPaths,
              sourceRelations
            )
          : 0;
        const causalSupportArtifact = transitiveRelationEvidence >= causalSupportRelationThreshold;
        const causalImpactArtifact = taskAlignedTransitiveImpact
          && transitiveRelationEvidence >= CORE_TRANSITIVE_IMPACT_RELATION_THRESHOLD;
        const evidence = causalSupportArtifact || causalImpactArtifact
          ? {
            ...directEvidence,
            relationEvidence: transitiveRelationEvidence,
            totalEvidence: directEvidence.totalEvidence
              + (transitiveRelationEvidence - directEvidence.relationEvidence) * 500
          }
          : directEvidence;
        const evidenceRatio = evidence.totalEvidence / Math.max(anchorTestEvidence.totalEvidence, 1);
        const directEvidenceRatio = candidate.directEvidence / Math.max(anchor.test.directEvidence, 1);
        return {
          candidate,
          evidence,
          newTaskCoverage: relevantNewTaskCoverage,
          newEntityCoverage,
          evidenceRatio,
          directEvidenceRatio,
          mirrorDominated,
          causalSupportArtifact,
          causalImpactArtifact
        };
      })
      .filter(({ candidate, evidence, evidenceRatio, directEvidenceRatio, newTaskCoverage, newEntityCoverage, mirrorDominated, causalSupportArtifact, causalImpactArtifact }) =>
        (evidence.relationEvidence >= 0.75 || causalSupportArtifact || causalImpactArtifact)
        && (evidenceRatio >= 0.55 || causalSupportArtifact || causalImpactArtifact)
        && (directEvidenceRatio >= 0.55 || causalSupportArtifact || causalImpactArtifact)
        && (!mirrorDominated || newEntityCoverage.size > 0 || causalSupportArtifact || causalImpactArtifact)
        && (
          newTaskCoverage.size > 0
          || newEntityCoverage.size > 0
          || causalSupportArtifact
          || causalImpactArtifact
          || (
            denseCausalNeighborhood
            && candidate.directEvidence >= anchor.test.directEvidence * 0.4
          )
        )
      )
      .sort((left, right) =>
        Number(right.causalImpactArtifact) - Number(left.causalImpactArtifact)
        ||
        Number(right.causalSupportArtifact) - Number(left.causalSupportArtifact)
        || (left.causalSupportArtifact && right.causalSupportArtifact
          ? right.evidence.totalEvidence - left.evidence.totalEvidence
          : 0)
        || (right.newEntityCoverage.size + right.newTaskCoverage.size)
          - (left.newEntityCoverage.size + left.newTaskCoverage.size)
        || right.evidence.relationEvidence - left.evidence.relationEvidence
        || right.evidence.totalEvidence - left.evidence.totalEvidence
        || left.candidate.item.node.sourcePath.localeCompare(right.candidate.item.node.sourcePath)
      );
    const next = rankedTestCandidates[0];
    if (!next) break;
    tests.push(next.evidence);
    addAll(coveredTestTaskTokens, next.candidate.taskCoverage);
    addAll(coveredTestEntities, next.candidate.entityCoverage);
  }

  if (
    !stopAtStrongModulePair
    && !stopAtTaskAnchoredPackageBoundary
    && !stopAtTaskNamedCausalCore
    && implementations.length >= 2
    && tests.length < 3
  ) {
    const selectedTestPaths = new Set(tests.map((test) => test.item.node.sourcePath));
    const implementationPaths = new Set(implementations.map((implementation) => implementation.item.node.sourcePath));
    const explicitVerificationAlternative = testCandidates
      .filter((candidate) => !selectedTestPaths.has(candidate.item.node.sourcePath))
      .filter((candidate) => intersection(candidate.entityCoverage, explicitIdentityEntities).size > 0)
      .map((candidate) => ({
        candidate,
        relationEvidence: strongestRelationTo(
          candidate.item.node.sourcePath,
          implementationPaths,
          sourceRelations
        )
      }))
      .filter(({ relationEvidence }) => relationEvidence >= 0.6)
      .sort((left, right) => right.relationEvidence - left.relationEvidence
        || right.candidate.directEvidence - left.candidate.directEvidence
        || left.candidate.item.node.sourcePath.localeCompare(right.candidate.item.node.sourcePath))[0];
    if (explicitVerificationAlternative) {
      tests.push({
        ...explicitVerificationAlternative.candidate,
        relationEvidence: explicitVerificationAlternative.relationEvidence,
        totalEvidence: explicitVerificationAlternative.candidate.directEvidence
          + explicitVerificationAlternative.relationEvidence * 500
      });
    }
  }

  const route = [...implementations, ...tests]
    .map((candidate) => candidate.item)
    .filter(
      (item, index, items) => items.findIndex((candidate) => candidate.node.sourcePath === item.node.sourcePath) === index
    )
    .slice(0, limit);
  if (!route.some((item) => isImplementationCandidate(item.node)) || !route.some(isDirectTestCandidate)) return undefined;

  const exactSubjectOwnerClosure = anchor.subjectOwnerEvidence > 0
    && (
      anchor.ownerLocalEvidence >= 0.75
      || anchor.taskAlignedSymbolTestEvidence > 0
      || (
        anchor.relationEvidence >= 0.75
        && anchor.sharedLeadingEntityCoverage.size > 0
      )
    );
  const causallyVerifiedClosure = anchor.subjectOwnerEvidence === 0
    && stopAtMinimumEvidenceClosure
    && anchor.relationEvidence >= 0.75;
  const confidenceCap = (exactSubjectOwnerClosure || causallyVerifiedClosure)
    && margin >= 0.08
    ? 0.9
    : 0.4;
  return {
    route,
    confidenceCap,
    causalClosed: stopAtStrongModulePair
      || stopAtTaskAnchoredPackageBoundary
      || stopAtTaskNamedCausalCore
      || stopAfterCausalMultiImplementationTest
  };
}

function augmentCoreCausalCandidates(
  scored: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>
): ScoredNode[] {
  const existingNodeIds = new Set(scored.map((item) => item.node.id));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Map<string, number>>();
  for (const edge of edges) {
    if (!CORE_RELATION_TYPES.has(edge.type) || edge.weight < 0.45) continue;
    const from = byId.get(edge.from)?.sourcePath;
    const to = byId.get(edge.to)?.sourcePath;
    if (!from || !to || from === to) continue;
    const fromNeighbors = adjacency.get(from) ?? new Map<string, number>();
    const toNeighbors = adjacency.get(to) ?? new Map<string, number>();
    fromNeighbors.set(to, Math.max(fromNeighbors.get(to) ?? 0, edge.weight));
    toNeighbors.set(from, Math.max(toNeighbors.get(from) ?? 0, edge.weight));
    adjacency.set(from, fromNeighbors);
    adjacency.set(to, toNeighbors);
  }

  const seedSources = [...new Set(
    scored
      .filter((item) => nodeEvidenceScope(item.node) === "product")
      .filter((item) => nodeHasEvidenceRole(item.node, "implementation")
        || nodeHasEvidenceRole(item.node, "verification"))
      .slice(0, 96)
      .map((item) => item.node.sourcePath)
  )];
  const distance = new Map(seedSources.map((sourcePath) => [sourcePath, 0]));
  const queue = seedSources.map((sourcePath) => ({ sourcePath, hops: 0 }));
  while (queue.length) {
    const current = queue.shift()!;
    if (current.hops >= 2) continue;
    const neighbors = [...(adjacency.get(current.sourcePath)?.entries() ?? [])]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 32);
    for (const [neighbor] of neighbors) {
      const hops = current.hops + 1;
      if (hops >= (distance.get(neighbor) ?? Number.POSITIVE_INFINITY)) continue;
      distance.set(neighbor, hops);
      queue.push({ sourcePath: neighbor, hops });
    }
  }

  const taskTokens = coreTaskTokens(analysis);
  for (const node of nodes) {
    if (intersection(corePathScopeTokens(node.sourcePath), taskTokens).size > 0) {
      distance.set(node.sourcePath, Math.min(distance.get(node.sourcePath) ?? 2, 1));
    }
  }
  const implementationSeedCandidates = bestPhysicalEvidenceCandidates(
    scored.filter(
      (item) => nodeEvidenceScope(item.node) === "product"
        && nodeHasEvidenceRole(item.node, "implementation")
    ),
    analysis,
    "implementation"
  );
  const implementationSeedSources = implementationSeedCandidates
    .slice(0, 1)
    .map((candidate) => candidate.item.node.sourcePath);
  const ownerLocalVerificationSources = new Set<string>();
  for (const node of nodes) {
    if (
      nodeEvidenceScope(node) !== "product"
      || !nodeHasEvidenceRole(node, "verification")
    ) continue;
    if (implementationSeedSources.some(
      (sourcePath) => sourceTestOwnerEvidence(sourcePath, node.sourcePath) >= 0.75
    )) {
      ownerLocalVerificationSources.add(node.sourcePath);
      distance.set(node.sourcePath, Math.min(distance.get(node.sourcePath) ?? 2, 1));
    }
  }
  const allowedSources = new Set(
    [...distance.entries()]
      .sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))
      .slice(0, 256)
      .map(([sourcePath]) => sourcePath)
  );
  const additions = nodes
    .filter(
      (node) => node.kind !== "directory"
        && !existingNodeIds.has(node.id)
        && allowedSources.has(node.sourcePath)
    )
    .filter((node) => nodeEvidenceScope(node) === "product")
    .filter((node) => nodeHasEvidenceRole(node, "implementation")
      || nodeHasEvidenceRole(node, "verification"))
    .map((node): ScoredNode => ({
      node,
      score: 11,
      reasons: [
        ownerLocalVerificationSources.has(node.sourcePath)
          ? "owner-local verification sibling of task-ranked implementation"
          : "bounded causal neighbor of task-ranked evidence"
      ],
      matchedKeywordCount: 0
    }));
  return [...scored, ...additions];
}

function buildCoreEvidencePair(
  implementation: CoreEvidenceCandidate,
  test: CoreEvidenceCandidate,
  implementationCandidates: CoreEvidenceCandidate[],
  testCandidates: CoreEvidenceCandidate[],
  relations: CoreSourceRelations,
  analysis: ReturnType<typeof analyzeTask>
): CoreEvidencePair {
  const relationKey = sourceRelationKey(
    implementation.item.node.sourcePath,
    test.item.node.sourcePath
  );
  const directRelationEvidence = relations.direct.get(relationKey) ?? 0;
  const sameEvidenceScope = nodeEvidenceScope(implementation.item.node) === nodeEvidenceScope(test.item.node);
  const rawTransitiveVerificationEvidence = sameEvidenceScope
    && nodeHasEvidenceRole(implementation.item.node, "implementation")
    && nodeHasEvidenceRole(test.item.node, "verification")
    && intersection(test.taskCoverage, corePrimaryTaskTokens(analysis)).size >= 2
    ? relations.all.get(relationKey) ?? 0
    : 0;
  const transitiveVerificationEvidence = rawTransitiveVerificationEvidence >= 0.6
    ? Math.max(0.75, rawTransitiveVerificationEvidence)
    : 0;
  const rawRelationEvidence = Math.max(directRelationEvidence, transitiveVerificationEvidence);
  const implementationWorkspaceScope = coreWorkspaceScope(implementation.item.node.sourcePath);
  const testWorkspaceScope = coreWorkspaceScope(test.item.node.sourcePath);
  const workspaceConflict = implementationWorkspaceScope !== undefined
    && testWorkspaceScope !== undefined
    && implementationWorkspaceScope !== testWorkspaceScope;
  const relationEvidence = workspaceConflict
    ? Math.min(0.25, rawRelationEvidence)
    : rawRelationEvidence;
  const taskAlignedSymbolTestEvidence = workspaceConflict
    ? 0
    : Number(relations.taskAlignedSymbolTests.has(relationKey));
  const targetIdentityTokens = coreLeadingCodeIdentityTokens(analysis);
  const targetIdentityCoverage = targetIdentityTokens.size
    ? intersection(test.taskCoverage, targetIdentityTokens).size / targetIdentityTokens.size
    : 0;
  const exactImplementationTargetEvidence = coreExactLeadingCodeIdentityEvidence(
    implementation.item,
    analysis
  );
  const explicitIdentifierImplementationEvidence = coreExplicitIdentifierImplementationEvidence(
    implementation.item,
    analysis
  );
  const pairEvidence = strongestPairEvidence(test.item, [implementation.item]);
  const taskCoverage = new Set([...implementation.taskCoverage, ...test.taskCoverage]);
  const entityCoverage = new Set([...implementation.entityCoverage, ...test.entityCoverage]);
  const sharedLeadingEntityCoverage = intersection(
    intersection(implementation.entityCoverage, test.entityCoverage),
    coreLeadingIdentityEntities(analysis)
  );
  const familyEvidence = sourcePathFamilyEvidence(
    implementation.item.node.sourcePath,
    test.item.node.sourcePath
  );
  const workspaceEvidence = coreWorkspacePairEvidence(
    implementation,
    test,
    implementationCandidates,
    testCandidates
  );
  const moduleMirrorEvidence = duplicateTestModuleMirrorEvidence(
    implementation.item.node.sourcePath,
    test.item.node.sourcePath,
    testCandidates
  );
  const taskOwnedSymbolTestEvidence = taskOwnedSymbolTestOwnerEvidence(
    implementation.item.node,
    test.item.node.sourcePath,
    analysis
  );
  const rawDiscriminativeModuleMirrorEvidence = Math.max(
    discriminativeTestModuleMirrorEvidence(
      implementation.item.node.sourcePath,
      test.item.node.sourcePath
    ),
    taskOwnedSymbolTestEvidence
  );
  const moduleMirrorTaskAnchored = moduleStemAppearsInTask(
    implementation.item.node.sourcePath,
    analysis.raw
  )
    || expandedTaskAcronyms(analysis.raw, test.item.node.title).size > 0
    || explicitIdentifierImplementationEvidence > 0
    || taskOwnedSymbolTestEvidence >= 0.75;
  const strongestImplementationEvidence = implementationCandidates[0]?.directEvidence ?? 0;
  const ownerLocalEvidence = taskOwnerVerificationEvidence(
    implementation.item.node,
    test.item.node.sourcePath,
    analysis
  );
  const ownerLocalAlternativeAvailable = testCandidates.some((candidate) =>
    candidate.item.node.sourcePath !== test.item.node.sourcePath
    && taskOwnerVerificationEvidence(
      implementation.item.node,
      candidate.item.node.sourcePath,
      analysis
    ) >= 0.75
  );
  const subjectOwnerEvidence = coreSubjectOwnerEvidence(implementation.item, analysis);
  const strongerTaskAlignedTransitiveImplementation = implementationCandidates.some((candidate) =>
    candidate.item.node.sourcePath !== implementation.item.node.sourcePath
    && (transitiveImportEvidence(
      test.item.node.sourcePath,
      candidate.item.node.sourcePath,
      relations
    )?.strength ?? 0) >= CORE_TRANSITIVE_IMPACT_RELATION_THRESHOLD
    && (
      candidate.directEvidence > implementation.directEvidence
      || candidate.taskCoverage.size > implementation.taskCoverage.size
    )
  );
  const directlyConnectedModuleMirror = rawDiscriminativeModuleMirrorEvidence > 0
    && directRelationEvidence >= 0.75
    && intersection(test.taskCoverage, corePrimaryTaskTokens(analysis)).size >= 2
    && implementation.directEvidence >= Math.max(120, strongestImplementationEvidence * 0.45)
    && !strongerTaskAlignedTransitiveImplementation;
  const discriminativeModuleMirrorEvidence = rawDiscriminativeModuleMirrorEvidence > 0
    && (moduleMirrorTaskAnchored || directlyConnectedModuleMirror)
    && implementation.directEvidence >= Math.max(
      directlyConnectedModuleMirror ? 120 : 160,
      strongestImplementationEvidence * (directlyConnectedModuleMirror ? 0.45 : 0.65)
    )
    ? rawDiscriminativeModuleMirrorEvidence
    : 0;
  const generatedArtifactPairEvidence = /\b(?:generated[-\s]+code|codegen|code generation)\b/i.test(
    analysis.raw
  )
    && test.item.node.tags.includes("generated-artifact")
    && directRelationEvidence >= 0.95
    ? 1
    : 0;
  const structuralEvidence = Math.max(
    moduleMirrorEvidence,
    discriminativeModuleMirrorEvidence,
    generatedArtifactPairEvidence,
    explicitTaskModuleMirrorEvidence(
      implementation.item.node.sourcePath,
      test.item.node.sourcePath,
      analysis
    ),
    colocatedGenericTestEvidence(
      implementation.item.node.sourcePath,
      test.item.node.sourcePath
    )
  );
  const primaryTaskTokens = corePrimaryTaskTokens(analysis);
  const implementationPrimaryCoverage = primaryTaskTokens.size
    ? intersection(implementation.taskCoverage, primaryTaskTokens).size / primaryTaskTokens.size
    : 0;
  const explicitImplementationIdentity = coreExplicitPathIdentityCoverage(
    implementation.item.node.sourcePath,
    analysis
  );
  const versionPairEvidence = explicitVersionPairEvidence(
    implementation.item.node.sourcePath,
    test.item.node.sourcePath,
    analysis
  );
  const requestedLocaleScopes = coreRequestedLocaleScopes(analysis);
  const implementationLocaleScope = corePathLocaleScope(implementation.item.node.sourcePath);
  const localeIdentityEvidence = implementationLocaleScope !== undefined
    && requestedLocaleScopes.has(implementationLocaleScope)
    ? 1
    : 0;
  const localeFocusedTestPhraseEvidence = localeIdentityEvidence
    * coreTaskTitleBigramMatches(analysis.raw, test.item.node.title);
  const taskOwnedWorkspaceEvidence = implementationWorkspaceScope
    && directRelationEvidence >= 0.75
    && intersection(
      coreNodeTokens(implementationWorkspaceScope),
      corePrimaryTaskTokens(analysis)
    ).size > 0
    ? 1
    : 0;
  const totalEvidence = implementation.directEvidence
    + test.directEvidence
    + relationEvidence * 500
    + taskAlignedSymbolTestEvidence * 700
    + targetIdentityCoverage * 600
    + exactImplementationTargetEvidence * 600
    + explicitIdentifierImplementationEvidence * 1200
    + pairEvidence * 40
    + familyEvidence * 100
    + structuralEvidence * 640
    + discriminativeModuleMirrorEvidence * 800
    + workspaceEvidence * 650
    + sharedLeadingEntityCoverage.size * 700
    + taskCoverage.size * 55
    + entityCoverage.size * 80
    + implementationPrimaryCoverage * 250
    + explicitImplementationIdentity * 300
    + versionPairEvidence * 400
    + localeIdentityEvidence * 1200
    + localeFocusedTestPhraseEvidence * 800
    + taskOwnedWorkspaceEvidence * 1000
    - (
      ownerLocalAlternativeAvailable
        && ownerLocalEvidence < 0.75
        && relationEvidence < 0.75
        && taskAlignedSymbolTestEvidence === 0
        ? Math.max(1200, test.directEvidence)
        : 0
    )
    + (implementation.item.score + test.item.score) * 0.15;
  return {
    implementation,
    test,
    relationEvidence,
    taskAlignedSymbolTestEvidence,
    targetIdentityCoverage,
    exactImplementationTargetEvidence,
    pairEvidence,
    moduleMirrorEvidence: discriminativeModuleMirrorEvidence,
    ownerLocalEvidence,
    ownerLocalAlternativeAvailable,
    subjectOwnerEvidence,
    generatedArtifactPairEvidence,
    structuralEvidence,
    workspaceEvidence,
    sharedLeadingEntityCoverage,
    taskCoverage,
    entityCoverage,
    totalEvidence
  };
}

function testEvidenceForImplementations(
  test: CoreEvidenceCandidate,
  implementations: CoreEvidenceCandidate[],
  relations: CoreSourceRelations
): CoreEvidenceCandidate {
  const implementationPaths = new Set(implementations.map((candidate) => candidate.item.node.sourcePath));
  const relationEvidence = strongestRelationTo(
    test.item.node.sourcePath,
    implementationPaths,
    relations,
    { transitive: false }
  );
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
      sourceTestOwnerEvidence(
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
    const explicitCallCoverage = role === "implementation"
      ? coreExplicitCallSourceCoverage(profiles.map((candidate) => candidate.item), analysis.raw)
      : 0;
    const explicitCallEvidence = explicitCallCoverage * 260
      + (explicitCallCoverage >= 2 ? 280 : 0);
    const directEvidence = representative.profile.directEvidence
      + evidenceBonus
      + explicitCallEvidence;
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

function coreExplicitCallSourceCoverage(items: ScoredNode[], task: string): number {
  const requested = new Set(
    [...task.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(\s*\)/g)]
      .flatMap((match) => match[1] ? [compactCodeIdentifier(match[1])] : [])
  );
  if (!requested.size) return 0;
  const covered = new Set<string>();
  for (const item of items) {
    const terminalTitle = item.node.title.split(/\.|::/).at(-1) ?? item.node.title;
    const compactTitle = compactCodeIdentifier(terminalTitle);
    if (requested.has(compactTitle)) covered.add(compactTitle);
  }
  return covered.size;
}

function selectCoreScopeHypothesis(
  implementations: CoreEvidenceCandidate[],
  tests: CoreEvidenceCandidate[],
  relations: CoreSourceRelations,
  analysis: ReturnType<typeof analyzeTask>
): CoreScopeHypothesis | undefined {
  const scopes = new Set(
    [...implementations, ...tests]
      .map((candidate) => coreWorkspaceScope(candidate.item.node.sourcePath))
      .filter((scope): scope is string => Boolean(scope))
  );
  if (scopes.size < 2) return undefined;

  const primaryTokens = corePrimaryTaskTokens(analysis);
  const targetIdentityTokens = coreTargetIdentityTokens(analysis.raw);
  const hypotheses = [...scopes].flatMap((scope): CoreScopeHypothesis[] => {
    const scopedImplementations = implementations
      .filter((candidate) => coreWorkspaceScope(candidate.item.node.sourcePath) === scope)
      .filter((candidate) => candidate.directEvidence >= 100)
      .slice(0, 12);
    const scopedTests = tests
      .filter((candidate) => coreWorkspaceScope(candidate.item.node.sourcePath) === scope)
      .filter((candidate) => candidate.directEvidence >= 100)
      .slice(0, 12);
    if (!scopedImplementations.length || !scopedTests.length) return [];

    const pairs = scopedImplementations.slice(0, 6).flatMap((implementation) =>
      scopedTests.slice(0, 8).map((test) => buildCoreEvidencePair(
        implementation,
        test,
        scopedImplementations,
        scopedTests,
        relations,
        analysis
      ))
    ).sort((left, right) => right.totalEvidence - left.totalEvidence);
    const anchor = pairs[0];
    if (!anchor) return [];
    const scopePaths = new Set([
      ...scopedImplementations.map((candidate) => candidate.item.node.sourcePath),
      ...scopedTests.map((candidate) => candidate.item.node.sourcePath)
    ]);
    const connectedImplementations = scopedImplementations.filter((candidate) =>
      strongestRelationTo(candidate.item.node.sourcePath, scopePaths, relations, { excludeSelf: true }) >= 0.6
    );
    const connectedTests = scopedTests.filter((candidate) =>
      strongestRelationTo(candidate.item.node.sourcePath, scopePaths, relations, { excludeSelf: true }) >= 0.6
    );
    const distributedImplementationEvidence = scopedImplementations
      .filter((candidate) => candidate !== anchor.implementation)
      .filter((candidate) =>
        intersection(candidate.taskCoverage, primaryTokens).size > 0
        || strongestRelationTo(
          candidate.item.node.sourcePath,
          new Set([anchor.implementation.item.node.sourcePath, anchor.test.item.node.sourcePath]),
          relations
        ) >= 0.6
      )
      .slice(0, 3)
      .reduce((sum, candidate) => sum + Math.min(700, candidate.directEvidence) * 0.38, 0);
    const distributedTestEvidence = scopedTests
      .filter((candidate) => candidate !== anchor.test)
      .filter((candidate) => intersection(candidate.taskCoverage, primaryTokens).size > 0)
      .slice(0, 2)
      .reduce((sum, candidate) => sum + Math.min(600, candidate.directEvidence) * 0.2, 0);
    const connectedEvidenceCount = new Set([
      ...connectedImplementations.map((candidate) => candidate.item.node.sourcePath),
      ...connectedTests.map((candidate) => candidate.item.node.sourcePath)
    ]).size;
    const implementationTokenSupport = new Map<string, number>();
    const testTokenSupport = new Map<string, number>();
    for (const candidate of scopedImplementations) {
      for (const token of intersection(candidate.taskCoverage, primaryTokens)) {
        implementationTokenSupport.set(token, (implementationTokenSupport.get(token) ?? 0) + 1);
      }
    }
    for (const candidate of scopedTests) {
      for (const token of intersection(candidate.taskCoverage, primaryTokens)) {
        testTokenSupport.set(token, (testTokenSupport.get(token) ?? 0) + 1);
      }
    }
    const crossSurfaceTaskCoverage = [...primaryTokens].filter(
      (token) => (implementationTokenSupport.get(token) ?? 0) > 0
        && (testTokenSupport.get(token) ?? 0) > 0
    ).length;
    const targetIdentityCoverage = [...targetIdentityTokens].filter(
      (token) => (implementationTokenSupport.get(token) ?? 0) > 0
        && (testTokenSupport.get(token) ?? 0) > 0
    ).length;
    const taskSupportEvidence = [...primaryTokens].reduce((sum, token) => {
      const implementationSupport = implementationTokenSupport.get(token) ?? 0;
      const testSupport = testTokenSupport.get(token) ?? 0;
      return sum
        + (implementationSupport > 0 && testSupport > 0 ? 260 : implementationSupport > 0 ? 70 : 0)
        + (implementationSupport >= 2 ? 60 : 0)
        + (testSupport >= 2 ? 30 : 0);
    }, 0);
    const targetIdentityEvidence = [...targetIdentityTokens].reduce((sum, token) => {
      const implementationSupport = implementationTokenSupport.get(token) ?? 0;
      const testSupport = testTokenSupport.get(token) ?? 0;
      return sum + (implementationSupport > 0 && testSupport > 0 ? 520 : implementationSupport > 0 ? 180 : 0);
    }, 0);
    const score = anchor.totalEvidence
      + distributedImplementationEvidence
      + distributedTestEvidence
      + Math.min(6, Math.max(0, connectedEvidenceCount - 2)) * 180
      + taskSupportEvidence
      + targetIdentityEvidence;
    return [{
      scope,
      implementations: scopedImplementations,
      tests: scopedTests,
      score,
      connectedEvidenceCount,
      crossSurfaceTaskCoverage,
      targetIdentityCoverage
    }];
  }).sort((left, right) => right.score - left.score || left.scope.localeCompare(right.scope));

  const scoreWinner = hypotheses[0];
  const targetIdentityWinner = [...hypotheses].sort(
    (left, right) => right.targetIdentityCoverage - left.targetIdentityCoverage
      || right.crossSurfaceTaskCoverage - left.crossSurfaceTaskCoverage
      || right.score - left.score
      || left.scope.localeCompare(right.scope)
  )[0];
  const targetIdentityOverride = scoreWinner !== undefined
    && targetIdentityWinner !== undefined
    && targetIdentityTokens.size >= 2
    && targetIdentityWinner.targetIdentityCoverage === targetIdentityTokens.size
    && targetIdentityWinner.targetIdentityCoverage > scoreWinner.targetIdentityCoverage
    && targetIdentityWinner.implementations.length >= 2
    && targetIdentityWinner.connectedEvidenceCount >= 3
    && targetIdentityWinner.score >= scoreWinner.score * 0.85;
  const taskCoverageOverride = scoreWinner !== undefined
    && targetIdentityWinner !== undefined
    && targetIdentityWinner.targetIdentityCoverage >= scoreWinner.targetIdentityCoverage
    && targetIdentityWinner.crossSurfaceTaskCoverage > scoreWinner.crossSurfaceTaskCoverage
    && targetIdentityWinner.implementations.length >= 2
    && targetIdentityWinner.connectedEvidenceCount >= 3
    && targetIdentityWinner.score >= scoreWinner.score * 0.9;
  const winner = targetIdentityOverride || taskCoverageOverride
    ? targetIdentityWinner
    : scoreWinner;
  const competitor = hypotheses.find((hypothesis) => hypothesis.scope !== winner?.scope);
  if (!winner || winner.implementations.length < 2 || winner.connectedEvidenceCount < 3) return undefined;
  const margin = competitor
    ? (winner.score - competitor.score) / Math.max(winner.score, 1)
    : 1;
  const strongerTaskCoverage = competitor !== undefined
    && winner.crossSurfaceTaskCoverage > competitor.crossSurfaceTaskCoverage;
  const strongerTargetIdentity = competitor !== undefined
    && winner.targetIdentityCoverage > competitor.targetIdentityCoverage;
  return targetIdentityOverride
    || taskCoverageOverride
    || margin >= 0.08
    || ((strongerTaskCoverage || strongerTargetIdentity) && margin >= 0.03)
    ? winner
    : undefined;
}

type AdditiveMemberIntent = {
  owner: string;
  ownerSpelling: string;
  members: string[];
  staticMember: boolean;
};

function selectMissingMemberOwnerRoute(
  implementations: CoreEvidenceCandidate[],
  tests: CoreEvidenceCandidate[],
  relations: CoreSourceRelations,
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType,
  limit: number
): CoreRouteSelection | undefined {
  if (taskType !== "feature" || limit < 2) return undefined;
  const memberIntent = additiveMemberIntent(analysis);
  if (!memberIntent) return undefined;

  const ownerImplementations = implementations
    .filter((candidate) => candidateDeclaresIdentifier(candidate, memberIntent.owner))
    .slice(0, 3);
  if (!ownerImplementations.length) return undefined;
  if (memberIntent.members.some((member) =>
    ownerImplementations.some((candidate) => candidateContainsIdentifier(candidate, member))
  )) return undefined;

  const ownerPaths = new Set(
    ownerImplementations.map((candidate) => candidate.item.node.sourcePath)
  );
  const unrelatedModuleStems = new Set(
    implementations
      .filter((candidate) => !ownerPaths.has(candidate.item.node.sourcePath))
      .filter((candidate) => !moduleStemAppearsInTask(candidate.item.node.sourcePath, analysis.raw))
      .map((candidate) => canonicalModuleStem(candidate.item.node.sourcePath))
  );
  const rankedTests = tests
    .map((candidate) => {
      const relationEvidence = strongestRelationTo(
        candidate.item.node.sourcePath,
        ownerPaths,
        relations
      );
      const moduleStem = canonicalModuleStem(candidate.item.node.sourcePath);
      const ownerMirrorEvidence = strongestTestModuleMirrorEvidence(
        candidate,
        ownerImplementations
      );
      const ownerRelationMultiplicity = [...ownerPaths].reduce(
        (sum, ownerPath) => sum + (
          relations.directCounts.get(sourceRelationKey(candidate.item.node.sourcePath, ownerPath)) ?? 0
        ),
        0
      );
      return {
        candidate,
        relationEvidence,
        ownerIdentityEvidence: candidateContainsIdentifier(candidate, memberIntent.owner),
        ownerRelationMultiplicity,
        ownerMirrorEvidence,
        staticOwnerMemberEvidence: candidateUsesStaticOwnerMember(candidate, memberIntent),
        publicApiIntegrationEvidence: candidateIsPublicApiIntegrationTest(candidate, memberIntent),
        typeTest: isTypeTestPath(candidate.item.node.sourcePath),
        unrelatedModuleMirror: unrelatedModuleStems.has(moduleStem)
      };
    })
    .filter(({ relationEvidence, ownerIdentityEvidence, unrelatedModuleMirror }) =>
      (relationEvidence >= 0.6 || ownerIdentityEvidence) && !unrelatedModuleMirror
    )
    .sort((left, right) =>
      Number(right.typeTest) - Number(left.typeTest)
      || right.staticOwnerMemberEvidence - left.staticOwnerMemberEvidence
      || right.publicApiIntegrationEvidence - left.publicApiIntegrationEvidence
      || right.ownerRelationMultiplicity - left.ownerRelationMultiplicity
      || right.relationEvidence - left.relationEvidence
      || right.candidate.directEvidence - left.candidate.directEvidence
      || left.candidate.item.node.sourcePath.localeCompare(right.candidate.item.node.sourcePath)
    );
  if (!rankedTests.length) return undefined;

  const selectedTests: CoreEvidenceCandidate[] = [];
  const appendTest = (candidate?: CoreEvidenceCandidate): void => {
    if (!candidate || selectedTests.some((selected) =>
      selected.item.node.sourcePath === candidate.item.node.sourcePath
    )) return;
    selectedTests.push(candidate);
  };
  appendTest(rankedTests.find((candidate) => candidate.typeTest)?.candidate);
  const runtimeTests = rankedTests.filter((candidate) => !candidate.typeTest);
  const ownerMirror = runtimeTests.find((candidate) => candidate.ownerMirrorEvidence >= 0.75);
  const integrations = runtimeTests.filter((candidate) => candidate.ownerMirrorEvidence < 0.75);
  const integration = integrations[0];
  const runtimeOwnerCount = new Set(
    ownerImplementations
      .map((candidate) => candidate.item.node.sourcePath)
      .filter((sourcePath) => !isTypeDeclarationPath(sourcePath))
  ).size;
  if (runtimeOwnerCount > 1) {
    appendTest(ownerMirror?.candidate);
    appendTest(integration?.candidate);
  } else {
    appendTest((integration ?? ownerMirror)?.candidate);
    if ((integration?.ownerRelationMultiplicity ?? 0) >= 8) {
      appendTest(integrations[1]?.candidate);
    }
  }
  if (!selectedTests.length) return undefined;

  const route = [
    ...ownerImplementations.map((candidate) => ({
      ...candidate.item,
      reasons: [
        `declares the owner of missing additive member(s): ${memberIntent.members.join(", ")}`,
        ...candidate.item.reasons
      ]
    })),
    ...selectedTests.map((candidate) => ({
      ...candidate.item,
      reasons: [
        `verifies the owner contract for missing additive member(s): ${memberIntent.members.join(", ")}`,
        ...candidate.item.reasons
      ]
    }))
  ].slice(0, limit);
  return {
    route,
    confidenceCap: 0.4,
    causalClosed: false
  };
}

function additiveMemberIntent(
  analysis: ReturnType<typeof analyzeTask>
): AdditiveMemberIntent | undefined {
  const dotted = analysis.raw.match(
    /\b(?:add|introduce|expose|implement)\s+(?:a\s+|the\s+)?(?:new\s+)?(?:static\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.|::)\s*([A-Za-z_$][A-Za-z0-9_$]*)\b/i
  );
  if (dotted?.[1] && dotted[2]) {
    return {
      owner: compactCodeIdentifier(dotted[1]),
      ownerSpelling: dotted[1],
      members: [compactCodeIdentifier(dotted[2])],
      staticMember: /\bstatic\b/i.test(analysis.raw)
    };
  }

  const scopedOwner = analysis.raw.match(
    /^\s*(?:feat|feature)\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)\s*:/i
  )?.[1];
  const trailingOwner = analysis.raw.match(
    /\b(?:methods?|members?)\s+(?:to|on|for)\s+`?([A-Za-z_$][A-Za-z0-9_$]*)`?\b/i
  )?.[1];
  const owner = scopedOwner ?? trailingOwner;
  if (!owner || !/\b(?:add|introduce|expose|implement)\b/i.test(analysis.raw)) return undefined;
  const ownerCompact = compactCodeIdentifier(owner);
  const members = analysis.identifiers
    .map((identifier) => compactCodeIdentifier(identifier))
    .filter((identifier) => identifier && identifier !== ownerCompact);
  const uniqueMembers = [...new Set(members)];
  return uniqueMembers.length ? {
    owner: ownerCompact,
    ownerSpelling: owner,
    members: uniqueMembers,
    staticMember: false
  } : undefined;
}

function candidateUsesStaticOwnerMember(
  candidate: CoreEvidenceCandidate,
  intent: AdditiveMemberIntent
): number {
  if (!intent.staticMember) return 0;
  const evidence = [
    candidate.item.matchedFact?.name,
    candidate.item.matchedFact?.searchText,
    candidate.item.node.title,
    candidate.item.node.summary
  ].filter(Boolean).join(" ");
  const owner = intent.ownerSpelling.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${owner}\\s*(?:\\.|::)\\s*[A-Za-z_$][A-Za-z0-9_$]*`).test(evidence)
    ? 1
    : 0;
}

function candidateIsPublicApiIntegrationTest(
  candidate: CoreEvidenceCandidate,
  intent: AdditiveMemberIntent
): number {
  if (!intent.staticMember || !candidateContainsIdentifier(candidate, intent.owner)) return 0;
  const stem = canonicalModuleStem(candidate.item.node.sourcePath).toLowerCase();
  return ["api", "index", "main", "public"].includes(stem) ? 1 : 0;
}

function candidateDeclaresIdentifier(
  candidate: CoreEvidenceCandidate,
  identifier: string
): boolean {
  return [candidate.item.matchedFact?.name, candidate.item.node.title]
    .filter((value): value is string => Boolean(value))
    .some((title) => title.split(/[.:]/).some(
      (declaredName) => compactCodeIdentifier(declaredName) === identifier
    ));
}

function candidateContainsIdentifier(
  candidate: CoreEvidenceCandidate,
  identifier: string
): boolean {
  const evidence = [
    candidate.item.node.sourcePath,
    candidate.item.node.title,
    candidate.item.node.summary,
    candidate.item.matchedFact?.name,
    candidate.item.matchedFact?.searchText
  ].filter(Boolean).join(" ");
  return extractCodeIdentifierCompacts(evidence).has(identifier);
}

function selectExplicitMemberBoundaryRoute(
  implementations: CoreEvidenceCandidate[],
  tests: CoreEvidenceCandidate[],
  analysis: ReturnType<typeof analyzeTask>,
  limit: number
): CoreRouteSelection | undefined {
  if (!/\bdefer(?:red|ring)?\b/i.test(analysis.raw)) return undefined;
  const explicitMembers = coreExplicitMemberEntities(analysis.raw);
  if (!explicitMembers.size) return undefined;
  const explicitMemberTokens = (analysis.raw.match(/\b[A-Za-z_][A-Za-z0-9_]*(?:\.|::)[A-Za-z_][A-Za-z0-9_]*\b/g) ?? [])
    .map((identity) => coreNodeTokens(identity));
  const hasExplicitMember = (candidate: CoreEvidenceCandidate) => {
    const candidateTokens = coreNodeTokens(
      `${candidate.item.node.sourcePath} ${candidate.item.node.title} ${candidate.item.node.summary}`
    );
    return explicitMemberTokens.some((tokens) => [...tokens].every((token) => candidateTokens.has(token)));
  };
  const alreadyDeferred = (candidate: CoreEvidenceCandidate) =>
    explicitMemberTokens.some((memberTokens) => hasNearbyDeferredMember(
      `${candidate.item.node.title} ${candidate.item.node.summary}`,
      [...memberTokens]
    ));
  const matchingImplementations = implementations
    .filter(hasExplicitMember)
    .filter((candidate) => !alreadyDeferred(candidate))
    .filter((candidate) => candidate.directEvidence > 0)
    .slice(0, Math.max(0, limit - 1));
  const matchingTests = tests
    .filter(hasExplicitMember)
    .filter((candidate) => !alreadyDeferred(candidate))
    .filter((candidate) => candidate.directEvidence > 0)
    .slice(0, Math.max(0, limit - matchingImplementations.length));
  if (matchingImplementations.length < 2 || !matchingTests.length) return undefined;
  return {
    route: [...matchingImplementations, ...matchingTests]
      .map((candidate) => candidate.item)
      .slice(0, limit),
    confidenceCap: 0.65
  };
}

function hasNearbyDeferredMember(value: string, memberTokens: string[]): boolean {
  if (!memberTokens.length) return false;
  const sequence = (value.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [])
    .flatMap((token) => [...tokenizeLexical(token)]);
  const action = memberTokens.at(-1);
  if (!action) return false;

  return sequence.some((token, deferIndex) => {
    if (token !== "defer") return false;
    const actionOffset = sequence
      .slice(deferIndex + 1, deferIndex + 9)
      .findIndex((candidate) => candidate === action);
    if (actionOffset < 0) return false;
    const actionIndex = deferIndex + actionOffset + 1;
    const nearby = new Set(sequence.slice(Math.max(0, deferIndex - 8), actionIndex + 1));
    return memberTokens.every((member) => nearby.has(member));
  });
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
  const constraintTokens = coreConstraintTokens(analysis.raw);
  const demotedTokens = new Set([
    ...constraintTokens,
    ...(role === "implementation" ? outcomeTokens : [])
  ]);
  const pathTokens = corePathTokens(item.node.sourcePath);
  const pathScopeTokens = corePathScopeTokens(item.node.sourcePath);
  const titleTokens = coreNodeTokens(`${item.node.title} ${item.matchedFact?.name ?? ""}`);
  const summaryTokens = coreNodeTokens(`${item.node.summary} ${item.matchedFact?.searchText ?? ""}`);
  const nodeTokens = new Set([...pathTokens, ...pathScopeTokens, ...titleTokens, ...summaryTokens]);
  const identityValues = [item.node.sourcePath, item.node.title, item.node.summary, item.matchedFact?.name, item.matchedFact?.searchText]
    .filter(Boolean)
    .join(" ");
  const identityHaystack = identityValues
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const identifierCompacts = extractCodeIdentifierCompacts(identityValues);
  const explicitIdentifierCompacts = coreNonConstraintIdentifierCompacts(analysis);
  const constraintIdentifierCompacts = coreConstraintIdentifierCompacts(analysis.raw);
  const pathMatches = weightedCoreMatches(pathTokens, taskTokens, demotedTokens);
  const pathScopeMatches = weightedCoreMatches(pathScopeTokens, taskTokens, demotedTokens);
  const explicitPathIdentity = coreExplicitPathIdentityCoverage(item.node.sourcePath, analysis);
  const titleMatches = weightedCoreMatches(titleTokens, taskTokens, demotedTokens);
  const summaryMatches = weightedCoreMatches(summaryTokens, taskTokens, demotedTokens);
  const taskCoverage = new Set(
    [...taskTokens].filter((token) => !CORE_EVIDENCE_LOW_SIGNAL.has(token) && nodeTokens.has(token))
  );
  const acronymMatches = expandedTaskAcronyms(analysis.raw, item.node.title);
  addAll(taskCoverage, acronymMatches);
  const entityCoverage = new Set(
    analysis.entities.filter((entity) => {
      const entityTokens = [...coreNodeTokens(entity)].filter((token) => !CORE_EVIDENCE_LOW_SIGNAL.has(token));
      const compactEntity = compactCodeIdentifier(entity);
      if (
        constraintIdentifierCompacts.has(compactEntity)
        && !explicitIdentifierCompacts.has(compactEntity)
      ) return false;
      if (explicitIdentifierCompacts.has(compactEntity)) return identifierCompacts.has(compactEntity);
      return (entityTokens.length > 0 && entityTokens.every((token) => nodeTokens.has(token)))
        || (compactEntity.length > 3 && identityHaystack.includes(compactEntity));
    })
  );
  const auxiliaryPath = /(^|\/)(?:bench|benchmark|benchmarks|example|examples)(\/|$)|(?:^|[-_.])bench(?:mark)?(?:[-_.]|$)/i.test(item.node.sourcePath);
  const auxiliaryRequested = analysis.keywords.some((keyword) => ["bench", "benchmark", "example", "examples"].includes(keyword));
  const auxiliaryPenalty = auxiliaryPath && !auxiliaryRequested ? 500 : 0;
  const verificationDataPath = /(^|\/)(?:fixtures?|snapshots?|testdata)(\/|$)/i.test(item.node.sourcePath);
  const verificationDataRequested = /\b(?:fixture|fixtures|snapshot|snapshots|testdata|test data)\b/i.test(analysis.raw);
  const verificationDataPenalty = role === "test" && verificationDataPath && !verificationDataRequested
    ? 700
    : 0;
  const versionedScope = item.node.sourcePath.match(/(?:^|\/)(v\d+(?:[._-]\d+)*)(?:\/|$)/i)?.[1];
  const rawTaskTokens = tokenizeLexical(analysis.raw);
  const versionedScopeRequested = versionedScope
    ? [...tokenizeLexical(versionedScope)].some((token) => rawTaskTokens.has(token))
    : false;
  const implicitVersionPenalty = versionedScope && !versionedScopeRequested ? 260 : 0;
  const phraseEvidence = verificationDataPath && !verificationDataRequested
    ? 0
    : coreTaskEvidencePhraseScore(analysis.raw, identityValues);
  const localeScopeAdjustment = coreLocaleScopeAdjustment(item.node.sourcePath, analysis);
  const platformScopePenalty = coreImplicitPlatformScopePenalty(item.node.sourcePath, analysis.raw);
  const operationalMetadataPenalty = isOperationalMetadataPath(item.node.sourcePath) ? 800 : 0;
  const primaryCoverage = intersection(taskCoverage, corePrimaryTaskTokens(analysis));
  const outcomeCoverage = intersection(taskCoverage, outcomeTokens);
  const subjectOwnerEvidence = coreSubjectOwnerEvidence(item, analysis);
  const implementationCoverageEvidence = primaryCoverage.size * 25 + outcomeCoverage.size * 5;
  const primaryCoverageSynergy = role === "implementation" && primaryCoverage.size >= 2 ? 180 : 0;
  const outcomePathEvidence = role === "test"
    ? weightedCoreMatches(pathTokens, outcomeTokens) * 160
    : 0;
  const directEvidence = pathMatches * 110
    + pathScopeMatches * 55
    + titleMatches * 140
    + Math.min(5, summaryMatches) * 40
    + routePathTaskAffinity(item.node.sourcePath, analysis) * 70
    + explicitPathIdentity * 220
    + entityCoverage.size * 140
    + (role === "implementation" ? implementationCoverageEvidence : taskCoverage.size * 25)
    + primaryCoverageSynergy
    + outcomePathEvidence
    + acronymMatches.size * 280
    + phraseEvidence * 220
    + ((item.node.startLine || item.matchedFact) && titleMatches > 0 ? 20 : 0)
    + localeScopeAdjustment
    - auxiliaryPenalty
    - verificationDataPenalty
    - platformScopePenalty
    - implicitVersionPenalty
    - operationalMetadataPenalty;
  return {
    directEvidence: Math.max(0, directEvidence),
    taskCoverage,
    entityCoverage
  };
}

function coreTaskTitleBigramMatches(task: string, title: string): number {
  const taskTokens = [...tokenizeLexical(task)]
    .filter((token) => token.length > 2 && !CORE_EVIDENCE_NOISE.has(token));
  const titleTokens = [...tokenizeLexical(title)]
    .filter((token) => token.length > 2 && !CORE_EVIDENCE_NOISE.has(token));
  const titleBigrams = new Set(
    titleTokens.slice(0, -1).map((token, index) => `${token}:${titleTokens[index + 1]}`)
  );
  return taskTokens.slice(0, -1).filter(
    (token, index) => titleBigrams.has(`${token}:${taskTokens[index + 1]}`)
  ).length;
}

function coreTaskEvidencePhraseScore(task: string, evidence: string): number {
  const taskTokens = [...tokenizeLexical(task)]
    .filter((token) => token.length > 2 && !CORE_EVIDENCE_NOISE.has(token));
  const evidenceTokens = [...tokenizeLexical(evidence)]
    .filter((token) => token.length > 2 && !CORE_EVIDENCE_NOISE.has(token));
  const evidenceBigrams = new Set(
    evidenceTokens.slice(0, -1).map((token, index) => `${token}:${evidenceTokens[index + 1]}`)
  );
  const diagnosticTerms = new Set([
    "error",
    "fail",
    "invalid",
    "missing",
    "panic",
    "unknown",
    "unsafe"
  ]);
  return taskTokens.slice(0, -1).reduce((score, token, index) => {
    const next = taskTokens[index + 1];
    if (!evidenceBigrams.has(`${token}:${next}`)) return score;
    return score + (diagnosticTerms.has(token) || diagnosticTerms.has(next) ? 3 : 1);
  }, 0);
}

function coreTaskTokens(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  const tokens = new Set(
    analysis.keywords.flatMap((keyword) => [...tokenizeLexical(keyword)])
      .filter((token) => token.length > 2 && !CORE_EVIDENCE_NOISE.has(token))
  );
  if (/\bgenerated[-\s]+code\b/i.test(analysis.raw)) tokens.add("codegen");
  return tokens;
}

function coreTaskSubjectClause(task: string): string {
  const constraintBoundary = task.search(
    /\b(?:without|while\s+(?:preserving|keeping|maintaining)|but\s+(?:do\s+not|don't)|must\s+not|do\s+not)\b/i
  );
  const bounded = constraintBoundary >= 0 ? task.slice(0, constraintBoundary) : task;
  return bounded
    .replace(/^\s*(?:(?:fix|feat)(?:\([^)]*\))?!?:)\s*/i, "")
    .replace(
      /^\s*(?:fix(?:e[sd]?|ing)?|add(?:ed|ing)?|allow(?:ed|ing)?|build(?:s|ing|built)?|create(?:d|s|ing)?|implement(?:ed|s|ing)?|make|support(?:ed|s|ing)?|use(?:d|s|ing)?)\s+/i,
      ""
    )
    .replace(/^\s*the\s+/i, "")
    .trim();
}

function coreSubjectTokens(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  return new Set(
    [...tokenizeLexical(coreTaskSubjectClause(analysis.raw))]
      .filter(
        (token) => token.length > 2
          && !CORE_EVIDENCE_NOISE.has(token)
          && !CORE_EVIDENCE_LOW_SIGNAL.has(token)
      )
  );
}

function coreConstraintClauses(task: string): string[] {
  return [
    ...task.matchAll(
      /\b(?:without|while\s+(?:preserving|keeping|maintaining)|but\s+(?:do\s+not|don't)|must\s+not|do\s+not)\b\s+([^.;]+)/gi
    )
  ].flatMap((match) => match[1]?.trim() ? [match[1].trim()] : []);
}

function coreConstraintTokens(task: string): Set<string> {
  return new Set(
    coreConstraintClauses(task)
      .flatMap((clause) => [...tokenizeLexical(clause)])
      .filter((token) => token.length > 2)
  );
}

function coreSubjectIdentifierCompacts(
  analysis: ReturnType<typeof analyzeTask>
): Set<string> {
  const subject = coreTaskSubjectClause(analysis.raw);
  return new Set([
    ...extractCodeIdentifierCompacts(subject),
    ...coreDelimitedIdentifierCompacts(subject)
  ]);
}

function coreStrongSubjectIdentifierCompacts(
  analysis: ReturnType<typeof analyzeTask>
): Set<string> {
  const subject = coreTaskSubjectClause(analysis.raw);
  const strongIdentifiers = extractCodeIdentifiers(subject).filter(
    (identifier) => /[_$]/.test(identifier)
      || /[a-z0-9][A-Z]/.test(identifier)
      || (!identifier.includes("-") && /[A-Z]{2,}/.test(identifier))
  );
  return new Set([
    ...strongIdentifiers.flatMap((identifier) => [...extractCodeIdentifierCompacts(identifier)]),
    ...coreDelimitedIdentifierCompacts(subject),
    ...coreLeadingExplicitIdentifierCompacts(analysis)
  ]);
}

function coreConstraintIdentifierCompacts(task: string): Set<string> {
  return new Set(
    coreConstraintClauses(task)
      .flatMap((clause) => [...extractCodeIdentifierCompacts(clause)])
  );
}

function coreNonConstraintIdentifierCompacts(
  analysis: ReturnType<typeof analyzeTask>
): Set<string> {
  const constraints = coreConstraintIdentifierCompacts(analysis.raw);
  return new Set(
    analysis.identifiers
      .flatMap((identifier) => [...extractCodeIdentifierCompacts(identifier)])
      .filter((identifier) => !constraints.has(identifier))
  );
}

function coreSubjectOwnerEvidence(
  item: ScoredNode,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const subjectTokens = coreSubjectTokens(analysis);
  const subjectIdentifiers = coreStrongSubjectIdentifierCompacts(analysis);
  const identityValues = [
    item.node.sourcePath,
    item.node.title,
    item.node.summary,
    item.matchedFact?.name ?? "",
    item.matchedFact?.searchText ?? ""
  ].join(" ");
  const identityIdentifiers = extractCodeIdentifierCompacts(identityValues);
  const identifierEvidence = intersection(identityIdentifiers, subjectIdentifiers).size;
  const pathEvidence = intersection(
    new Set([...corePathTokens(item.node.sourcePath), ...corePathScopeTokens(item.node.sourcePath)]),
    subjectTokens
  ).size;
  return identifierEvidence * 2 + pathEvidence;
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
  const constraintTokens = coreConstraintTokens(analysis.raw);
  return new Set(
    [...coreTaskTokens(analysis)]
      .filter(
        (token) => !outcomeTokens.has(token)
          && !constraintTokens.has(token)
          && !CORE_EVIDENCE_LOW_SIGNAL.has(token)
      )
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

function coreTargetIdentityTokens(task: string): Set<string> {
  const target = task.match(/\b(?:as|via)\s+([^#(]+)/i)?.[1];
  if (!target) return new Set();
  return new Set(
    [...tokenizeLexical(target)]
      .filter(
        (token) => token.length > 2
          && !CORE_EVIDENCE_NOISE.has(token)
          && !CORE_EVIDENCE_LOW_SIGNAL.has(token)
      )
  );
}

function coreCompoundIdentityEntities(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  const identities = coreNonConstraintIdentifierCompacts(analysis);
  return new Set(analysis.entities.filter((entity) => identities.has(compactCodeIdentifier(entity))));
}

function coreExplicitIdentityTokens(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  const explicitIdentifierTokens = [...coreNonConstraintIdentifierCompacts(analysis)]
    .flatMap((identity) => [...tokenizeLexical(identity)])
    .filter((token) => token.length > 2);
  return new Set([
    ...explicitIdentifierTokens,
    ...coreLeadingSubjectTokens(analysis)
  ]);
}

function coreExplicitEntityValues(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  const identifiers = coreNonConstraintIdentifierCompacts(analysis);
  return new Set(
    analysis.entities.filter((entity) => identifiers.has(compactCodeIdentifier(entity)))
  );
}

function coreLeadingSubjectTokens(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  const leadingSubject = coreLeadingSubject(analysis);
  return new Set(
    leadingSubject
      ? [...tokenizeLexical(leadingSubject)].filter(
        (token) => token.length > 2 && !CORE_EVIDENCE_NOISE.has(token)
      )
      : []
  );
}

function coreLeadingCodeIdentityTokens(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  const leadingSubject = coreLeadingSubject(analysis);
  if (
    !leadingSubject
    || !(/[_./-]/.test(leadingSubject) || /[a-z0-9][A-Z]/.test(leadingSubject) || /^[A-Z][A-Za-z0-9]*$/.test(leadingSubject))
  ) return new Set();
  return new Set(
    [...tokenizeLexical(leadingSubject)].filter(
      (token) => token.length > 2 && !CORE_EVIDENCE_NOISE.has(token)
    )
  );
}

function coreExactLeadingCodeIdentityEvidence(
  item: ScoredNode,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const targetTokens = coreLeadingCodeIdentityTokens(analysis);
  if (!targetTokens.size) return 0;
  const titleIdentities = [item.node.title, item.node.title.split(".").at(-1) ?? item.node.title];
  return Number(titleIdentities.some((identity) => {
    const identityTokens = coreNodeTokens(identity);
    return identityTokens.size === targetTokens.size
      && intersection(identityTokens, targetTokens).size === targetTokens.size;
  }));
}

function coreExplicitIdentifierImplementationEvidence(
  item: ScoredNode,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const requested = new Set([
    ...coreStrongSubjectIdentifierCompacts(analysis),
    ...coreLeadingExplicitIdentifierCompacts(analysis)
  ]);
  if (!requested.size) return 0;
  const identities = extractCodeIdentifierCompacts([
    item.node.sourcePath,
    item.node.title,
    item.node.summary,
    item.matchedFact?.name ?? "",
    item.matchedFact?.searchText ?? ""
  ].join(" "));
  return intersection(identities, requested).size;
}

function coreLeadingExplicitIdentifierCompacts(
  analysis: ReturnType<typeof analyzeTask>
): Set<string> {
  const analyzedIdentifiers = new Set(
    analysis.identifiers.flatMap(
      (identifier) => [...extractCodeIdentifierCompacts(identifier)]
    )
  );
  const leadingSubject = coreLeadingSubject(analysis);
  if (!leadingSubject) return new Set();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(leadingSubject)) {
    return new Set();
  }
  return new Set(
    [...extractCodeIdentifierCompacts(leadingSubject)]
      .filter((identifier) => analyzedIdentifiers.has(identifier))
  );
}

function coreDelimitedIdentifierCompacts(task: string): Set<string> {
  return new Set(
    [...task.matchAll(/`([^`]+)`/g)]
      .flatMap((match) => [...extractCodeIdentifierCompacts(match[1])])
  );
}

function coreLeadingSubject(analysis: ReturnType<typeof analyzeTask>): string | undefined {
  return analysis.raw.match(
    /^\s*(?:(?:fix|feat)(?:\([^)]*\))?!?:?|add|allow|create|implement|support)\s+(?:the\s+)?([A-Za-z_][A-Za-z0-9_.-]*)/i
  )?.[1];
}

function coreExplicitPathIdentityCoverage(
  sourcePath: string,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const basenameIdentityCoverage = intersection(
    new Set([...corePathTokens(sourcePath), ...corePathScopeTokens(sourcePath)]),
    coreExplicitIdentityTokens(analysis)
  ).size;
  const versionedScope = sourcePath.match(/(?:^|\/)(v\d+(?:[._-]\d+)*)(?:\/|$)/i)?.[1];
  const rawTaskTokens = tokenizeLexical(analysis.raw);
  const versionIdentityCoverage = versionedScope
    && [...tokenizeLexical(versionedScope)].some((token) => rawTaskTokens.has(token))
    ? 1
    : 0;
  return basenameIdentityCoverage + versionIdentityCoverage;
}

function corePathTokens(sourcePath: string): Set<string> {
  const tokens = coreNodeTokens(path.posix.basename(sourcePath));
  if (/(?:^|\/)(?:test_)?conftest\.py$/i.test(sourcePath)) tokens.add("fixture");
  return tokens;
}

function corePathScopeTokens(sourcePath: string): Set<string> {
  return new Set(
    sourcePath
      .replaceAll("\\", "/")
      .split("/")
      .slice(0, -1)
      .flatMap((segment) => [...tokenizeLexical(segment)])
      .filter((token) => token.length > 2 && !CORE_PATH_NOISE.has(token) && !CORE_EVIDENCE_NOISE.has(token))
  );
}

function coreRequestedLocaleScopes(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  const taskTokens = tokenizeLexical(analysis.raw);
  return new Set(
    [...CORE_LOCALE_ALIASES.entries()]
      .filter(([name]) => taskTokens.has(name))
      .map(([, code]) => code)
  );
}

function corePathVersionScope(sourcePath: string): string | undefined {
  return sourcePath.match(/(?:^|\/)(v\d+(?:[._-]\d+)*)(?:\/|$)/i)?.[1]?.toLowerCase();
}

function coreVersionModuleIdentity(sourcePath: string): string | undefined {
  return canonicalModuleStem(sourcePath).match(/^v\d+(?:[._-]\d+)*$/i)?.[0]?.toLowerCase();
}

function isVersionedDependencyImpactTest(
  testPath: string,
  anchorImplementationPath: string,
  nodes: PalaceNode[],
  relations: CoreSourceRelations,
  task: string
): boolean {
  const anchorVersion = coreVersionModuleIdentity(anchorImplementationPath);
  const testVersion = coreVersionModuleIdentity(testPath);
  if (
    !anchorVersion
    || !testVersion
    || anchorVersion === testVersion
    || !new RegExp(
      `(?:^|[^a-z0-9])${escapeRegExp(anchorVersion)}(?:[^a-z0-9]|$)`,
      "i"
    ).test(task)
  ) return false;

  const dependency = transitiveImportEvidence(testPath, anchorImplementationPath, relations);
  if (!dependency || dependency.strength < CORE_TRANSITIVE_IMPACT_RELATION_THRESHOLD) return false;

  return nodes.some((node) =>
    !node.startLine
    && node.sourcePath !== anchorImplementationPath
    && nodeHasEvidenceRole(node, "implementation")
    && nodeEvidenceScope(node) === "product"
    && coreVersionModuleIdentity(node.sourcePath) === testVersion
    && sourceTestModuleMirrorEvidence(node.sourcePath, testPath) >= 0.75
    && isDirectImport(testPath, node.sourcePath, relations)
    && (
      isDirectImport(node.sourcePath, anchorImplementationPath, relations)
      || (transitiveImportEvidence(
        node.sourcePath,
        anchorImplementationPath,
        relations
      )?.strength ?? 0) >= CORE_TRANSITIVE_IMPACT_RELATION_THRESHOLD
    )
  );
}

function corePathLocaleScope(sourcePath: string): string | undefined {
  const segments = sourcePath
    .replaceAll("\\", "/")
    .toLowerCase()
    .split("/")
    .slice(0, -1)
    .map((segment) => segment.replaceAll("_", "-"));
  return segments.find((segment) => CORE_LOCALE_CODES.has(segment));
}

function coreLocaleScopeAdjustment(
  sourcePath: string,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const requested = coreRequestedLocaleScopes(analysis);
  if (!requested.size) return 0;
  const candidate = corePathLocaleScope(sourcePath);
  if (!candidate) return -160;
  return requested.has(candidate) ? 520 : -800;
}

function coreImplicitPlatformScopePenalty(sourcePath: string, task: string): number {
  const normalizedPath = sourcePath.replaceAll("\\", "/").toLowerCase();
  const platformSpecific = /(?:^|\/)(?:backend|platform)[-_](?:fen|inotify|kqueue|linux|macos|other|posix|solaris|windows)(?:[._/-]|$)/.test(normalizedPath)
    || /(?:^|\/)[^/]+[-_](?:aix|bsd|darwin|freebsd|linux|macos|netbsd|openbsd|posix|solaris|windows)\.[^/]+$/.test(normalizedPath);
  if (!platformSpecific) return 0;
  const requestedPlatform = /\b(?:aix|backend|bsd|darwin|fen|freebsd|inotify|kqueue|linux|macos|netbsd|openbsd|platform|posix|solaris|windows)\b/i.test(task);
  return requestedPlatform ? 0 : 420;
}

function coreWorkspaceScope(sourcePath: string): string | undefined {
  const parts = sourcePath.replaceAll("\\", "/").toLowerCase().split("/").filter(Boolean);
  if (parts.length < 3) return undefined;
  if (["crates", "packages", "plugins", "workspace"].includes(parts[0]) && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }
  if (
    parts[0]
    && !["app", "lib", "src", "test", "tests"].includes(parts[0])
    && CORE_WORKSPACE_SOURCE_ROOTS.has(parts[1])
  ) return parts[0];
  return undefined;
}

function coreOwnershipScope(sourcePath: string): string {
  const workspace = coreWorkspaceScope(sourcePath);
  if (workspace) return workspace;
  const parts = sourcePath.replaceAll("\\", "/").toLowerCase().split("/").filter(Boolean);
  if (["lib", "src"].includes(parts[0]) && parts.length >= 3) {
    return `${parts[0]}/${parts[1]}`;
  }
  return ".";
}

function sameCoreOwnership(left: string, right: string): boolean {
  return coreOwnershipScope(left) === coreOwnershipScope(right);
}

function isCorePackageBoundaryPath(sourcePath: string): boolean {
  return /(^|\/)(?:lib|src)\/(?:index|lib|mod)\.[a-z0-9]+$/i.test(
    sourcePath.replaceAll("\\", "/")
  );
}

function coreWorkspacePairEvidence(
  implementation: CoreEvidenceCandidate,
  test: CoreEvidenceCandidate,
  implementationCandidates: CoreEvidenceCandidate[],
  testCandidates: CoreEvidenceCandidate[]
): number {
  const scope = coreWorkspaceScope(implementation.item.node.sourcePath);
  if (!scope || coreWorkspaceScope(test.item.node.sourcePath) !== scope) return 0;
  const implementationSupport = implementationCandidates.filter(
    (candidate) =>
      coreWorkspaceScope(candidate.item.node.sourcePath) === scope
      && candidate.directEvidence >= Math.max(100, implementation.directEvidence * 0.3)
  ).length;
  const testSupport = testCandidates.filter(
    (candidate) =>
      coreWorkspaceScope(candidate.item.node.sourcePath) === scope
      && candidate.directEvidence >= Math.max(100, test.directEvidence * 0.3)
  ).length;
  return Math.min(1, 0.35 + Math.max(0, implementationSupport - 1) * 0.2 + Math.max(0, testSupport - 1) * 0.1);
}

function coreLeadingIdentityEntities(analysis: ReturnType<typeof analyzeTask>): Set<string> {
  const leadingSubject = coreLeadingSubject(analysis);
  if (!leadingSubject) return new Set();
  const compactLeadingSubject = leadingSubject.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return new Set(
    analysis.entities.filter(
      (entity) => entity.toLowerCase().replace(/[^a-z0-9]+/g, "") === compactLeadingSubject
    )
  );
}

function coreExplicitMemberEntities(task: string): Set<string> {
  return new Set(
    (task.match(/\b[A-Za-z_][A-Za-z0-9_]*(?:\.|::)[A-Za-z_][A-Za-z0-9_]*\b/g) ?? [])
      .map((identity) => [...tokenizeLexical(identity)].join(""))
      .filter((identity) => identity.length > 3)
  );
}

function isOperationalMetadataPath(sourcePath: string): boolean {
  return /(^|\/)(?:\.circleci|\.github|\.gitlab)(\/|$)|(^|\/)(?:azure-pipelines|bitbucket-pipelines)\.ya?ml$/i.test(sourcePath);
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

function buildSourceRelations(
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  relevantSources: Set<string>,
  analysis: ReturnType<typeof analyzeTask>
): CoreSourceRelations {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const direct = new Map<string, number>();
  const directCounts = new Map<string, number>();
  const all = new Map<string, number>();
  const taskAlignedSymbolTests = new Set<string>();
  const directDependencies = new Set<string>();
  const directImports = new Set<string>();
  const importReachability = new Map<string, { strength: number; hops: number }>();
  const adjacency = new Map<string, Map<string, number>>();
  const importAdjacency = new Map<string, Map<string, number>>();
  const leadingCodeIdentityTokens = coreLeadingCodeIdentityTokens(analysis);
  const testSources = new Set(
    nodes.filter((node) => node.kind === "test").map((node) => node.sourcePath)
  );
  for (const edge of edges) {
    if (!CORE_RELATION_TYPES.has(edge.type)) continue;
    const fromNode = byId.get(edge.from);
    const toNode = byId.get(edge.to);
    const from = fromNode?.sourcePath;
    const to = toNode?.sourcePath;
    if (!from || !to || from === to) continue;
    const relationWeight = taskAwareSourceRelationWeight(edge, fromNode, toNode, analysis);
    if (relationWeight <= 0) continue;
    const key = sourceRelationKey(from, to);
    const relationTokens = coreNodeTokens(`${fromNode.title} ${toNode.title}`);
    if (
      ["tests", "tested_by"].includes(edge.type)
      && edge.weight >= 0.99
      && relationWeight >= 0.95
      && fromNode.startLine
      && toNode.startLine
      && leadingCodeIdentityTokens.size > 0
      && intersection(relationTokens, leadingCodeIdentityTokens).size === leadingCodeIdentityTokens.size
    ) taskAlignedSymbolTests.add(key);
    direct.set(key, Math.max(direct.get(key) ?? 0, relationWeight));
    directCounts.set(key, (directCounts.get(key) ?? 0) + 1);
    all.set(key, Math.max(all.get(key) ?? 0, relationWeight));
    if (edge.type === "imports") {
      directImports.add(directedSourceRelationKey(from, to));
      const imports = importAdjacency.get(from) ?? new Map<string, number>();
      imports.set(to, Math.max(imports.get(to) ?? 0, relationWeight));
      importAdjacency.set(from, imports);
    }
    if (edge.type === "depends_on") {
      directDependencies.add(directedSourceRelationKey(from, to));
    }
    const fromNeighbors = adjacency.get(from) ?? new Map<string, number>();
    const toNeighbors = adjacency.get(to) ?? new Map<string, number>();
    fromNeighbors.set(to, Math.max(fromNeighbors.get(to) ?? 0, relationWeight));
    toNeighbors.set(from, Math.max(toNeighbors.get(from) ?? 0, relationWeight));
    adjacency.set(from, fromNeighbors);
    adjacency.set(to, toNeighbors);
  }

  for (const start of relevantSources) {
    const queue: Array<{ sourcePath: string; hops: number; strength: number }> = [
      { sourcePath: start, hops: 0, strength: 1 }
    ];
    const best = new Map<string, number>([[start, 1]]);
    while (queue.length) {
      const current = queue.shift()!;
      if (current.hops >= 3) continue;
      if (current.hops > 0 && testSources.has(current.sourcePath)) continue;
      const neighbors = [...(adjacency.get(current.sourcePath)?.entries() ?? [])]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 24);
      for (const [neighbor, edgeWeight] of neighbors) {
        const hops = current.hops + 1;
        const strength = Math.min(current.strength, edgeWeight) * (hops === 1 ? 1 : 0.9);
        if (strength < 0.45 || strength <= (best.get(neighbor) ?? 0)) continue;
        best.set(neighbor, strength);
        if (neighbor !== start) {
          const key = sourceRelationKey(start, neighbor);
          all.set(key, Math.max(all.get(key) ?? 0, strength));
        }
        queue.push({ sourcePath: neighbor, hops, strength });
      }
    }
  }

  for (const start of relevantSources) {
    const queue: Array<{ sourcePath: string; hops: number; strength: number }> = [
      { sourcePath: start, hops: 0, strength: 1 }
    ];
    const best = new Map<string, { strength: number; hops: number }>([
      [start, { strength: 1, hops: 0 }]
    ]);
    while (queue.length) {
      const current = queue.shift()!;
      if (current.hops >= 3) continue;
      const imports = [...(importAdjacency.get(current.sourcePath)?.entries() ?? [])]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 24);
      for (const [target, edgeWeight] of imports) {
        const hops = current.hops + 1;
        const strength = Math.min(current.strength, edgeWeight) * (hops === 1 ? 1 : 0.9);
        if (strength < 0.45) continue;
        const previous = best.get(target);
        if (
          previous
          && (previous.strength > strength || (previous.strength === strength && previous.hops <= hops))
        ) continue;
        const evidence = { strength, hops };
        best.set(target, evidence);
        importReachability.set(directedSourceRelationKey(start, target), evidence);
        queue.push({ sourcePath: target, hops, strength });
      }
    }
  }
  return {
    direct,
    directCounts,
    all,
    taskAlignedSymbolTests,
    directDependencies,
    directImports,
    importReachability
  };
}

function taskAwareSourceRelationWeight(
  edge: PalaceEdge,
  fromNode: PalaceNode,
  toNode: PalaceNode,
  analysis: ReturnType<typeof analyzeTask>
): number {
  if (
    !["tests", "tested_by"].includes(edge.type)
    || (!fromNode.startLine && !toNode.startLine)
  ) return edge.weight;

  const relationTokens = coreNodeTokens(`${fromNode.title} ${toNode.title}`);
  const identityMatches = intersection(relationTokens, coreExplicitIdentityTokens(analysis)).size;
  const taskMatches = intersection(relationTokens, corePrimaryTaskTokens(analysis)).size;
  return identityMatches > 0 || taskMatches >= 2
    ? edge.weight
    : Math.min(0.35, edge.weight);
}

function strongestRelationTo(
  sourcePath: string,
  targets: Set<string>,
  relations: CoreSourceRelations,
  options: { excludeSelf?: boolean; transitive?: boolean } = {}
): number {
  const relationMap = options.transitive === false ? relations.direct : relations.all;
  return [...targets].reduce(
    (strongest, target) => Math.max(
      strongest,
      options.excludeSelf && target === sourcePath
        ? 0
        : relationMap.get(sourceRelationKey(sourcePath, target)) ?? 0
    ),
    0
  );
}

function sourceRelationKey(left: string, right: string): string {
  return [left, right].sort().join("\u0000");
}

function directedSourceRelationKey(from: string, to: string): string {
  return `${from}\u0000${to}`;
}

function isDirectImport(from: string, to: string, relations: CoreSourceRelations): boolean {
  return relations.directImports.has(directedSourceRelationKey(from, to));
}

function transitiveImportEvidence(
  from: string,
  to: string,
  relations: CoreSourceRelations
): { strength: number; hops: number } | undefined {
  const evidence = relations.importReachability.get(directedSourceRelationKey(from, to));
  return evidence && evidence.hops >= 2 ? evidence : undefined;
}

function strongestTransitiveImportTo(
  from: string,
  targets: Set<string>,
  relations: CoreSourceRelations
): number {
  return [...targets].reduce(
    (strongest, target) => Math.max(
      strongest,
      transitiveImportEvidence(from, target, relations)?.strength ?? 0
    ),
    0
  );
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
  if (
    canonicalModuleStem(implementationPath).toLowerCase()
      !== canonicalModuleStem(testPath).toLowerCase()
  ) return 0;
  const implementationWorkspaceScope = coreWorkspaceScope(implementationPath);
  const testWorkspaceScope = coreWorkspaceScope(testPath);
  if (
    implementationWorkspaceScope
    && testWorkspaceScope
    && implementationWorkspaceScope !== testWorkspaceScope
  ) return 0;
  const implementationParts = implementationPath.toLowerCase().split("/").slice(0, -1);
  const testParts = testPath.toLowerCase().split("/").slice(0, -1);
  const testRoot = testParts.findIndex((part) => ["__tests__", "spec", "specs", "test", "testing", "tests"].includes(part));
  const explicitTestFilename = /^(?:test|spec)[_.-]|[_.-](?:test|spec)\.[^.]+$/i.test(
    path.posix.basename(testPath)
  );
  if (testRoot < 0 && !explicitTestFilename) return 0;
  const implementationScope = new Set(
    implementationParts.filter((part) => !["lib", "src"].includes(part))
  );
  const unmatchedTestScope = testParts
    .slice(testRoot < 0 ? testParts.length : testRoot + 1)
    .filter((part) => !implementationScope.has(part));
  return 1 / (1 + unmatchedTestScope.length);
}

function sourceTestOwnerEvidence(implementationPath: string, testPath: string): number {
  const exactMirror = sourceTestModuleMirrorEvidence(implementationPath, testPath);
  if (exactMirror > 0) return exactMirror;
  const packageIntegration = packageRootIntegrationTestEvidence(implementationPath, testPath);
  if (packageIntegration > 0) return packageIntegration;

  const implementationStem = compactCodeIdentifier(canonicalModuleStem(implementationPath));
  const testStem = compactCodeIdentifier(canonicalModuleStem(testPath));
  if (
    implementationStem.length < 4
    || testStem.length < 4
    || CORE_GENERIC_MODULE_STEMS.has(implementationStem)
    || CORE_GENERIC_MODULE_STEMS.has(testStem)
    || !ownerStemEquivalent(implementationStem, testStem)
  ) return 0;

  const implementationWorkspaceScope = coreWorkspaceScope(implementationPath);
  const testWorkspaceScope = coreWorkspaceScope(testPath);
  if (
    implementationWorkspaceScope
    && testWorkspaceScope
    && implementationWorkspaceScope !== testWorkspaceScope
  ) return 0;

  const normalizedTestPath = testPath.replaceAll("\\", "/");
  const testParts = normalizedTestPath.toLowerCase().split("/").slice(0, -1);
  const testRoot = testParts.findIndex(
    (part) => ["__tests__", "spec", "specs", "test", "testing", "tests"].includes(part)
  );
  const explicitTestFilename = /^(?:test|spec)[_.-]|[_.-](?:test|spec)\.[^.]+$/i.test(
    path.posix.basename(normalizedTestPath)
  );
  if (testRoot < 0 && !explicitTestFilename) return 0;

  const implementationScope = new Set(
    implementationPath.toLowerCase().split("/").slice(0, -1)
      .filter((part) => !["lib", "src"].includes(part))
  );
  const unmatchedTestScope = testParts
    .slice(testRoot < 0 ? testParts.length : testRoot + 1)
    .filter((part) => !implementationScope.has(part));
  return 0.85 / (1 + unmatchedTestScope.length);
}

function packageRootIntegrationTestEvidence(implementationPath: string, testPath: string): number {
  const normalizedImplementation = implementationPath.replaceAll("\\", "/");
  const normalizedTest = testPath.replaceAll("\\", "/");
  if (!/(^|\/)(?:src\/lib|src\/index|lib\/index|index)\.[a-z0-9]+$/i.test(normalizedImplementation)) {
    return 0;
  }
  if (corePackageScope(normalizedImplementation) !== corePackageScope(normalizedTest)) return 0;

  const packageScope = corePackageScope(normalizedTest);
  const relativeTest = packageScope
    ? normalizedTest.slice(packageScope.length + 1)
    : normalizedTest;
  return /^(?:test|tests|spec|specs)\/(?:integration|main|test|tests)\.[a-z0-9]+$/i.test(relativeTest)
    ? 0.9
    : 0;
}

function ownerStemEquivalent(left: string, right: string): boolean {
  if (left === right) return true;
  const [longer, shorter] = left.length >= right.length ? [left, right] : [right, left];
  if (!longer.startsWith(shorter)) return false;
  return ["s", "ed", "er", "ing", "ion", "ation"].includes(longer.slice(shorter.length));
}

function taskOwnedSymbolStems(
  implementation: PalaceNode,
  analysis: ReturnType<typeof analyzeTask>
): Set<string> {
  const titleSegments = implementation.title
    .split(/(?:::|#|\.)/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const ownerSegments = titleSegments.length > 1
    ? titleSegments.slice(0, -1)
    : /^[A-Z]/.test(titleSegments[0] ?? "")
      ? titleSegments
      : [];
  const subjectStems = [...coreSubjectTokens(analysis)]
    .map((token) => compactCodeIdentifier(token))
    .filter((token) => token.length >= 4);
  return new Set(
    ownerSegments
      .flatMap((segment) => [...tokenizeLexical(segment)])
      .map((token) => compactCodeIdentifier(token))
      .filter((token) => token.length >= 4)
      .filter((token) => !CORE_GENERIC_MODULE_STEMS.has(token))
      .filter((token) => subjectStems.some((subject) => ownerStemEquivalent(token, subject)))
  );
}

function taskOwnedSymbolTestOwnerEvidence(
  implementation: PalaceNode,
  testPath: string,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const implementationWorkspaceScope = coreWorkspaceScope(implementation.sourcePath);
  const testWorkspaceScope = coreWorkspaceScope(testPath);
  if (
    implementationWorkspaceScope
    && testWorkspaceScope
    && implementationWorkspaceScope !== testWorkspaceScope
  ) return 0;

  const testStem = compactCodeIdentifier(canonicalModuleStem(testPath));
  if (testStem.length < 4 || CORE_GENERIC_MODULE_STEMS.has(testStem)) return 0;
  if (![...taskOwnedSymbolStems(implementation, analysis)].some(
    (ownerStem) => ownerStemEquivalent(ownerStem, testStem)
  )) return 0;

  const normalizedTestPath = testPath.replaceAll("\\", "/");
  const testParts = normalizedTestPath.toLowerCase().split("/").slice(0, -1);
  const testRoot = testParts.findIndex(
    (part) => ["__tests__", "spec", "specs", "test", "testing", "tests"].includes(part)
  );
  const implementationScope = new Set(
    implementation.sourcePath.toLowerCase().split("/").slice(0, -1)
      .filter((part) => !["lib", "src"].includes(part))
  );
  const unmatchedTestScope = testParts
    .slice(testRoot < 0 ? testParts.length : testRoot + 1)
    .filter((part) => !implementationScope.has(part));
  return 0.95 / (1 + unmatchedTestScope.length);
}

function taskOwnerVerificationEvidence(
  implementation: PalaceNode,
  testPath: string,
  analysis: ReturnType<typeof analyzeTask>
): number {
  return Math.max(
    sourceTestOwnerEvidence(implementation.sourcePath, testPath),
    taskOwnedSymbolTestOwnerEvidence(implementation, testPath, analysis)
  );
}

function discriminativeTestModuleMirrorEvidence(implementationPath: string, testPath: string): number {
  const stem = canonicalModuleStem(implementationPath);
  if (stem.length < 3 || CORE_GENERIC_MODULE_STEMS.has(stem)) return 0;
  return sourceTestOwnerEvidence(implementationPath, testPath);
}

function moduleStemAppearsInTask(sourcePath: string, task: string): boolean {
  const stemTokens = new Set(
    [...coreNodeTokens(canonicalModuleStem(sourcePath))].map(canonicalRouteConceptToken)
  );
  const taskTokens = new Set([...tokenizeLexical(task)].map(canonicalRouteConceptToken));
  return stemTokens.size > 0 && [...stemTokens].every((token) => taskTokens.has(token));
}

function isDiscriminativeTaskNamedModule(sourcePath: string, task: string): boolean {
  const stem = compactCodeIdentifier(canonicalModuleStem(sourcePath));
  return stem.length >= 3
    && !CORE_GENERIC_MODULE_STEMS.has(stem)
    && moduleStemAppearsInTask(sourcePath, task);
}

function hasTaskNamedCausalImplementationClosure(
  implementations: CoreEvidenceCandidate[],
  verification: CoreEvidenceCandidate,
  relations: CoreSourceRelations,
  analysis: ReturnType<typeof analyzeTask>,
  primaryTaskTokens: Set<string>
): boolean {
  if (coreExactExplicitIdentityTestEvidence(verification.item, analysis) === 0) return false;
  const taskNamed = implementations.filter((candidate) =>
    isDiscriminativeTaskNamedModule(candidate.item.node.sourcePath, analysis.raw)
  );
  if (taskNamed.length < 2) return false;

  const taskNamedPaths = new Set(taskNamed.map((candidate) => candidate.item.node.sourcePath));
  const causallyConnected = taskNamed.some((candidate) => {
    const peers = new Set(
      [...taskNamedPaths].filter((sourcePath) => sourcePath !== candidate.item.node.sourcePath)
    );
    return strongestRelationTo(candidate.item.node.sourcePath, peers, relations) >= 0.6;
  });
  if (!causallyConnected) return false;

  const coveredTaskTokens = new Set(taskNamed.flatMap((candidate) => [...candidate.taskCoverage]));
  const diagnosticTaskTokens = intersection(primaryTaskTokens, CORE_DIAGNOSTIC_BEHAVIOR);
  const explicitIdentityTokens = coreExplicitIdentityTokens(analysis);
  return intersection(coveredTaskTokens, diagnosticTaskTokens).size > 0
    && intersection(coveredTaskTokens, explicitIdentityTokens).size > 0;
}

function coreExactExplicitIdentityTestEvidence(
  item: ScoredNode,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const testStem = compactCodeIdentifier(canonicalModuleStem(item.node.sourcePath));
  if (!testStem) return 0;
  const explicitIdentities = coreNonConstraintIdentifierCompacts(analysis);
  return Number(explicitIdentities.has(testStem));
}

function moduleStemTaskPosition(sourcePath: string, task: string): number {
  if (!moduleStemAppearsInTask(sourcePath, task)) return Number.MAX_SAFE_INTEGER;
  const taskTokens = [...tokenizeLexical(task)];
  return Math.min(
    ...[...coreNodeTokens(canonicalModuleStem(sourcePath))]
      .map((token) => taskTokens.indexOf(token))
      .filter((position) => position >= 0)
  );
}

function selectAdditiveExternalContractRoute(
  selected: ScoredNode[],
  scored: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType,
  limit: number
): CoreRouteSelection | undefined {
  if (taskType !== "feature" || limit < 2) return undefined;
  const contract = analysis.raw.match(
    /\b([a-z_][A-Za-z0-9_]*)\s*(?:::|\.)\s*([A-Z][A-Za-z0-9_]*)\b/
  );
  const target = analysis.raw.match(/\bfor\s+`?([A-Z][A-Za-z0-9_]*)`?\b/);
  if (!contract?.[1] || !contract[2] || !target?.[1]) return undefined;

  const contractTokens = coreNodeTokens(`${contract[1]} ${contract[2]}`);
  const targetTokens = coreNodeTokens(target[1]);
  if (!contractTokens.size || !targetTokens.size) return undefined;
  const containsTokens = (item: ScoredNode, tokens: Set<string>) => {
    const nodeTokens = coreNodeTokens(
      `${item.node.sourcePath} ${item.node.title} ${item.node.summary} ${item.matchedFact?.name ?? ""} ${item.matchedFact?.searchText ?? ""}`
    );
    return [...tokens].every((token) => nodeTokens.has(token));
  };
  const implementation = selected.find(
    (item) => isImplementationCandidate(item.node) && containsTokens(item, targetTokens)
  );
  const verification = selected.find(
    (item) => isDirectTestCandidate(item) && containsTokens(item, targetTokens)
  );
  if (!implementation || !verification) return undefined;
  if (selected.some((item) => isImplementationCandidate(item.node) && containsTokens(item, contractTokens))) {
    return undefined;
  }

  const implementationScope = corePackageScope(implementation.node.sourcePath);
  const packageBoundary = scored
    .filter((item) => isPackageManifestPath(item.node.sourcePath))
    .filter((item) => corePackageScope(item.node.sourcePath) === implementationScope)
    .sort((left, right) => right.score - left.score
      || left.node.sourcePath.localeCompare(right.node.sourcePath))[0];
  const routedPackageBoundary = packageBoundary
    ? {
        ...packageBoundary,
        reasons: [
          "package boundary for an additive external contract",
          ...packageBoundary.reasons
        ]
      }
    : undefined;
  return {
    route: uniqueScoredNodes([
      implementation,
      ...(routedPackageBoundary ? [routedPackageBoundary] : []),
      verification
    ]).slice(0, limit),
    confidenceCap: 0.4,
    causalClosed: true
  };
}

function isPackageManifestPath(sourcePath: string): boolean {
  return /(^|\/)(?:cargo\.toml|package\.json|pyproject\.toml|setup\.cfg|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|composer\.json)$/i.test(
    sourcePath.replaceAll("\\", "/")
  );
}

function corePackageScope(sourcePath: string): string {
  const normalized = sourcePath.replaceAll("\\", "/");
  const sourceBoundary = normalized.match(/^(.*?)(?:\/)?(?:src|lib|test|tests)(?:\/|$)/i);
  if (sourceBoundary) return sourceBoundary[1]?.replace(/\/$/, "") ?? "";
  return path.posix.dirname(normalized) === "." ? "" : path.posix.dirname(normalized);
}

function uniqueScoredNodes(items: ScoredNode[]): ScoredNode[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.node.sourcePath)) return false;
    seen.add(item.node.sourcePath);
    return true;
  });
}

function explicitTaskModuleMirrorEvidence(
  implementationPath: string,
  testPath: string,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const mirrorEvidence = sourceTestOwnerEvidence(implementationPath, testPath);
  if (mirrorEvidence <= 0) return 0;
  const implementationTokens = coreNodeTokens(canonicalModuleStem(implementationPath));
  return intersection(implementationTokens, coreExplicitIdentityTokens(analysis)).size > 0
    ? Math.max(0.75, mirrorEvidence)
    : 0;
}

function colocatedGenericTestEvidence(implementationPath: string, testPath: string): number {
  const implementationDirectory = path.posix.dirname(implementationPath).toLowerCase();
  const testDirectory = path.posix.dirname(testPath).toLowerCase();
  const testBasename = path.posix.basename(testPath).toLowerCase();
  return implementationDirectory === testDirectory
    && /^(?:spec|test|tests)\.[a-z0-9]+$/.test(testBasename)
    ? 1
    : 0;
}

function explicitVersionPairEvidence(
  implementationPath: string,
  testPath: string,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const implementationVersion = implementationPath.match(/(?:^|\/)(v\d+(?:[._-]\d+)*)(?:\/|$)/i)?.[1]?.toLowerCase();
  if (!implementationVersion || !tokenizeLexical(analysis.raw).has(implementationVersion)) return 0;
  const testVersion = testPath.match(/(?:^|\/)(v\d+(?:[._-]\d+)*)(?:\/|$)/i)?.[1]?.toLowerCase();
  return testVersion === implementationVersion ? 1 : -1;
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
    || isTypeTestPath(sourcePath)
    || /(^|\/)(?:test|tests|testing|spec|__tests__)(\/|$)|\.(?:test|spec)\.[^.]+$/.test(sourcePath)
    || /(^|\/)(?:test|tests|spec)\.[a-z0-9]+$/.test(sourcePath)
    || /(^|\/)(?:test_[^/]+|[^/]+_(?:test|spec))\.[a-z0-9]+$/.test(sourcePath)
    || /(^|\/)[^/]+tests?\.(?:cs|java|kt)$/.test(sourcePath);
}

function pruneRedundantVerificationNoise(
  items: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType
): ScoredNode[] {
  if (taskType === "release") return items;
  const verification = items.filter(isDirectTestCandidate);
  if (verification.length < 2) return items;
  const implementations = items.filter(
    (item) => isImplementationCandidate(item.node) && !isDirectTestCandidate(item)
  );
  const implementationPaths = new Set(implementations.map((item) => item.node.sourcePath));
  if (!implementationPaths.size) return items;
  const relevantSources = new Set(items.map((item) => item.node.sourcePath));
  const relations = buildSourceRelations(edges, nodes, relevantSources, analysis);
  const primaryTaskTokens = corePrimaryTaskTokens(analysis);
  const explicitIdentityTokens = coreExplicitIdentityTokens(analysis);
  const behaviorTokens = setDifference(primaryTaskTokens, explicitIdentityTokens);
  const memberIntent = additiveMemberIntent(analysis);
  const typeTestPaths = new Set(
    verification
      .filter((item) => isTypeTestPath(item.node.sourcePath))
      .map((item) => item.node.sourcePath)
  );
  const runtimeEvidence = verification
    .filter((item) => !typeTestPaths.has(item.node.sourcePath))
    .map((item) => {
    const profile = coreEvidenceProfile(item, analysis, "test");
    const taskCoverage = intersection(profile.taskCoverage, primaryTaskTokens).size;
    const relationEvidence = strongestRelationTo(
      item.node.sourcePath,
      implementationPaths,
      relations
    );
        const mirroredImplementations = implementations
          .map((implementation) => ({
            sourcePath: implementation.node.sourcePath,
            evidence: taskOwnerVerificationEvidence(
              implementation.node,
              item.node.sourcePath,
              analysis
            ),
            subjectOwnerEvidence: coreSubjectOwnerEvidence(implementation, analysis)
          }))
        .sort((left, right) => right.evidence - left.evidence
          || right.subjectOwnerEvidence - left.subjectOwnerEvidence
          || Number(moduleStemAppearsInTask(right.sourcePath, analysis.raw))
            - Number(moduleStemAppearsInTask(left.sourcePath, analysis.raw))
          || left.sourcePath.localeCompare(right.sourcePath));
      const mirroredImplementation = mirroredImplementations[0];
      const testScopeTokens = corePathScopeTokens(item.node.sourcePath);
      const ownershipAffinity = implementations.reduce((strongest, implementation) => {
        const implementationTokens = new Set([
          ...corePathScopeTokens(implementation.node.sourcePath),
          ...corePathTokens(implementation.node.sourcePath)
        ]);
        return Math.max(strongest, intersection(testScopeTokens, implementationTokens).size);
      }, 0);
      const versionedImpact = implementations.some((implementation) =>
        isVersionedDependencyImpactTest(
          item.node.sourcePath,
          implementation.node.sourcePath,
          nodes,
          relations,
          analysis.raw
        )
      );
      const taskAlignedTransitiveImpact = strongestTransitiveImportTo(
        item.node.sourcePath,
        implementationPaths,
        relations
      ) >= CORE_TRANSITIVE_IMPACT_RELATION_THRESHOLD
        && explicitIdentityTokens.size > 0
        && intersection(profile.taskCoverage, explicitIdentityTokens).size > 0
        && intersection(profile.taskCoverage, behaviorTokens).size >= 2;
      const candidate: CoreEvidenceCandidate = {
        item,
        directEvidence: profile.directEvidence,
        relationEvidence,
        pairEvidence: 0,
        totalEvidence: profile.directEvidence + relationEvidence * 500,
        taskCoverage: profile.taskCoverage,
        entityCoverage: profile.entityCoverage
      };
      return {
        item,
        profile,
        taskCoverage,
        relationEvidence,
        moduleMirrorEvidence: mirroredImplementation?.evidence ?? 0,
        subjectOwnerEvidence: mirroredImplementation?.subjectOwnerEvidence ?? 0,
        ownershipAffinity,
        mirroredImplementationPath: mirroredImplementation?.sourcePath,
        taskNamedMirror: Boolean(
          mirroredImplementation
          && mirroredImplementation.evidence >= 0.75
          && moduleStemAppearsInTask(mirroredImplementation.sourcePath, analysis.raw)
        ),
        publicApiIntegration: memberIntent
          ? candidateIsPublicApiIntegrationTest(candidate, memberIntent)
          : 0,
        protectedImpact: versionedImpact,
        taskAlignedTransitiveImpact,
        facet: runtimeVerificationFacet(item.node.sourcePath),
        supported: taskCoverage > 0 || relationEvidence >= 0.6
      };
    });
  const supportedRuntime = runtimeEvidence.filter((candidate) => candidate.supported);
  const rankedRuntime = (supportedRuntime.length ? supportedRuntime : runtimeEvidence)
    .sort((left, right) =>
      right.publicApiIntegration - left.publicApiIntegration
      || Number(right.protectedImpact) - Number(left.protectedImpact)
      || right.subjectOwnerEvidence - left.subjectOwnerEvidence
      || Number(right.taskNamedMirror) - Number(left.taskNamedMirror)
      || right.moduleMirrorEvidence - left.moduleMirrorEvidence
      || right.ownershipAffinity - left.ownershipAffinity
      || right.relationEvidence - left.relationEvidence
      || right.taskCoverage - left.taskCoverage
      || right.profile.entityCoverage.size - left.profile.entityCoverage.size
      || right.profile.directEvidence - left.profile.directEvidence
      || right.item.score - left.item.score
      || left.item.node.sourcePath.localeCompare(right.item.node.sourcePath)
    );
  const selectedRuntimePaths = new Set<string>();
  const representedTaskNamedImplementations = new Set<string>();
  const representedFacets = new Set<string>();
  const appendRuntime = (candidate?: typeof rankedRuntime[number]): void => {
    if (!candidate || selectedRuntimePaths.has(candidate.item.node.sourcePath)) return;
    selectedRuntimePaths.add(candidate.item.node.sourcePath);
    if (candidate.taskNamedMirror && candidate.mirroredImplementationPath) {
      representedTaskNamedImplementations.add(candidate.mirroredImplementationPath);
    }
    if (candidate.facet) representedFacets.add(candidate.facet);
  };
  appendRuntime(
    rankedRuntime.find((candidate) => candidate.publicApiIntegration > 0)
    ?? rankedRuntime.find((candidate) => !candidate.protectedImpact && candidate.moduleMirrorEvidence >= 0.75)
    ?? rankedRuntime.find((candidate) => !candidate.protectedImpact)
    ?? rankedRuntime[0]
  );
  for (const candidate of rankedRuntime.filter((item) => item.protectedImpact)) {
    appendRuntime(candidate);
  }
  for (const candidate of rankedRuntime.filter((item) => item.taskNamedMirror)) {
    if (selectedRuntimePaths.size >= 3) break;
    if (
      candidate.mirroredImplementationPath
      && !representedTaskNamedImplementations.has(candidate.mirroredImplementationPath)
    ) appendRuntime(candidate);
  }
  for (const candidate of rankedRuntime.filter((item) => item.facet)) {
    if (selectedRuntimePaths.size >= 2) break;
    const facet = candidate.facet;
    if (facet && !representedFacets.has(facet)) appendRuntime(candidate);
  }
  const explicitRuntimeTestConcepts = new Set(
    rankedRuntime
      .map((candidate) => explicitRuntimeTestConcept(candidate.item, analysis.raw))
      .filter((concept): concept is string => Boolean(concept))
  );
  const additiveCallTestQuota = /\b(?:add|introduce|expose|implement)\b[\s\S]{0,80}\b[A-Za-z_$][A-Za-z0-9_$]*\s*\(\s*\)/i.test(analysis.raw)
    ? Math.min(2, new Set(
        rankedRuntime
          .filter((candidate) => candidate.moduleMirrorEvidence >= 0.75)
          .map((candidate) => candidate.mirroredImplementationPath)
          .filter((sourcePath): sourcePath is string => Boolean(sourcePath))
      ).size)
    : 0;
  const requestedRuntimeTests = Math.max(
    requestedRuntimeTestQuota(analysis.raw),
    explicitRuntimeTestConcepts.size,
    additiveCallTestQuota
  );
  for (const candidate of rankedRuntime) {
    if (selectedRuntimePaths.size >= requestedRuntimeTests) break;
    appendRuntime(candidate);
  }
  const supportedPaths = new Set([...typeTestPaths, ...selectedRuntimePaths]);
  return items.filter(
    (item) => !isDirectTestCandidate(item) || supportedPaths.has(item.node.sourcePath)
  );
}

function requestedRuntimeTestQuota(task: string): number {
  if (
    /\b(?:three|3)\b.{0,20}\b(?:tests?(?![\\/])|test\s+cases?|specs?)\b/i.test(task)
    || /(?:三|3)\s*(?:个|個)?\s*(?:测试|測試|用例|案例)/.test(task)
  ) return 3;
  const requestsProductTest = /\b(?:focused\s+|regression\s+)?tests?\b/i.test(task)
    || /(?:回归|回歸)(?:测试|測試)/.test(task);
  const requestsVerificationScript = /\b(?:verification|validation|verify)\s+scripts?\b/i.test(task)
    || /(?:验证|驗證|校验|校驗)脚本/.test(task);
  if (requestsProductTest && requestsVerificationScript) return 2;
  if (
    /\b(?:both|two|2|a\s+pair\s+of)\b.{0,20}\b(?:tests?(?![\\/])|test\s+cases?|specs?)\b/i.test(task)
    || /\b(?:focused\s+|regression\s+)?tests(?![\\/])\b|\btest\s+cases\b|\b(?:regressions|specs)\b/i.test(task)
    || /(?:两|兩|2)\s*(?:个|個)?\s*(?:测试|測試|用例|案例)|(?:多个|多個)\s*(?:测试|測試|用例|案例)/.test(task)
  ) return 2;
  return 1;
}

function explicitRuntimeTestConcept(item: ScoredNode, task: string): string | undefined {
  if (!/\b(?:regressions|specs|tests)(?![\\/])\b/i.test(task)) return undefined;
  if (explicitTestConceptAffinity(item.node.sourcePath, task) < 1) return undefined;
  const moduleCompact = compactCodeIdentifier(canonicalModuleStem(item.node.sourcePath));
  if (
    moduleCompact.length >= 4
    && !CORE_GENERIC_MODULE_STEMS.has(moduleCompact)
    && extractCodeIdentifierCompacts(task).has(moduleCompact)
  ) return moduleCompact;
  const taskTokens = new Set([...tokenizeLexical(task)].map(canonicalRouteConceptToken));
  return [...tokenizeLexical(path.posix.basename(item.node.sourcePath))]
    .map(canonicalRouteConceptToken)
    .find((token) => token.length > 3
      && !["release", "publish", "spec", "test", "tests"].includes(token)
      && taskTokens.has(token));
}

function runtimeVerificationFacet(sourcePath: string): string | undefined {
  const normalized = sourcePath.replaceAll("\\", "/").toLowerCase();
  if (/(?:^|[-_.\/])accuracy(?:[-_.\/]|$)/.test(normalized)) return "accuracy";
  if (/(?:^|[-_.\/])mocks?(?:[-_.\/]|$)/.test(normalized)) return "mock";
  if (/(?:^|[-_.\/])(?:utils?|helpers?)(?:[-_.\/]|$)/.test(normalized)) return "utility";
  if (/(?:^|[-_.\/])search(?:[-_.\/]|$)/.test(normalized)) return "search";
  if (/(?:^|[-_.\/])(?:integration|interceptors?)(?:[-_.\/]|$)/.test(normalized)) return "integration";
  if (/(?:^|[-_.\/])(?:e2e|end-to-end|acceptance|browser)(?:[-_.\/]|$)/.test(normalized)) return "end-to-end";
  if (/(?:^|[-_.\/])(?:contract|smoke)(?:[-_.\/]|$)/.test(normalized)) return "contract";
  return undefined;
}

function pruneRedundantLexicalRouteNoise(
  items: ScoredNode[],
  edges: PalaceEdge[],
  nodes: PalaceNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType
): ScoredNode[] {
  if (taskType === "release") return items;
  const hasTypeDeclaration = items.some((item) => isTypeDeclarationPath(item.node.sourcePath));
  const packageMetadataRequested = taskRequestsPackageMetadata(analysis.raw);
  const licenseMetadataRequested = taskRequestsLicenseMetadata(analysis.raw);
  const implementationProfiles = items
    .filter((item) => isImplementationCandidate(item.node) && !isDirectTestCandidate(item))
    .map((item) => ({ item, profile: coreEvidenceProfile(item, analysis, "implementation") }));
  const strongestDirectEvidence = Math.max(
    0,
    ...implementationProfiles.map(({ profile }) => profile.directEvidence)
  );
  const strongImplementationAnchors = implementationProfiles.filter(({ profile }) =>
    profile.directEvidence >= Math.max(160, strongestDirectEvidence * 0.55)
    && (
      intersection(profile.taskCoverage, corePrimaryTaskTokens(analysis)).size >= 2
      || profile.entityCoverage.size > 0
    )
  ).length;
  const profileByPath = new Map(
    implementationProfiles.map(({ item, profile }) => [item.node.sourcePath, profile])
  );
  const relevantSources = new Set(items.map((item) => item.node.sourcePath));
  const relations = buildSourceRelations(edges, nodes, relevantSources, analysis);
  const verificationPaths = new Set(
    items.filter(isDirectTestCandidate).map((item) => item.node.sourcePath)
  );
  const strongImplementationPaths = new Set(
    implementationProfiles
      .filter(({ profile }) =>
        profile.directEvidence >= Math.max(160, strongestDirectEvidence * 0.55)
        && (
          intersection(profile.taskCoverage, corePrimaryTaskTokens(analysis)).size >= 2
          || profile.entityCoverage.size > 0
        )
      )
      .map(({ item }) => item.node.sourcePath)
  );

  return items.filter((item) => {
    const sourcePath = item.node.sourcePath;
    const strongRouteReason = item.reasons.some((reason) =>
      /^(?:expanded through|required task-aligned causal|materialized transitive implementation bridge|directly coordinates|declares the owner|package boundary)/i.test(reason)
    );
    if (
      isPackageManifestPath(sourcePath)
      && !packageMetadataRequested
      && !hasTypeDeclaration
      && !strongRouteReason
    ) return false;
    if (isLicenseArtifactPath(sourcePath) && !licenseMetadataRequested && !strongRouteReason) {
      return false;
    }
    if (!isImplementationCandidate(item.node) || isDirectTestCandidate(item)) return true;
    if (strongImplementationAnchors < 2 || strongRouteReason) return true;
    if (moduleStemAppearsInTask(sourcePath, analysis.raw)) return true;
    const jointlyExercisedCausalSibling = verificationPaths.size > 0
      && strongestRelationTo(sourcePath, verificationPaths, relations) >= 0.75
      && strongestRelationTo(sourcePath, strongImplementationPaths, relations) >= 0.6;
    if (jointlyExercisedCausalSibling) return true;

    const profile = profileByPath.get(sourcePath);
    if (!profile) return true;
    const primaryCoverage = intersection(profile.taskCoverage, corePrimaryTaskTokens(analysis));
    const genericCoverage = new Set(
      [...primaryCoverage].filter((token) => !["default", "new", "old", "related", "version"].includes(token))
    );
    const weakLexicalOnly = profile.entityCoverage.size === 0
      && genericCoverage.size === 0
      && item.matchedKeywordCount <= 1
      && profile.directEvidence < strongestDirectEvidence * 0.55;
    return !weakLexicalOnly;
  });
}

function taskRequestsPackageMetadata(task: string): boolean {
  return /\b(?:package|manifest|dependency|dependencies|cargo|crate|npm|pnpm|yarn)\b/i.test(task)
    || /\b(?:bump|publish|release)\b.{0,24}\bversion\b|\bversion\b.{0,24}\b(?:bump|publish|release)\b/i.test(task)
    || /(?:依赖|依賴|套件|软件包|軟體包|清单|清單|发布|發佈).{0,16}(?:版本|更新|配置)|(?:版本|更新|配置).{0,16}(?:依赖|依賴|套件|软件包|軟體包|清单|清單|发布|發佈)/.test(task);
}

function isLicenseArtifactPath(sourcePath: string): boolean {
  return /(^|\/)(?:licen[cs]e|copying|notice)(?:[-_.].*)?$/i.test(sourcePath);
}

function taskRequestsLicenseMetadata(task: string): boolean {
  return /\b(?:license|licensing|copyright|attribution|notice|compliance)\b/i.test(task)
    || /(?:许可|許可|授权|授權|版权|版權|归属|歸屬|合规|合規)/.test(task);
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
    const surfaceCandidates = surface === "implementation" && taskRequestsGeneratedMcpArtifactOnly(analysis.raw)
      ? scored.filter((item) => !matchesRouteSurface(item.node, "mcp"))
      : scored;
    const quota = generalSurfaceQuota(surfaceCandidates, surface, requested, analysis);
    for (const representative of selectGeneralSurfaceRepresentatives(surfaceCandidates, surface, analysis, quota)) {
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
  quota: number,
  allScored: ScoredNode[] = scored
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
  const explicitIdentifierCompacts = extractCodeIdentifierCompacts(analysis.raw);
  for (const item of ranked) {
    const moduleStem = compactCodeIdentifier(canonicalModuleStem(item.node.sourcePath));
    if (
      moduleStem.length < 4
      || CORE_GENERIC_MODULE_STEMS.has(moduleStem)
      || !explicitIdentifierCompacts.has(moduleStem)
    ) continue;
    result.push(item);
    const concept = implementationPathConcept(item, analysis);
    rememberImplementationConcept(concepts, concept);
    if (result.length >= quota) return result;
  }
  for (const concern of declaredImplementationConcepts(analysis.raw)) {
    const representative = ranked.find(
      (item) => implementationPathConcept(item, analysis) === concern
        && !result.some((selected) => selected.node.sourcePath === item.node.sourcePath)
    );
    if (!representative) continue;
    result.push(representative);
    rememberImplementationConcept(concepts, concern);
    if (result.length >= quota) return result;
  }
  const explicitConcerns = explicitlyRequestedTestConcepts(allScored, analysis);
  for (const concern of explicitConcerns) {
    if (concepts.has(concern)) continue;
    const representative = ranked
      .map((item) => ({ item, affinity: implementationConcernAffinity(item, concern) }))
      .filter(({ item, affinity }) => affinity > 0
        && !result.some((selected) => selected.node.sourcePath === item.node.sourcePath))
      .sort((left, right) => right.affinity - left.affinity
        || right.item.score - left.item.score
        || left.item.node.sourcePath.localeCompare(right.item.node.sourcePath))[0]?.item;
    if (!representative) continue;
    result.push(representative);
    rememberImplementationConcept(concepts, concern);
    if (result.length >= quota) return result;
  }
  const conceptual = ranked.filter((item) => implementationPathConcept(item, analysis));
  for (const item of conceptual.length ? conceptual : ranked) {
    const concept = implementationPathConcept(item, analysis);
    if (concept && concepts.has(concept)) continue;
    if (result.some((selected) => selected.node.sourcePath === item.node.sourcePath)) continue;
    result.push(item);
    rememberImplementationConcept(concepts, concept);
    if (result.length >= quota) break;
  }
  return result;
}

function rememberImplementationConcept(concepts: Set<string>, concept: string | undefined): void {
  if (!concept) return;
  concepts.add(concept);
  if (concept === "routing" || concept.startsWith("routing-")) concepts.add("route");
}

function declaredImplementationConcepts(task: string): string[] {
  return [
    hasTaskAnalysisIntent(task) ? "task-analysis" : undefined,
    hasTaskClassificationIntent(task) ? "task-classification" : undefined,
    hasPublicationIntentIntent(task) ? "publication-intent" : undefined,
    hasIndexFreshnessIntent(task) ? "index-freshness" : undefined,
    hasRoutePlanningIntent(task) ? "routing-plan" : undefined,
    hasRouteScoringIntent(task) ? "routing-score" : undefined
  ].filter((concept): concept is string => Boolean(concept));
}

function explicitlyRequestedTestConcepts(
  scored: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>
): string[] {
  const concepts: string[] = [];
  for (const item of scored) {
    if (!isDirectTestCandidate(item)) continue;
    if (explicitTestConceptAffinity(item.node.sourcePath, analysis.raw) < 3) continue;
    const concept = explicitRuntimeTestConcept(item, analysis.raw);
    if (!concept || concepts.includes(concept)) continue;
    concepts.push(concept);
  }
  return concepts;
}

function implementationConcernAffinity(item: ScoredNode, concern: string): number {
  const canonicalConcern = canonicalRouteConceptToken(concern);
  const normalized = item.node.sourcePath.replaceAll("\\", "/").toLowerCase();
  const basenameTokens = new Set(
    [...tokenizeLexical(path.posix.basename(normalized))].map(canonicalRouteConceptToken)
  );
  if (basenameTokens.has(canonicalConcern)) return 3;
  const parentTokens = new Set(
    [...tokenizeLexical(path.posix.basename(path.posix.dirname(normalized)))].map(canonicalRouteConceptToken)
  );
  if (parentTokens.has(canonicalConcern)) return 2;
  const evidenceTokens = new Set(
    [...tokenizeLexical([
      item.node.title,
      item.node.summary.replaceAll(item.node.sourcePath, " "),
      item.matchedFact?.name
    ].filter(Boolean).join(" "))].map(canonicalRouteConceptToken)
  );
  return evidenceTokens.has(canonicalConcern) ? 1 : 0;
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
        .map((item) => implementationPathConcept(item, analysis))
        .filter((concept): concept is string => Boolean(concept))
    );
    return Math.max(
      1,
      Math.min(4, Math.max(concepts.size, routingImplementationConcernCount(analysis.raw)))
    );
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
  if (hasEvidenceModelIntent(analysis.raw)) declaredConcerns.add("evidence-model");
  if (hasModeSelectionIntent(analysis.raw)) declaredConcerns.add("mode-selection");
  if (hasContextPackingIntent(analysis.raw)) declaredConcerns.add("context-packing");
  if (hasEvaluationMeasurementIntent(analysis.raw)) declaredConcerns.add("evaluation-measurement");
  if (hasIndexFreshnessIntent(analysis.raw)) declaredConcerns.add("index-freshness");
  const namedTestCount = explicitRequestedTestConceptCount(scored, analysis);
  const availableConcernCount = Math.max(1, concepts.size);
  const inferredConcernCount = namedTestCount > 0
    ? namedTestCount
    : declaredConcerns.size
      ? Math.min(declaredConcerns.size, availableConcernCount)
      : concepts.size;
  const requestedConcernCount = Math.max(
    inferredConcernCount,
    declaredConcerns.size ? Math.min(declaredConcerns.size, availableConcernCount) : 0
  );
  const directTestQuota = Math.max(1, Math.min(5, requestedConcernCount));
  return Math.min(6, directTestQuota + requestedVerificationScriptQuota(analysis));
}

function explicitRequestedTestConceptCount(
  scored: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>
): number {
  return new Set(
    scored
      .filter((item) => isDirectTestCandidate(item))
      .filter((item) => explicitTestConceptAffinity(item.node.sourcePath, analysis.raw) >= 3)
      .map((item) => explicitRuntimeTestConcept(item, analysis.raw))
      .filter((concept): concept is string => Boolean(concept))
  ).size;
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
    if (/(?:^|\/)task-intent\.[^.]+$/.test(sourcePath) && hasTaskAnalysisIntent(analysis.raw)) priority += 260;
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
  const normalized = sourcePath.replaceAll("\\", "/").toLowerCase();
  const parts = normalized.split("/");
  const testRoot = parts.findIndex((part) => ["__tests__", "spec", "specs", "test", "testing", "tests"].includes(part));
  const conceptPath = testRoot >= 0
    ? parts.slice(testRoot + 1).join("/")
    : path.posix.basename(normalized);
  const pathTokens = tokenizeLexical(conceptPath);
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

function implementationPathConcept(item: ScoredNode, analysis: ReturnType<typeof analyzeTask>): string | undefined {
  const sourcePath = item.node.sourcePath;
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
  const pathConcept = rawTokens.find(
    (token) => token.length > 3 && !ignored.has(token) && pathTokens.has(token)
  );
  if (pathConcept) return pathConcept;

  const evidenceTokens = tokenizeLexical([
    item.node.title,
    item.node.summary.replaceAll(item.node.sourcePath, " "),
    item.matchedFact?.name
  ].filter(Boolean).join(" "));
  const evidenceNoise = new Set([
    ...ignored,
    "bounded",
    "bundle",
    "change",
    "complete",
    "evidence",
    "generic",
    "improve",
    "mcp",
    "plugin",
    "repair",
    "replay",
    "report",
    "repository",
    "runtime",
    "verifier",
    "without"
  ]);
  return rawTokens.find(
    (token) => token.length > 3
      && !evidenceNoise.has(token)
      && !["route", "router", "routing"].includes(token)
      && evidenceTokens.has(token)
  );
}

function hasRoutePlanningIntent(task: string): boolean {
  return hasRouteConfidencePolicyIntent(task)
    || /\b(?:role[-\s]?aware|multi[-\s]?surface|artifact[-\s]?family|evidence[-\s]?sufficien(?:cy|t)|focused[-\s]?anchor|anchor[-\s]?validation|early[-\s]?stop(?:ping)?|route[-\s]?(?:allocation|limit|focus|plan|planning|planner)|routing\s+(?:precision|recall|plan|planning)|stopp?ing\s+(?:condition|rule|logic))\b/i.test(task)
    || /\b(?:subject|task)[-\s]+owner[-\s]+(?:verification[-\s]+)?closure\b/i.test(task)
    || /(?:主体|主體).{0,24}(?:归属|歸屬|所有权|所有權).{0,24}(?:闭环|閉環)/.test(task)
    || /(?:路由|路線|路线).{0,12}(?:规划|規劃|计划|計划|計畫|分配|选择|選擇|停止)/.test(task)
    || (/\bplanner\b/i.test(task) && (/\b(?:route|routing)\b/i.test(task) || /路由|路線|路线/.test(task)));
}

function hasRouteScoringIntent(task: string): boolean {
  const explicitScoring = /\b(?:rank(?:ing)?|relevance|score|scorer|scoring)\b/i.test(task)
    || /(?:路由|路線|路线).{0,12}(?:评分|評分|打分|排名|相关度|相關度)/.test(task);
  const genericConfidence = /\b(?:confidence|calibrat(?:e|ed|ing|ion))\b/i.test(task)
    || /(?:路由|路線|路线).{0,12}(?:置信度|校准|校準)/.test(task);
  return explicitScoring || (genericConfidence && !hasRouteConfidencePolicyIntent(task));
}

function hasRouteConfidencePolicyIntent(task: string): boolean {
  const english = /\b(?:confidence|calibrat(?:e|ed|ing|ion))\b.{0,120}\b(?:budget|cap|closure|gate|independent\s+verification|policy|uplift)\b/i.test(task)
    || /\b(?:budget|cap|closure|gate|independent\s+verification|policy|uplift)\b.{0,120}\b(?:confidence|calibrat(?:e|ed|ing|ion))\b/i.test(task);
  const chinese = /(?:置信度|校准|校準).{0,80}(?:预算|預算|上限|闭环|閉環|证据|證據|门槛|門檻|独立验证|獨立驗證|策略)/.test(task)
    || /(?:预算|預算|上限|闭环|閉環|证据|證據|门槛|門檻|独立验证|獨立驗證|策略).{0,80}(?:置信度|校准|校準)/.test(task);
  return english || chinese;
}

function hasTaskAnalysisIntent(task: string): boolean {
  return /\b(?:task[-\s]?(?:analysis|analyzer|intent)|analy[sz](?:e|ing)\s+(?:the\s+)?task|compound[-\s]?intent|intent[-\s]?preservation|lexical[-\s]?(?:normalization|tokens?))\b/i.test(task)
    || /(?:任务|任務)(?:分析|意图|意圖)/.test(task);
}

function hasTaskClassificationIntent(task: string): boolean {
  return /\b(?:action[-\s]?classification|classif(?:y|ication)|task[-\s]?type)\b/i.test(task);
}

function hasPublicationIntentIntent(task: string): boolean {
  return /\b(?:publication[-\s]?intent|release[-\s]?(?:intent|vocabulary)|artifact[-\s]?intent)\b/i.test(task);
}

function hasIndexFreshnessIntent(task: string): boolean {
  return /\b(?:index[-\s]?freshness|fresh(?:ness)?|stale|storage[-\s]?status|generated[-\s]?artifact)\b/i.test(task);
}

function taskRequestsGeneratedMcpArtifactOnly(task: string): boolean {
  const generatedOutput = /\b(?:rebuild|regenerate|update)\b.{0,80}\b(?:generated\s+)?mcp\b.{0,40}\b(?:artifact|bundle)\b|\b(?:generated\s+)?mcp\b.{0,40}\b(?:artifact|bundle)\b.{0,80}\b(?:rebuild|regenerate|update)\b/i.test(task);
  const sourceChange = /\bmcp\b.{0,32}\b(?:implementation|runtime|server|source)\b|\b(?:implementation|runtime|server|source)\b.{0,32}\bmcp\b/i.test(task);
  return generatedOutput && !sourceChange;
}

function hasEvidenceModelIntent(task: string): boolean {
  return /\b(?:evidence[-\s]?(?:closure|model|roles?|sufficien(?:cy|t))|role[-\s]?aware)\b/i.test(task)
    || /(?:证据|證據)(?:闭环|閉環|模型|角色|充分性)/.test(task);
}

function hasModeSelectionIntent(task: string): boolean {
  return /\b(?:context[-\s]?mode|mode[-\s]?(?:selection|selector)|intervention[-\s]?policy)\b/i.test(task)
    || /(?:上下文|情境)(?:模式|選擇|选择)|模式(?:选择|選擇|选择器|選擇器)/.test(task);
}

function hasContextPackingIntent(task: string): boolean {
  return /\b(?:adaptive[-\s]?payload|context[-\s]?(?:pack|packer|packing)|payload[-\s]?(?:budget|ceiling|delivery))\b/i.test(task)
    || /(?:自适应|自適應)(?:上下文|情境|payload)|(?:上下文|情境)(?:打包|封装|封裝)/.test(task);
}

function hasEvaluationMeasurementIntent(task: string): boolean {
  return /\b(?:evaluate|evaluation)\b.{0,80}\b(?:accounting|measure(?:ment)?|metrics?|payload|tokens?)\b/i.test(task)
    || /\b(?:accounting|measure(?:ment)?|metrics?|payload|tokens?)\b.{0,80}\b(?:evaluate|evaluation)\b/i.test(task)
    || /(?:评估|評估|计量|計量).{0,50}(?:payload|token|上下文|情境)/i.test(task);
}

function routingImplementationConcernCount(task: string): number {
  return [
    hasRoutePlanningIntent(task),
    hasRouteScoringIntent(task),
    hasTaskAnalysisIntent(task),
    hasTaskClassificationIntent(task),
    hasPublicationIntentIntent(task),
    hasIndexFreshnessIntent(task),
    hasModeSelectionIntent(task),
    hasContextPackingIntent(task),
    hasEvaluationMeasurementIntent(task)
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

  const explicitTests = directTests
    .map((item) => ({
      item,
      affinity: explicitTestConceptAffinity(item.node.sourcePath, analysis.raw),
      concept: explicitRuntimeTestConcept(item, analysis.raw)
    }))
    .filter((candidate): candidate is typeof candidate & { concept: string } =>
      candidate.affinity >= 2 && Boolean(candidate.concept)
    )
    .sort((left, right) => right.affinity - left.affinity
      || ranked.indexOf(left.item) - ranked.indexOf(right.item));
  for (const candidate of explicitTests) {
    if (concepts.has(candidate.concept)) continue;
    result.push(candidate.item);
    concepts.add(candidate.concept);
    if (result.length >= directQuota) break;
  }

  for (const item of conceptualTests.length ? conceptualTests : directTests) {
    if (result.length >= directQuota) break;
    const concept = testRouteConcept(item, analysis);
    if (concept && concepts.has(concept)) continue;
    if (result.some((selected) => selected.node.sourcePath === item.node.sourcePath)) continue;
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
  if (hasEvidenceModelIntent(analysis.raw) && /(?:evidence|closure|role|sufficien)/.test(haystack)) {
    return "evidence-model";
  }
  if (hasModeSelectionIntent(analysis.raw) && /(?:mode|selector|intervention)/.test(haystack)) {
    return "mode-selection";
  }
  if (hasContextPackingIntent(analysis.raw) && /(?:context|pack|payload)/.test(haystack)) {
    return "context-packing";
  }
  if (hasEvaluationMeasurementIntent(analysis.raw) && /(?:evaluation|evaluate|measure|payload|token)/.test(haystack)) {
    return "evaluation-measurement";
  }
  if (hasIndexFreshnessIntent(analysis.raw) && /(?:fresh|stale|status|index|generated[-\s]?artifact)/.test(haystack)) {
    return "index-freshness";
  }
  if (
    (hasRoutePlanningIntent(analysis.raw) || hasRouteScoringIntent(analysis.raw) || hasTaskAnalysisIntent(analysis.raw))
    && /(?:route|router|routing|artifact[-\s]?family|confidence|scor|analy)/.test(haystack)
  ) {
    return "routing";
  }
  return explicitRuntimeTestConcept(item, analysis.raw);
}

function explicitTestConceptAffinity(sourcePath: string, task: string): number {
  const basenameTokens = [...tokenizeLexical(path.posix.basename(sourcePath))].map(canonicalRouteConceptToken);
  const concepts = basenameTokens.filter(
    (token) => !["test", "tests", "spec", "ts", "js", "tsx", "jsx", "release", "publish", "changelog"].includes(token)
  );
  const orderedTaskTokens = (task
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .match(/[a-z0-9$]+/g) ?? [])
    .map(normalizeLexicalToken)
    .map(canonicalRouteConceptToken);
  const taskTokens = new Set(orderedTaskTokens);
  const lexicalTask = orderedTaskTokens.join(" ");
  let hasDirectMatch = false;
  for (const concept of concepts) {
    const escaped = escapeRegExp(concept);
    const explicitBeforeTest = new RegExp(
      `\\b${escaped}\\b(?=[^;.!?]{0,80}\\b(?:regressions?|(?:regression\\s+)?tests?|specs?)\\b)`,
      "i"
    );
    if (explicitBeforeTest.test(lexicalTask)) return 3;
    const nearTest = new RegExp(`\\b${escaped}\\b.{0,48}\\b(?:regressions?|tests?|specs?)\\b|\\b(?:regressions?|tests?|specs?)\\b.{0,48}\\b${escaped}\\b`, "i");
    if (nearTest.test(lexicalTask)) return 2;
    if (taskTokens.has(concept)) hasDirectMatch = true;
  }
  return hasDirectMatch ? 1 : 0;
}

function canonicalRouteConceptToken(token: string): string {
  if (["router", "routing"].includes(token)) return "route";
  if (["parsed", "parser", "parsing"].includes(token)) return "parse";
  return token;
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
      || surfaceClauseTaskAffinity(rightPath, analysis.raw, "docs")
        - surfaceClauseTaskAffinity(leftPath, analysis.raw, "docs")
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

function surfaceClauseTaskAffinity(
  sourcePath: string,
  task: string,
  surface: "docs" | "evidence" | "test" | "mcp"
): number {
  const cue = surface === "docs"
    ? /\b(?:bilingual|doc|docs|documentation|localization|readme|report|research)\b|(?:双语|雙語|文档|文檔|研究|报告|報告)/i
    : surface === "evidence"
      ? /\b(?:evidence|json|machine[-\s]?readable|result)\b|(?:证据|證據|结果|結果)/i
      : surface === "test"
        ? /\b(?:regression|test|tests|verification|verify)\b|(?:测试|測試|验证|驗證)/i
        : /\b(?:bundle|generated|mcp|plugin)\b|(?:生成|插件)/i;
  const relevantClauses = task.split(/[,;]+/).filter((clause) => cue.test(clause));
  return relevantClauses.reduce(
    (best, clause) => Math.max(best, documentTaskAffinity(sourcePath, clause)),
    0
  );
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
  const namedVerifier = /\b(?:add|change|create|fix|implement|update|write)\b.{0,80}\b(?:replay[-\s]+)?(?:harness|verifier)\b|\b(?:replay[-\s]+)?(?:harness|verifier)\b.{0,80}\b(?:add|change|create|fix|implement|update|write)\b/.test(raw);
  if (namedVerifier) return 1;
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

function normalizeOptions(options: number | RoutePalaceOptions): NormalizedRoutePalaceOptions {
  const budget = typeof options === "number" ? options : options.budget ?? DEFAULT_BUDGET.maxInputTokens;
  const routeLimit = typeof options === "number" ? defaultRouteLimitForBudget(budget) : options.routeLimit ?? defaultRouteLimitForBudget(budget);
  return {
    budget,
    routeLimit: Math.max(4, Math.min(24, routeLimit)),
    referencePolicy: typeof options === "number" ? "auto" : options.referencePolicy ?? "auto",
    grounding: typeof options === "number" ? undefined : options.grounding
  };
}

async function appendAbstainedRoute(
  root: string,
  task: string,
  budget: number,
  index: Awaited<ReturnType<typeof readIndex>>,
  taskGrounding: PalaceRoute["taskGrounding"]
): Promise<PalaceRoute> {
  const analysis = analyzeTask(task);
  const taskType = classifyTask(task);
  const requestedSurfaces = requestedRouteSurfaces(analysis);
  const intent = buildTaskIntent(analysis, taskType, requestedSurfaces);
  const evidenceClosure = evaluateEvidenceClosure({
    intent,
    selectedNodes: [],
    selectedFacts: [],
    allNodes: index.nodes,
    edges: index.edges
  });
  const now = new Date().toISOString();
  const route: PalaceRoute = {
    id: `route_${hashText(`${task}:${now}`).slice(0, 16)}`,
    task,
    taskType,
    decision: "abstain",
    taskGrounding,
    entry: locateEntry(taskType, analysis),
    route: [],
    excluded: [],
    budget: {
      maxInputTokens: budget,
      estimatedTokens: 0,
      reservedOutputTokens: DEFAULT_BUDGET.reservedOutputTokens
    },
    confidence: 0,
    intent,
    evidenceClosure,
    confidenceEvidence: buildRouteConfidenceEvidence(evidenceClosure, 0),
    narrowingEvidence: {
      independentImplementationAnchor: "missing",
      leadingTaskAnchors: [],
      reasons: taskGrounding.reasons
    },
    createdAt: now
  };
  await appendRoute(root, index.routes, route);
  return route;
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

function competingImplementationAnchorCount(
  scored: ScoredNode[],
  intent: TaskIntent,
  analysis: ReturnType<typeof analyzeTask>
): number {
  const candidates = scored.filter(
    (item) => nodeHasEvidenceRole(item.node, "implementation")
      && intent.preferredScopes.includes(nodeEvidenceScope(item.node))
  );
  const explicitIdentities = new Set(
    intent.subjects
      .filter((term) => term.kind === "identifier" && term.source === "explicit")
      .filter((term) => {
        const value = term.value;
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return /[._$-]/.test(value)
          || /[a-z0-9][A-Z]/.test(value)
          || /[A-Z]{2,}/.test(value)
          || new RegExp(`(?:\\.|\\b)${escaped}\\s*\\(`, "i").test(analysis.raw)
          || new RegExp(`\`${escaped}\``, "i").test(analysis.raw);
      })
      .map((term) => compactCodeIdentifier(term.value))
      .filter(Boolean)
  );
  if (explicitIdentities.size) {
    let alternatives = 0;
    for (const identity of explicitIdentities) {
      const owners = candidates
        .map((item) => ({
          item,
          identities: extractCodeIdentifierCompacts([
            item.node.sourcePath,
            item.node.title
          ].join(" "))
        }))
        .filter(({ identities }) => identities.has(identity));
      const strongestOwnerScore = owners[0]?.item.score ?? 0;
      if (strongestOwnerScore <= 0) continue;
      const nearStrongOwners = new Set(
        owners
          .filter(({ item }) => item.score >= strongestOwnerScore * 0.85)
          .map(({ item }) => item.node.sourcePath)
      );
      alternatives += Math.max(0, nearStrongOwners.size - 1);
    }
    return alternatives;
  }
  const strongest = candidates[0]?.score ?? 0;
  if (strongest <= 0) return 0;
  const sourcePaths = new Set(
    candidates
      .filter((item) => item.score >= strongest * 0.85)
      .map((item) => item.node.sourcePath)
  );
  return Math.max(0, sourcePaths.size - 1);
}

function confidence(
  selected: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  estimatedTokens: number,
  budget: number,
  taskType: TaskType,
  confidenceEvidence: ReturnType<typeof buildRouteConfidenceEvidence>,
  coreEvidenceCap?: number,
  narrowingEvidence?: NonNullable<PalaceRoute["narrowingEvidence"]>
): number {
  if (!selected.length) return 0.1;
  const top = selected.slice(0, 12);
  const keywords = analysis.keywords.filter((keyword) => !["task", "fresh"].includes(keyword));
  const value = confidenceEvidence.score;
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
  const workspaceAmbiguityCap = unresolvedWorkspaceScopeCap(top, analysis, taskType);
  const compoundCodeTask = isCodeTaskType(taskType) && requestedSurfaceCount >= 3 && keywords.length >= 12;
  const implementationCount = new Set(
    top
      .filter((item) => isImplementationCandidate(item.node) && !isDirectTestCandidate(item))
      .map((item) => item.node.sourcePath)
  ).size;
  const independentVerification = implementationCount <= 1
    ? narrowingEvidence?.independentImplementationAnchor !== "missing"
    : narrowingEvidence?.independentImplementationAnchor === "confirmed";
  const completeCompoundEvidence = confidenceEvidence.completeness >= 0.95
    && confidenceEvidence.connectivity >= 0.95
    && confidenceEvidence.semanticCoverage >= 0.95
    && confidenceEvidence.ambiguity === 0
    && breadthEvidence >= 0.85
    && (artifactFamilyCoverage === undefined || artifactFamilyCoverage >= 0.8)
    && independentVerification;
  const compoundCodeTaskCap = compoundCodeTask
    ? completeCompoundEvidence ? 0.68 : 0.4
    : 0.98;
  const budgetCap = estimatedTokens <= budget ? 0.98 : 0.4;
  return Number(Math.max(
    0.1,
    Math.min(
      taskCap,
      artifactFamilyCap,
      directEvidenceCap,
      workspaceAmbiguityCap,
      compoundCodeTaskCap,
      budgetCap,
      value
    )
  ).toFixed(2));
}

function independentImplementationAnchorEvidence(
  items: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType,
  coreEvidenceCap: number | undefined,
  nodes: PalaceNode[],
  edges: PalaceEdge[]
): NonNullable<PalaceRoute["narrowingEvidence"]> {
  const implementationPaths = new Set(
    items
      .filter((item) => isImplementationCandidate(item.node) && !isDirectTestCandidate(item))
      .map((item) => item.node.sourcePath)
  );
  const compoundArtifactLifecycle = isArtifactFamilyRequest(
    requestedRouteSurfaces(analysis),
    analysis
  );
  if (
    isCodeTaskType(taskType)
    && ((coreEvidenceCap ?? 0) > 0.4 || compoundArtifactLifecycle)
    && implementationPaths.size > 1
  ) {
    const verificationPaths = new Set(
      items
        .filter((item) => isDirectTestCandidate(item))
        .map((item) => item.node.sourcePath)
    );
    const uncoveredImplementations = uncoveredImplementationsByVerification(
      implementationPaths,
      verificationPaths,
      nodes,
      edges
    );
    const anchors = [...corePrimaryTaskTokens(analysis)].slice(0, 3);
    if (uncoveredImplementations.length) {
      return {
        independentImplementationAnchor: "missing",
        leadingTaskAnchors: anchors,
        reasons: [
          `Selected verification does not independently connect to ${uncoveredImplementations.length} routed implementation source(s): ${uncoveredImplementations.join(", ")}.`
        ]
      };
    }
    return {
      independentImplementationAnchor: "confirmed",
      leadingTaskAnchors: anchors,
      reasons: [
        `Selected verification independently connects to all ${implementationPaths.size} routed implementation sources.`
      ]
    };
  }
  if (taskType !== "bugfix" || coreEvidenceCap === undefined || coreEvidenceCap <= 0.4) {
    return {
      independentImplementationAnchor: "not-required",
      leadingTaskAnchors: [],
      reasons: []
    };
  }
  const anchors = leadingBugfixAnchorTokens(analysis.raw);
  if (anchors.length < 2) {
    return {
      independentImplementationAnchor: "not-required",
      leadingTaskAnchors: anchors,
      reasons: []
    };
  }
  const implementations = items.filter(
    (item) => isImplementationCandidate(item.node) && !isDirectTestCandidate(item)
  );
  const independentlyAnchored = implementations.some((item) => {
    const tokens = new Set([
      ...corePathTokens(item.node.sourcePath),
      ...corePathScopeTokens(item.node.sourcePath),
      ...coreNodeTokens(item.node.title),
      ...coreNodeTokens(item.node.summary)
    ]);
    return anchors.every((anchor) => [...tokens].some((token) => anchorTokensMatch(anchor, token)));
  });
  return independentlyAnchored
    ? {
        independentImplementationAnchor: "confirmed",
        leadingTaskAnchors: anchors,
        reasons: [
          `A selected implementation independently covers both leading bugfix anchors: ${anchors.join(", ")}.`
        ]
      }
    : {
        independentImplementationAnchor: "missing",
        leadingTaskAnchors: anchors,
        reasons: [
          `No selected implementation independently covers both leading bugfix anchors: ${anchors.join(", ")}.`
        ]
      };
}

function uncoveredImplementationsByVerification(
  implementationPaths: Set<string>,
  verificationPaths: Set<string>,
  nodes: PalaceNode[],
  edges: PalaceEdge[]
): string[] {
  const sourceById = new Map(nodes.map((node) => [node.id, node.sourcePath]));
  const connected = new Set<string>();
  const implementationImports = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!["calls", "imports", "tested_by", "tests"].includes(edge.type) || edge.weight < 0.6) continue;
    const from = sourceById.get(edge.from);
    const to = sourceById.get(edge.to);
    if (!from || !to || from === to) continue;
    if (["tested_by", "tests"].includes(edge.type)) {
      if (implementationPaths.has(from) && verificationPaths.has(to)) connected.add(from);
      if (implementationPaths.has(to) && verificationPaths.has(from)) connected.add(to);
      continue;
    }
    if (verificationPaths.has(from) && implementationPaths.has(to)) connected.add(to);
    if (implementationPaths.has(from) && implementationPaths.has(to)) {
      const imports = implementationImports.get(from) ?? new Set<string>();
      imports.add(to);
      implementationImports.set(from, imports);
    }
  }
  const queue = [...connected];
  while (queue.length) {
    const sourcePath = queue.shift()!;
    for (const dependency of implementationImports.get(sourcePath) ?? []) {
      if (connected.has(dependency)) continue;
      connected.add(dependency);
      queue.push(dependency);
    }
  }
  return [...implementationPaths].filter((sourcePath) => !connected.has(sourcePath)).sort();
}

function leadingBugfixAnchorTokens(task: string): string[] {
  const conventional = task.match(/^\s*fix(?:\([^)]*\))?!?:\s*([\s\S]+)$/i)?.[1];
  const behavioral = task.match(
    /^\s*(?:fix(?:e[sd]?|ing)?|debug(?:ged|ging|s)?|repair(?:ed|ing|s)?|correct(?:ed|ing|s)?|resolve(?:d|s|ing)?|prevent(?:ed|ing|s)?|avoid(?:ed|ing|s)?)\s+([\s\S]+)$/i
  )?.[1];
  const remainder = conventional ?? behavioral;
  if (!remainder) return [];
  const leading = remainder
    .split(/\b(?:after|before|because|for|if|in|into|on|to|unless|when|where|while|with|within)\b/i, 1)[0]
    ?.replace(/\s*\([^)]*\)\s*$/, "") ?? "";
  const ignored = new Set([
    ...CORE_EVIDENCE_NOISE,
    ...CORE_EVIDENCE_LOW_SIGNAL,
    "incorrect",
    "incorrectly",
    "issue",
    "problem",
    "sometimes",
    "unexpected",
    "unexpectedly"
  ]);
  return [...tokenizeLexical(leading)]
    .filter((token) => token.length > 2 && !/^\d+$/.test(token) && !ignored.has(token))
    .slice(0, 2);
}

function anchorTokensMatch(left: string, right: string): boolean {
  if (left === right) return true;
  const leftStem = anchorTokenStem(left);
  const rightStem = anchorTokenStem(right);
  return Math.min(leftStem.length, rightStem.length) >= 4
    && (leftStem.startsWith(rightStem) || rightStem.startsWith(leftStem));
}

function anchorTokenStem(token: string): string {
  for (const suffix of ["ization", "isation", "ating", "ation", "tion", "ing", "ed"]) {
    if (token.length - suffix.length >= 4 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
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

function unresolvedWorkspaceScopeCap(
  items: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType
): number {
  if (!isCodeTaskType(taskType)) return 0.98;
  const byScope = new Map<string, number>();
  for (const item of items) {
    if (!isImplementationCandidate(item.node) || isDirectTestCandidate(item)) continue;
    const scope = coreWorkspaceScope(item.node.sourcePath);
    if (!scope) continue;
    byScope.set(scope, Math.max(byScope.get(scope) ?? 0, directCoreEvidence(item, analysis)));
  }
  if (byScope.size < 2) return 0.98;
  const taskTokens = tokenizeLexical(analysis.raw);
  if (
    [...byScope.keys()].some((scope) =>
      [...tokenizeLexical(scope)].some((token) => token.length > 2 && taskTokens.has(token))
    )
  ) return 0.98;
  const ranked = [...byScope.values()].sort((left, right) => right - left);
  return ranked[1] >= ranked[0] * 0.75 ? 0.15 : 0.4;
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

function ensureRequestedSurfaceCoverage(
  selected: ScoredNode[],
  scored: ScoredNode[],
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>,
  taskType: TaskType,
  limit: number
): ScoredNode[] {
  if (!requested.length) return selected;

  const result: ScoredNode[] = [];
  const protectedIds = new Set<string>();
  const lifecycleCodeTask = isCodeTaskType(taskType)
    && isArtifactFamilyRequest(requested, analysis);
  const artifactFamilyAnchor = selectEvaluationArtifactFamilyAnchor(scored, requested, analysis);
  const firstAlreadyHasRequestedSurface = selected[0]
    && requested.some((surface) => matchesRouteSurface(selected[0].node, surface));
  if (!artifactFamilyAnchor && !requested.includes("implementation") && selected[0] && !firstAlreadyHasRequestedSurface) {
    result.push(selected[0]);
    protectedIds.add(selected[0].node.id);
  }

  const orderedSurfaces = lifecycleCodeTask
    ? [
        ...(["implementation", "test", "evidence", "docs"] as RouteSurface[])
          .filter((surface) => requested.includes(surface)),
        ...requested.filter((surface) => !["implementation", "test", "evidence", "docs"].includes(surface))
      ]
    : requested;
  for (const surface of orderedSurfaces) {
    const quota = taskType === "evaluation"
      ? evaluationSurfaceQuota(surface, analysis)
      : artifactLifecycleSurfaceQuota(scored, surface, requested, analysis);
    const representatives = selectEvaluationSurfaceRepresentatives(
      scored.filter(
        (item) =>
          matchesRouteSurface(item.node, surface)
          && !(lifecycleCodeTask && surface === "implementation" && !isImplementationCandidate(item.node))
          && !(lifecycleCodeTask && surface === "implementation" && item.node.tags.includes("generated-artifact"))
          && !protectedIds.has(item.node.id)
          && !result.some((selectedItem) => selectedItem.node.sourcePath === item.node.sourcePath)
      ),
      surface,
      analysis,
      quota,
      artifactFamilyAnchor,
      taskType,
      scored
    );
    for (const representative of representatives) {
      if (result.length >= limit) break;
      if (!result.some((item) => item.node.id === representative.node.id)) result.push(representative);
      protectedIds.add(representative.node.id);
    }
    if (result.length >= limit) break;
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
  const keywords = new Set(analysis.keywords);
  const usageAudit = hasAnyKeyword(keywords, ["usage", "audit"])
    && hasAnyKeyword(keywords, ["evaluation", "retrospective", "research"]);
  if (surface === "tooling" && usageAudit) return 2;
  if (surface === "evidence" && usageAudit) return 2;
  if (surface !== "docs") return 1;
  let quota = 1;
  if (keywords.has("evidence")) quota += 1;
  if (taskRequestsProtocolArtifact(analysis.raw)) quota += 1;
  if (keywords.has("readme")) quota += 1;
  if (hasAnyKeyword(keywords, ["bilingual", "localization"])) quota += 1;
  return Math.min(5, quota);
}

function artifactLifecycleSurfaceQuota(
  scored: ScoredNode[],
  surface: RouteSurface,
  requested: RouteSurface[],
  analysis: ReturnType<typeof analyzeTask>
): number {
  const phaseCount = artifactLifecyclePhaseCount(analysis);
  if (surface === "implementation") {
    const declaredConcerns = routingImplementationConcernCount(analysis.raw);
    const testConcernCount = Math.max(
      explicitRequestedTestConceptCount(scored, analysis),
      generalSurfaceQuota(scored, "test", requested, analysis)
        - requestedVerificationScriptQuota(analysis)
    );
    return Math.min(
      4,
      Math.max(
        1,
        declaredConcerns,
        testConcernCount
      )
    );
  }
  if (surface === "test") {
    return generalSurfaceQuota(scored, surface, requested, analysis);
  }
  if (surface === "evidence") return Math.min(3, phaseCount);
  if (surface === "docs") {
    const bilingual = hasAnyKeyword(new Set(analysis.keywords), ["bilingual", "localization"]);
    return Math.min(6, phaseCount * (bilingual ? 2 : 1));
  }
  return generalSurfaceQuota(scored, surface, requested, analysis);
}

function selectEvaluationSurfaceRepresentatives(
  candidates: ScoredNode[],
  surface: RouteSurface,
  analysis: ReturnType<typeof analyzeTask>,
  quota: number,
  artifactFamilyAnchor: string | undefined,
  taskType: TaskType,
  allScored: ScoredNode[] = candidates
): ScoredNode[] {
  const artifactEntities = orderedArtifactIdentityEntities(analysis);
  const ranked = [...candidates]
    .filter((item) => !(surface === "docs" && matchesRouteSurface(item.node, "evidence")))
    .map((item) => {
      const productLifecycleCodeSurface = isCodeTaskType(taskType)
        && !["docs", "evidence"].includes(surface);
      return {
        item,
        cohesion: productLifecycleCodeSurface
          ? 0
          : artifactFamilyCohesion(item.node.sourcePath, artifactFamilyAnchor),
        familyAffinity: productLifecycleCodeSurface
          ? 0
          : evaluationArtifactFamilyAffinity(item, analysis, artifactEntities),
        surfacePriority: isCodeTaskType(taskType)
          ? generalSurfacePriority(item, surface, analysis)
          : evaluationSurfacePriority(item, surface, analysis),
        attemptPriority: productLifecycleCodeSurface
          ? 0
          : artifactAttemptPriority(item.node.sourcePath),
        versionPriority: evaluationSurfaceVersionPriority(item.node.sourcePath)
      };
    })
    .sort((a, b) => b.cohesion - a.cohesion
      || (isCodeTaskType(taskType) ? b.versionPriority - a.versionPriority : 0)
      || b.familyAffinity - a.familyAffinity
      || b.attemptPriority - a.attemptPriority
      || b.surfacePriority - a.surfacePriority
      || (!isCodeTaskType(taskType) ? b.versionPriority - a.versionPriority : 0)
      || b.item.score - a.item.score
      || a.item.node.sourcePath.localeCompare(b.item.node.sourcePath))
    .map(({ item }) => item)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.node.sourcePath === item.node.sourcePath) === index);
  if (surface === "implementation" && isCodeTaskType(taskType)) {
    return selectGeneralSurfaceRepresentatives(ranked, surface, analysis, quota, allScored);
  }
  if (surface === "test") {
    if (isCodeTaskType(taskType)) {
      return selectArtifactLifecycleTestRepresentatives(ranked, analysis, quota);
    }
    if (quota > 1) return selectGeneralTestRepresentatives(ranked, analysis, quota);
    return ranked.slice(0, quota);
  }
  if (surface === "evidence" && quota > 1) {
    return selectPhaseBalancedRepresentatives(ranked, analysis, quota);
  }
  if (surface !== "docs" || quota <= 1) return ranked.slice(0, quota);

  const keywords = new Set(analysis.keywords);
  const protocolRequested = taskRequestsProtocolArtifact(analysis.raw);
  const selected: ScoredNode[] = [];
  const selectedPaths = new Set<string>();
  const appendFirst = (predicate: (sourcePath: string) => boolean): void => {
    if (selected.length >= quota) return;
    const representative = ranked.find(
      (item) => !selectedPaths.has(item.node.sourcePath) && predicate(item.node.sourcePath.toLowerCase())
    );
    if (!representative) return;
    selected.push(representative);
    selectedPaths.add(representative.node.sourcePath);
  };
  const appendFirstItem = (predicate: (item: ScoredNode) => boolean): void => {
    if (selected.length >= quota) return;
    const representative = ranked.find(
      (item) => !selectedPaths.has(item.node.sourcePath) && predicate(item)
    );
    if (!representative) return;
    selected.push(representative);
    selectedPaths.add(representative.node.sourcePath);
  };
  const localized = (sourcePath: string): boolean =>
    /(^|\/)(?:zh-cn|zh-hans|zh_cn)(\/|$)/.test(sourcePath.toLowerCase());
  const narrative = (sourcePath: string): boolean => /\.(?:md|mdx|rst|txt)$/.test(sourcePath);
  const numberedIdentities = orderedNumberedArtifactIdentities(analysis);

  if (hasAnyKeyword(keywords, ["bilingual", "localization"]) && numberedIdentities.length > 1) {
    for (const identity of numberedIdentities) {
      appendFirstItem((item) => !localized(item.node.sourcePath) && itemHasArtifactIdentity(item, identity));
      appendFirstItem((item) => localized(item.node.sourcePath) && itemHasArtifactIdentity(item, identity));
    }
  }

  if (
    isCodeTaskType(taskType)
    && hasAnyKeyword(keywords, ["bilingual", "localization"])
    && numberedIdentities.length <= 1
  ) {
    appendFirst((sourcePath) => !localized(sourcePath) && narrative(sourcePath));
    appendFirst(localized);
  }

  if (keywords.has("evidence")) {
    appendFirst(
      (sourcePath) => !localized(sourcePath)
        && narrative(sourcePath)
        && isNarrativeEvidencePath(sourcePath)
        && (!protocolRequested || !/(?:^|[-_/])protocol(?:[-_.\/]|$)/.test(sourcePath))
    );
  }
  if (protocolRequested) {
    appendFirst((sourcePath) => !localized(sourcePath) && /protocol/.test(sourcePath));
  }
  if (keywords.has("readme")) {
    appendFirst((sourcePath) => !localized(sourcePath) && /(^|\/)readme\.md$/.test(sourcePath));
  }
  if (hasAnyKeyword(keywords, ["bilingual", "localization"])) {
    if (protocolRequested) appendFirst((sourcePath) => localized(sourcePath) && /protocol/.test(sourcePath));
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

function selectArtifactLifecycleTestRepresentatives(
  ranked: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  quota: number
): ScoredNode[] {
  const result: ScoredNode[] = [];
  const selectedPaths = new Set<string>();
  const append = (item: ScoredNode | undefined): void => {
    if (!item || result.length >= quota || selectedPaths.has(item.node.sourcePath)) return;
    result.push(item);
    selectedPaths.add(item.node.sourcePath);
  };

  for (const item of selectGeneralTestRepresentatives(ranked, analysis, quota)) append(item);
  for (const identity of orderedNumberedArtifactIdentities(analysis)) {
    append(ranked.find(
      (item) => !selectedPaths.has(item.node.sourcePath)
        && itemHasArtifactIdentity(item, identity)
    ));
  }
  for (const item of ranked) append(item);
  return result;
}

function selectPhaseBalancedRepresentatives(
  ranked: ScoredNode[],
  analysis: ReturnType<typeof analyzeTask>,
  quota: number
): ScoredNode[] {
  const result: ScoredNode[] = [];
  const selectedPaths = new Set<string>();
  const append = (item: ScoredNode | undefined): void => {
    if (!item || result.length >= quota || selectedPaths.has(item.node.sourcePath)) return;
    result.push(item);
    selectedPaths.add(item.node.sourcePath);
  };
  for (const identity of orderedNumberedArtifactIdentities(analysis)) {
    append(ranked.find((item) => itemHasArtifactIdentity(item, identity)));
  }
  for (const item of ranked) append(item);
  return result;
}

function evaluationArtifactFamilyAffinity(
  item: ScoredNode,
  analysis: ReturnType<typeof analyzeTask>,
  artifactEntities = orderedArtifactIdentityEntities(analysis)
): number {
  const sourcePath = item.node.sourcePath;
  const sourceTokens = artifactIdentityTokens(nodeHaystack(item));
  const entityScore = artifactEntities.reduce((score, entity, index) => {
    const matched = [...entity.tokens].filter((token) => sourceTokens.has(token)).length;
    const coverage = matched / entity.tokens.size;
    const positionWeight = Math.max(180, 540 - index * 180);
    if (coverage === 1) return score + positionWeight;
    if (coverage >= 0.67) return score + Math.round(positionWeight * 0.65);
    return score;
  }, 0);
  const pathTokens = new Set(nodeHaystack(item).match(/[a-z0-9]+/g) ?? []);
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
  const leadingEntity = artifactEntities[0]?.tokens;
  const rankedAnchors = [...scored]
    .filter((item) => isEvaluationArtifactPath(item.node.sourcePath))
    .map((item) => {
      const identityTokens = artifactIdentityTokens(nodeHaystack(item));
      const leadingCoverage = leadingEntity?.size
        ? [...leadingEntity].filter((token) => identityTokens.has(token)).length / leadingEntity.size
        : 0;
      return {
        item,
        affinity: evaluationArtifactFamilyAffinity(item, analysis, artifactEntities),
        leadingCoverage,
        versionPriority: documentVersionPriority(item.node.sourcePath)
      };
    })
    .sort(
      (a, b) => b.leadingCoverage - a.leadingCoverage
        || b.versionPriority - a.versionPriority
        || b.affinity - a.affinity
        || b.item.score - a.item.score
        || a.item.node.sourcePath.localeCompare(b.item.node.sourcePath)
    );
  const anchor = rankedAnchors[0]?.item;
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

function taskRequestsProtocolArtifact(task: string): boolean {
  if (
    /\b(?:protocol|study\s+plan|result\s+manifest|freeze\s+gate)\b/i.test(task)
    || /(?:协议|協議|研究计划|研究計畫|结果清单|結果清單|冻结门槛|凍結門檻)/.test(task)
  ) return true;
  const frozen = /\bfreeze(?:d)?\b|冻结|凍結/i.test(task);
  if (!frozen) return false;
  return !(
    /\b(?:competition|contest|hackathon|build\s+week)\b.{0,48}\bfreeze(?:d)?\b|\bfreeze(?:d)?\b.{0,48}\b(?:competition|contest|hackathon|build\s+week)\b/i.test(task)
    || /(?:比赛|比賽|竞赛|競賽|参赛|參賽).{0,20}(?:冻结|凍結)|(?:冻结|凍結).{0,20}(?:比赛|比賽|竞赛|競賽|参赛|參賽)/.test(task)
    || /\b(?:do\s+not|don't)\s+(?:commit|push|publish)\b/i.test(task)
    || /不(?:提交|推送|发布|發佈|發布)/.test(task)
  );
}

function isEvaluationArtifactPath(sourcePath: string): boolean {
  const normalized = sourcePath.toLowerCase();
  return /(^|\/)docs\/research\//.test(normalized)
    || /(^|\/)scripts\/(?:research\/)?[^/]*(?:audit|analy[sz]e|summari[sz]e|verify|benchmark|replication|route)[^/]*$/.test(normalized);
}

function artifactFamilyCohesion(sourcePath: string, anchorPath?: string): number {
  if (!anchorPath) return 0;
  const sourceTokens = artifactFamilyTokens(sourcePath);
  const anchorTokens = artifactFamilyTokens(anchorPath);
  if (!sourceTokens.size || !anchorTokens.size) return 0;
  const shared = [...sourceTokens].filter((token) => anchorTokens.has(token)).length;
  const coverage = shared / Math.min(sourceTokens.size, anchorTokens.size);
  if (shared < 2 || coverage < 0.6) return shared * 10;
  return Math.round(coverage * 600) + shared * 30;
}

function artifactFamilyTokens(value: string): Set<string> {
  return new Set(
    [...artifactIdentityTokens(value)].filter((token) => !/^attempt\d+$/.test(token))
  );
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
    const sourceTokens = artifactIdentityTokens(nodeHaystack(item));
    const matched = [...leadingEntity].filter((token) => sourceTokens.has(token)).length;
    const meaningfulMatch = leadingEntity.size > 1 && matched < 2
      ? 0
      : matched / leadingEntity.size;
    return Math.max(highest, meaningfulMatch);
  }, 0);
}

const ARTIFACT_IDENTITY_IGNORED = new Set([
  "alpha",
  "attempt",
  "cjs",
  "cn",
  "docs",
  "english",
  "evidence",
  "iteration",
  "json",
  "machine",
  "markdown",
  "md",
  "phase",
  "protocol",
  "readable",
  "report",
  "research",
  "result",
  "round",
  "script",
  "scripts",
  "simplified",
  "stage",
  "trial",
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
  const seen = new Set<string>();
  return analysis.entities
    .map((entity, originalIndex) => ({
      explicitIndex: artifactEntityExplicitIndex(raw, entity),
      originalIndex,
      tokens: artifactIdentityTokens(entity)
    }))
    .filter((entity) => entity.tokens.size >= 2 || [...entity.tokens].some(isNumberedArtifactIdentityToken))
    .sort((a, b) => {
      const aNumbered = [...a.tokens].some(isNumberedArtifactIdentityToken);
      const bNumbered = [...b.tokens].some(isNumberedArtifactIdentityToken);
      if (aNumbered !== bNumbered) return aNumbered ? -1 : 1;
      const aExplicit = a.explicitIndex >= 0;
      const bExplicit = b.explicitIndex >= 0;
      if (aExplicit !== bExplicit) return aExplicit ? -1 : 1;
      if (aExplicit && bExplicit && a.explicitIndex !== b.explicitIndex) {
        return a.explicitIndex - b.explicitIndex;
      }
      return b.tokens.size - a.tokens.size || a.originalIndex - b.originalIndex;
    })
    .filter((entity) => {
      const key = [...entity.tokens].sort().join("|");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function artifactIdentityTokens(value: string): Set<string> {
  return new Set(
    [
      ...numberedArtifactIdentityTokens(value),
      ...(value.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    ]
      .map(normalizeArtifactIdentityToken)
      .filter((token) => token.length > 2 && !/^\d+$/.test(token) && !ARTIFACT_IDENTITY_IGNORED.has(token))
  );
}

function artifactEntityExplicitIndex(raw: string, entity: string): number {
  const tokens = entity.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (!tokens.length) return -1;
  return raw.search(new RegExp(tokens.map(escapeRegExp).join("[\\s_-]+"), "i"));
}

function numberedArtifactIdentityTokens(value: string): string[] {
  const labels = new Map<string, string>([
    ["attempt", "attempt"],
    ["iteration", "iteration"],
    ["phase", "phase"],
    ["round", "round"],
    ["stage", "phase"],
    ["trial", "attempt"]
  ]);
  const english = [...value.toLowerCase().matchAll(/\b(round|phase|stage|iteration|attempt|trial)[-_\s]*#?(\d+)\b/g)]
    .flatMap((match) => {
      const label = labels.get(match[1] ?? "");
      const number = match[2];
      return label && number ? [`${label}${number}`] : [];
    });
  const chinese = [...value.matchAll(/第?\s*(\d+)\s*(轮|輪|阶段|階段)/g)]
    .flatMap((match) => {
      const number = match[1];
      const label = /阶段|階段/.test(match[2] ?? "") ? "phase" : "round";
      return number ? [`${label}${number}`] : [];
    });
  return [...new Set([...english, ...chinese])];
}

function orderedNumberedArtifactIdentities(
  analysis: ReturnType<typeof analyzeTask>
): string[] {
  return [...new Set(numberedArtifactIdentityTokens(analysis.raw))];
}

function artifactLifecyclePhaseCount(
  analysis: ReturnType<typeof analyzeTask>
): number {
  const identities = orderedNumberedArtifactIdentities(analysis);
  const phaseCount = identities.filter((identity) => /^(?:phase|round)\d+$/.test(identity)).length;
  const attemptCount = identities.filter((identity) => /^(?:attempt|iteration)\d+$/.test(identity)).length;
  return Math.max(1, phaseCount, attemptCount);
}

function itemHasArtifactIdentity(item: ScoredNode, identity: string): boolean {
  return artifactIdentityTokens(nodeHaystack(item)).has(identity);
}

function isNumberedArtifactIdentityToken(token: string): boolean {
  return /^(?:attempt|iteration|phase|round)\d+$/.test(token);
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
  const labeledVersion = versions.reduce((highest, match) => {
    const major = Number(match[1] ?? 0);
    const minor = Number(match[2] ?? 0);
    return Math.max(highest, major * 1_000_000 + minor * 1_000);
  }, 0);
  return Math.max(labeledVersion, documentVersionPriority(sourcePath));
}

function artifactAttemptPriority(sourcePath: string): number {
  const attempts = [...sourcePath.toLowerCase().matchAll(/(?:^|[^a-z0-9])(?:attempt|trial)[-_]?(\d+)/g)];
  return attempts.reduce(
    (highest, match) => Math.max(highest, Number(match[1] ?? 0)),
    0
  );
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
  return [
    item.node.sourcePath,
    item.node.title,
    item.node.summary,
    item.node.wing,
    item.node.room,
    ...item.node.tags,
    item.matchedFact?.name,
    item.matchedFact?.searchText
  ].filter(Boolean).join(" ").toLowerCase();
}
