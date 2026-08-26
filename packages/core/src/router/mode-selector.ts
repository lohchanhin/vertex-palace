import type {
  MemoryPreflightResult,
  PalaceIndex,
  PalaceMode,
  PalaceModeSelection,
  PalaceRiskSignals,
  PalaceRoute
} from "@vertex-palace/shared";

export type SelectPalaceModeOptions = {
  budget?: number;
  override?: PalaceMode;
  relevantMemoryCount?: number;
  memoryPreflight?: MemoryPreflightResult;
};

const DEFAULT_CONTEXT_BUDGET = 6_000;
const MIN_SUFFICIENT_ROUTE_CONFIDENCE = 0.7;

type BasePalaceModeSelection = Omit<
  PalaceModeSelection,
  "evidenceStatus" | "evidenceReasons" | "interventionPolicy"
>;

export function selectPalaceMode(
  index: PalaceIndex,
  route: PalaceRoute,
  task: string,
  options: SelectPalaceModeOptions = {}
): PalaceModeSelection {
  const normalizedTask = task.toLowerCase();
  const fileCount = Object.keys(index.fileHashes).length;
  const explicitFiles = explicitFileReferences(task);
  const routedSourcePaths = [...new Set(route.route.map(
    (step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, "").replaceAll("\\", "/").toLowerCase()
  ))];
  const explicitTargetAuthorized = explicitFiles.length === 1
    && (
      explicitReferenceExists(explicitFiles[0], Object.keys(index.fileHashes))
      || routedReferenceMatches(explicitFiles[0], routedSourcePaths)
    );
  const riskSignals = detectRiskSignals(normalizedTask, route);
  if (route.decision === "abstain") {
    const abstention = buildSelection(
      "route-lite",
      ["The task is not identifiable enough to route without guessing."],
      riskSignals,
      Math.min(options.budget ?? 2_400, 2_400),
      0
    );
    return {
      ...abstention,
      memoryLevel: "none",
      evidenceStatus: "insufficient",
      evidenceReasons: route.taskGrounding.reasons,
      interventionPolicy: "advisory"
    };
  }
  const memoryEvidenceCount = options.memoryPreflight?.included ?? options.relevantMemoryCount ?? 0;
  const memoryEvidenceAvailable = memoryEvidenceCount > 0;
  const primarySteps = route.route.filter((step) => (step.tier ?? inferredTier(step.priority)) === "primary");
  const primaryCount = primarySteps.length;
  const narrowingEvidenceInsufficient =
    route.narrowingEvidence?.independentImplementationAnchor === "missing";
  const uncertainRoute = route.confidence < 0.45;
  const singleExplicitTarget = explicitTargetAuthorized;
  const singleImplicitTarget = explicitFiles.length === 0
    && routedSourcePaths.length === 1
    && primaryCount === 1
    && (primarySteps[0]?.confidence ?? route.confidence) >= 0.4;
  const highConfidenceSingleFile = singleExplicitTarget || singleImplicitTarget;
  const memoryCheckedAndAbsent = options.memoryPreflight
    ? options.memoryPreflight.included === 0
    : options.relevantMemoryCount === 0;
  const structuralSelection = selectStructuralMode({
    fileCount,
    explicitFiles,
    explicitTargetAuthorized,
    primaryCount,
    highConfidenceSingleFile,
    memoryCheckedAndAbsent,
    uncertainRoute,
    narrowingEvidenceInsufficient,
    riskSignals,
    budget: options.budget
  });

  if (options.override) {
    const overridden = buildSelection(
      options.override,
      [`Mode explicitly set to ${options.override}.`],
      riskSignals,
      options.budget,
      1
    );
    return withMemoryTransition(
      withEvidencePolicy(overridden, route, options, explicitTargetAuthorized, true),
      options.override,
      options.memoryPreflight
    );
  }

  const keywordGuardRequired = riskSignals.memoryRelevant
    || riskSignals.staleMemoryRisk
    || riskSignals.tenantIsolationRisk;
  const selectionBeforeMemory = keywordGuardRequired
    ? buildSelection("guarded-memory-palace", guardedReasons(riskSignals), riskSignals, options.budget, 0.88)
    : memoryEvidenceAvailable
      ? buildSelection(
          "full-palace",
          [`${memoryEvidenceCount} relevant memory item(s) require scoped delivery before narrowing context.`],
          riskSignals,
          options.budget,
          0.82
        )
      : structuralSelection;

  if (!options.memoryPreflight) {
    return withEvidencePolicy(selectionBeforeMemory, route, options, explicitTargetAuthorized);
  }

  const guardedDeliveryRequired = options.memoryPreflight.conflictCount > 0
    || options.memoryPreflight.requiresGuardedDelivery
    || (memoryEvidenceAvailable && keywordGuardRequired);
  const finalSelection = guardedDeliveryRequired
    ? buildSelection("guarded-memory-palace", guardedReasons(riskSignals, options.memoryPreflight), riskSignals, options.budget, 0.88)
    : memoryEvidenceAvailable
      ? buildSelection(
          "full-palace",
          [`${memoryEvidenceCount} current relevant memory item(s) require scoped delivery before narrowing context.`],
          riskSignals,
          options.budget,
          0.82
        )
      : structuralSelection;

  return withMemoryTransition(
    withEvidencePolicy(finalSelection, route, options, explicitTargetAuthorized),
    selectionBeforeMemory.mode,
    options.memoryPreflight
  );
}

function selectStructuralMode(input: {
  fileCount: number;
  explicitFiles: string[];
  explicitTargetAuthorized: boolean;
  primaryCount: number;
  highConfidenceSingleFile: boolean;
  memoryCheckedAndAbsent: boolean;
  uncertainRoute: boolean;
  narrowingEvidenceInsufficient: boolean;
  riskSignals: PalaceRiskSignals;
  budget?: number;
}): BasePalaceModeSelection {
  const explicitTargetAuthorized = input.explicitTargetAuthorized;
  if (
    input.highConfidenceSingleFile
    && input.memoryCheckedAndAbsent
    && (!input.narrowingEvidenceInsufficient || explicitTargetAuthorized)
    && !input.riskSignals.crossStack
    && !input.riskSignals.tenantIsolationRisk
    && !input.riskSignals.publicContractRisk
    && !input.riskSignals.scopeRisk
    && !input.riskSignals.verificationChangeRisk
  ) {
    return buildSelection(
      "bypass",
      ["Safe one-file route: no relevant memory or boundary risk."],
      input.riskSignals,
      input.budget,
      input.explicitFiles.length === 1 ? 0.92 : 0.88
    );
  }

  const boundaryRisk = input.riskSignals.crossStack
    || input.riskSignals.tenantIsolationRisk
    || input.riskSignals.publicContractRisk
    || input.riskSignals.scopeRisk
    || input.riskSignals.verificationChangeRisk;
  const boundedTask = !boundaryRisk;
  if (boundedTask) {
    return buildSelection(
      "route-lite",
      [
        input.explicitFiles.length === 1
          ? "The task names one file and the route is focused."
          : input.uncertainRoute
            ? "The route is uncertain, so keep a bounded advisory context instead of widening automatically."
            : "The route has no boundary risk and can use a primary-only context."
      ],
      input.riskSignals,
      input.budget,
      0.82
    );
  }

  const reasons = [
    input.riskSignals.crossStack ? "The route crosses implementation layers." : undefined,
    input.riskSignals.tenantIsolationRisk ? "Tenant or client isolation requires broader scope evidence." : undefined,
    input.riskSignals.publicContractRisk ? "A public contract or schema may affect indirect dependencies." : undefined,
    input.riskSignals.scopeRisk ? "The requested change has repository-wide or multi-file scope." : undefined,
    input.riskSignals.verificationChangeRisk ? "The task explicitly requests verification-file changes." : undefined,
    input.uncertainRoute ? "Route confidence is too low for a narrow context." : undefined,
    input.narrowingEvidenceInsufficient
      ? "Independent implementation-anchor evidence is insufficient for narrow context."
      : undefined,
    input.fileCount > 100 ? `The repository contains ${input.fileCount} indexed files.` : undefined
  ].filter((reason): reason is string => Boolean(reason));
  return buildSelection(
    "full-palace",
    reasons.length ? reasons : ["The task benefits from primary and supporting routed context."],
    input.riskSignals,
    input.budget,
    input.uncertainRoute ? 0.68 : 0.8
  );
}

function guardedReasons(
  riskSignals: PalaceRiskSignals,
  memoryPreflight?: MemoryPreflightResult
): string[] {
  const reasons = [
    riskSignals.tenantIsolationRisk ? "Tenant or client isolation needs scoped historical evidence." : undefined,
    riskSignals.staleMemoryRisk ? "The task may conflict with stale or migrated behavior." : undefined,
    riskSignals.memoryRelevant ? "The task explicitly depends on prior decisions or pitfalls." : undefined,
    memoryPreflight?.conflictCount
      ? `${memoryPreflight.conflictCount} memory conflict(s) could not be safely resolved during preflight.`
      : undefined,
    memoryPreflight?.included
      ? `${memoryPreflight.included} current memory item(s) require guarded delivery.`
      : undefined
  ].filter((reason): reason is string => Boolean(reason));
  return reasons.length ? reasons : ["Memory evidence requires guarded delivery."];
}

function withMemoryTransition(
  selection: PalaceModeSelection,
  selectedModeBeforeMemory: PalaceMode,
  memoryPreflight?: MemoryPreflightResult
): PalaceModeSelection {
  if (!memoryPreflight) return selection;
  const safelyRejected = isSafelyRejectedMemory(memoryPreflight);
  const downgraded = safelyRejected
    && selectedModeBeforeMemory === "guarded-memory-palace"
    && selection.mode !== "guarded-memory-palace";
  return {
    ...selection,
    memoryDecision: memoryPreflight.decision,
    selectedModeBeforeMemory,
    selectedModeAfterMemory: selection.mode,
    ...(downgraded ? { modeDowngradeReason: "all_candidates_safely_rejected" as const } : {})
  };
}

function withEvidencePolicy(
  selection: BasePalaceModeSelection,
  route: PalaceRoute,
  options: SelectPalaceModeOptions,
  explicitTargetAuthorized: boolean,
  preserveExplicitOverride = false
): PalaceModeSelection {
  const memoryPreflight = options.memoryPreflight;
  const primaryCount = route.route.filter(
    (step) => (step.tier ?? inferredTier(step.priority)) === "primary"
  ).length;
  const evidenceReasons: string[] = [];

  if (memoryPreflight?.conflictCount) {
    evidenceReasons.push(`${memoryPreflight.conflictCount} unresolved memory conflict(s) remain.`);
    return finalizeEvidencePolicy(
      selection,
      "conflicted",
      evidenceReasons,
      options,
      preserveExplicitOverride
    );
  }

  if (route.evidenceClosure?.status === "conflicted") {
    evidenceReasons.push(...route.evidenceClosure.reasons);
    return finalizeEvidencePolicy(
      selection,
      "conflicted",
      evidenceReasons,
      options,
      preserveExplicitOverride
    );
  }

  if (primaryCount === 0) {
    evidenceReasons.push("The route contains no Primary task evidence.");
  }
  if (route.evidenceClosure?.status === "insufficient" && !explicitTargetAuthorized) {
    evidenceReasons.push(...route.evidenceClosure.reasons);
  }
  if (route.confidence < MIN_SUFFICIENT_ROUTE_CONFIDENCE) {
    if (!explicitTargetAuthorized) {
      evidenceReasons.push(
        `Route confidence ${route.confidence} is below the ${MIN_SUFFICIENT_ROUTE_CONFIDENCE} sufficiency threshold.`
      );
    }
  }
  if (
    route.narrowingEvidence?.independentImplementationAnchor === "missing"
    && !explicitTargetAuthorized
  ) {
    evidenceReasons.push(...route.narrowingEvidence.reasons);
  }

  const memoryChecked = Boolean(memoryPreflight) || options.relevantMemoryCount !== undefined;
  if (!memoryChecked) {
    evidenceReasons.push("Memory preflight has not confirmed whether relevant project history is absent.");
  }
  if (
    memoryPreflight?.requiresGuardedDelivery
    && memoryPreflight.included === 0
    && !isSafelyRejectedMemory(memoryPreflight)
  ) {
    evidenceReasons.push("The task requires historical evidence, but no usable memory was delivered.");
  }
  const omittedRelevantMemory = memoryPreflight?.excluded.filter(
    (item) => item.reason === "selection_limit_reached" || item.reason === "token_budget_exceeded"
  ).length ?? 0;
  if (omittedRelevantMemory > 0) {
    evidenceReasons.push(`${omittedRelevantMemory} relevant memory candidate(s) were not delivered.`);
  }

  const evidenceStatus = evidenceReasons.length ? "insufficient" : "sufficient";
  if (evidenceStatus === "sufficient") {
    evidenceReasons.push(
      `Route confidence ${route.confidence} meets the ${MIN_SUFFICIENT_ROUTE_CONFIDENCE} threshold and memory preflight has no unresolved gap.`
    );
  }

  return finalizeEvidencePolicy(
    selection,
    evidenceStatus,
    evidenceReasons,
    options,
    preserveExplicitOverride
  );
}

function finalizeEvidencePolicy(
  selection: BasePalaceModeSelection,
  evidenceStatus: PalaceModeSelection["evidenceStatus"],
  evidenceReasons: string[],
  options: SelectPalaceModeOptions,
  preserveExplicitOverride: boolean
): PalaceModeSelection {
  const evidenceSafeSelection = evidenceStatus !== "sufficient"
    && selection.mode === "bypass"
    && !preserveExplicitOverride
    ? buildSelection(
        "route-lite",
        [
          ...selection.reasons,
          `Automatic bypass selection was changed to bounded advisory routing because evidence is ${evidenceStatus}.`
        ],
        selection.riskSignals,
        options.budget,
        Math.min(selection.confidence, 0.68)
      )
    : selection;
  const boundaryRisk = evidenceSafeSelection.riskSignals.crossStack
    || evidenceSafeSelection.riskSignals.memoryRelevant
    || evidenceSafeSelection.riskSignals.staleMemoryRisk
    || evidenceSafeSelection.riskSignals.tenantIsolationRisk
    || evidenceSafeSelection.riskSignals.publicContractRisk
    || evidenceSafeSelection.riskSignals.scopeRisk
    || evidenceSafeSelection.riskSignals.verificationChangeRisk;
  const safelyBoundedMode = evidenceSafeSelection.mode === "bypass"
    || evidenceSafeSelection.mode === "route-lite";
  const interventionPolicy = evidenceStatus === "sufficient" && safelyBoundedMode && !boundaryRisk
    ? "bounded"
    : "advisory";

  return {
    ...evidenceSafeSelection,
    evidenceStatus,
    evidenceReasons,
    interventionPolicy
  };
}

function isSafelyRejectedMemory(memoryPreflight: MemoryPreflightResult): boolean {
  return memoryPreflight.candidates > 0
    && memoryPreflight.included === 0
    && memoryPreflight.conflictCount === 0
    && memoryPreflight.excluded.length === memoryPreflight.candidates
    && memoryPreflight.excluded.every(
      (item) => item.reason === "expired" || item.reason === "scope_mismatch"
    );
}

function detectRiskSignals(task: string, route: PalaceRoute): PalaceRiskSignals {
  const routePaths = route.route.map((step) => step.sourcePath.toLowerCase());
  const frontendRoute = routePaths.some((value) => /(?:frontend|client|web|ui|app\/|components?|pages?)/.test(value));
  const backendRoute = routePaths.some((value) => /(?:backend|server|api|services?|controllers?|routes?)/.test(value));
  const crossStackTerms = hasAny(task, [
    "full stack",
    "full-stack",
    "frontend and backend",
    "backend and frontend",
    "cross stack",
    "前后端",
    "跨层"
  ]);
  const memoryRelevant = hasAny(task, [
    "previous decision",
    "prior decision",
    "previous pitfall",
    "avoid repeating",
    "do not repeat",
    "memory",
    "pitfall",
    "history",
    "again",
    "之前",
    "先前",
    "踩坑",
    "记忆",
    "記憶",
    "历史",
    "歷史",
    "不要再",
    "避免重复"
  ]);
  const staleMemoryRisk = hasAny(task, [
    "stale",
    "legacy",
    "deprecated",
    "outdated",
    "migration",
    "migrate",
    "old behavior",
    "旧版",
    "舊版",
    "过期",
    "過期",
    "迁移",
    "遷移"
  ]);
  const tenantWord = hasAny(task, ["tenant", "client", "customer", "租户", "租戶", "客户", "客戶"]);
  const isolationWord = hasAny(task, [
    "isolation",
    "isolated",
    "shared",
    "multi-client",
    "multi tenant",
    "multi-tenant",
    "隔离",
    "隔離",
    "共享",
    "多客户",
    "多客戶",
    "多租户",
    "多租戶"
  ]);
  const crossTenantPreservation = /\b(?:preserv(?:e|ing)|keep|unchanged)\b.{0,48}\b(?:other|every)\b.{0,16}\b(?:tenant|client|customer)s?\b|(?:其他|其它|每个|每個).{0,16}(?:租户|租戶|客户|客戶).{0,16}(?:保持|不变|不變|保留)/i.test(task);
  const publicContractMention = hasAny(task, [
    "public api",
    "api contract",
    "response contract",
    "breaking change",
    "public schema",
    "database schema",
    "公开 api",
    "公開 api",
    "接口契约",
    "介面契約",
    "数据结构",
    "資料結構"
  ]);

  const publicContractChange = hasAny(task, [
    "change public api",
    "update public api",
    "modify public api",
    "change the public api",
    "update the public api",
    "modify the public api",
    "change api contract",
    "update api contract",
    "modify api contract",
    "change the api contract",
    "update the api contract",
    "modify the api contract",
    "breaking change",
    "change public schema",
    "update public schema",
    "change database schema",
    "update database schema"
  ]);
  const publicContractPreservation = hasAny(task, [
    "keep public api stable",
    "keep the public api stable",
    "preserve public api",
    "preserve the public api",
    "without changing public api",
    "without changing the public api",
    "do not change public api",
    "do not change the public api",
    "keep api contract stable",
    "keep the api contract stable",
    "preserve api contract",
    "preserve the api contract",
    "without changing api contract",
    "without changing the api contract",
    "keep response contract stable",
    "keep the response contract stable",
    "keep public response contract stable",
    "keep the public response contract stable",
    "preserve response contract",
    "preserve the response contract",
    "preserve public response contract",
    "preserve the public response contract",
    "without changing response contract",
    "without changing the response contract",
    "do not change response contract",
    "do not change the response contract"
  ]);
  const publicContractRisk = publicContractChange || (publicContractMention && !publicContractPreservation);
  const scopeRisk = hasAny(task, [
    "repository-wide",
    "repo-wide",
    "across the repository",
    "across the codebase",
    "entire repository",
    "entire codebase",
    "all modules",
    "every module",
    "all callers",
    "multiple packages",
    "shared behavior",
    "global behavior",
    "全仓库",
    "全倉庫",
    "整个仓库",
    "整個倉庫",
    "所有模块",
    "所有模組",
    "多个文件",
    "多個檔案"
  ]);
  const verificationChangeRisk = !/\b(?:without|do not|don't|must not|should not)\s+(?:changing?|editing?|modifying?|updating?)\s+(?:the\s+)?(?:tests?|specs?)\b/.test(task)
    && (
      /\b(?:add|create|extend|update|change|edit|modify|write)\b.{0,80}\b(?:tests?|specs?|coverage)\b/.test(task)
      || /\b(?:tests?|specs?)\b.{0,80}\b(?:add|create|extend|update|change|edit|modify|write)\b/.test(task)
      || /\bregression\s+(?:tests?|specs?)\b/.test(task)
    );

  return {
    crossStack: crossStackTerms || (frontendRoute && backendRoute),
    memoryRelevant,
    staleMemoryRisk,
    tenantIsolationRisk: tenantWord && (isolationWord || crossTenantPreservation),
    publicContractRisk,
    scopeRisk,
    verificationChangeRisk,
    testOnly: route.taskType === "test"
  };
}

function buildSelection(
  mode: PalaceMode,
  reasons: string[],
  riskSignals: PalaceRiskSignals,
  requestedBudget: number | undefined,
  confidence: number
): BasePalaceModeSelection {
  const modeBudget = {
    bypass: 512,
    "route-lite": 2_400,
    "full-palace": 6_000,
    "guarded-memory-palace": 5_000
  }[mode];
  const budget = Math.max(256, Math.min(requestedBudget ?? DEFAULT_CONTEXT_BUDGET, modeBudget));
  const disabledSections = {
    bypass: ["source-content", "support-content", "memory"],
    "route-lite": ["support-content", "memory"],
    "full-palace": [],
    "guarded-memory-palace": []
  }[mode];

  const memoryLevel = mode === "guarded-memory-palace"
    ? "guarded-evidence"
    : mode === "full-palace"
      ? "scoped-summary"
      : "none";

  return {
    mode,
    confidence: Number(confidence.toFixed(2)),
    reasons,
    disabledSections,
    maxContextTokens: budget,
    memoryLevel,
    riskSignals
  };
}

function inferredTier(priority: number): "primary" | "support" | "deferred" {
  if (priority <= 2) return "primary";
  if (priority <= 5) return "support";
  return "deferred";
}

function explicitFileReferences(task: string): string[] {
  const pathMatches = task.match(/(?:[\w.@-]+[\\/])+[\w.@-]+\.[a-z0-9]+/gi) ?? [];
  const fileMatches = task.match(/\b[\w.@-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|py|go|rs|java|cs|css|scss|html|yaml|yml|toml)\b/gi) ?? [];
  const references = pathMatches.length ? pathMatches : fileMatches;
  return [...new Set(references.map((value) => value.replaceAll("\\", "/").toLowerCase()))];
}

function explicitReferenceExists(reference: string, indexedPaths: string[]): boolean {
  const normalizedPaths = indexedPaths.map((value) => value.replaceAll("\\", "/").toLowerCase());
  if (normalizedPaths.includes(reference)) return true;
  if (reference.includes("/")) return false;
  return normalizedPaths.filter((value) => value.split("/").at(-1) === reference).length === 1;
}

function routedReferenceMatches(reference: string, routedPaths: string[]): boolean {
  if (routedPaths.includes(reference)) return true;
  if (reference.includes("/")) return false;
  return routedPaths.filter((value) => value.split("/").at(-1) === reference).length === 1;
}

function hasAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}
