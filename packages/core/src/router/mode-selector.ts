import type {
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
};

const DEFAULT_CONTEXT_BUDGET = 6_000;

export function selectPalaceMode(
  index: PalaceIndex,
  route: PalaceRoute,
  task: string,
  options: SelectPalaceModeOptions = {}
): PalaceModeSelection {
  const normalizedTask = task.toLowerCase();
  const fileCount = Object.keys(index.fileHashes).length;
  const explicitFiles = explicitFileReferences(task);
  const riskSignals = detectRiskSignals(normalizedTask, route);
  const memoryEvidenceAvailable = (options.relevantMemoryCount ?? 0) > 0;
  const primarySteps = route.route.filter((step) => (step.tier ?? inferredTier(step.priority)) === "primary");
  const primaryCount = primarySteps.length;
  const uncertainRoute = route.confidence < 0.45;

  if (options.override) {
    return buildSelection(
      options.override,
      [`Mode explicitly set to ${options.override}.`],
      riskSignals,
      options.budget,
      1
    );
  }

  if (riskSignals.memoryRelevant || riskSignals.staleMemoryRisk || riskSignals.tenantIsolationRisk) {
    const reasons = [
      riskSignals.tenantIsolationRisk ? "Tenant or client isolation needs scoped historical evidence." : undefined,
      riskSignals.staleMemoryRisk ? "The task may conflict with stale or migrated behavior." : undefined,
      riskSignals.memoryRelevant ? "The task explicitly depends on prior decisions or pitfalls." : undefined
    ].filter((reason): reason is string => Boolean(reason));
    return buildSelection("guarded-memory-palace", reasons, riskSignals, options.budget, 0.88);
  }

  const singleExplicitTarget = explicitFiles.length === 1 && route.confidence >= 0.45;
  const singleImplicitTarget = explicitFiles.length === 0
    && new Set(primarySteps.map((step) => step.sourcePath)).size === 1
    && route.confidence >= 0.5;
  const highConfidenceSingleFile = singleExplicitTarget || singleImplicitTarget;
  const memoryCheckedAndAbsent = options.relevantMemoryCount === 0;
  if (
    highConfidenceSingleFile &&
    memoryCheckedAndAbsent &&
    !riskSignals.crossStack &&
    !riskSignals.publicContractRisk &&
    !riskSignals.scopeRisk &&
    !riskSignals.verificationChangeRisk
  ) {
    return buildSelection(
      "bypass",
      ["High-confidence single-file route with no relevant memory, cross-stack dependency, contract risk, or scope risk."],
      riskSignals,
      options.budget,
      explicitFiles.length === 1 ? 0.92 : 0.88
    );
  }

  if (memoryEvidenceAvailable) {
    return buildSelection(
      "full-palace",
      [`${options.relevantMemoryCount} relevant memory item(s) require scoped delivery before narrowing context.`],
      riskSignals,
      options.budget,
      0.82
    );
  }

  const boundedTask =
    !uncertainRoute &&
    !riskSignals.crossStack &&
    !riskSignals.publicContractRisk &&
    !riskSignals.scopeRisk &&
    !riskSignals.verificationChangeRisk &&
    ((explicitFiles.length === 1 && primaryCount <= 2) || fileCount <= 100);
  if (boundedTask) {
    return buildSelection(
      "route-lite",
      [
        explicitFiles.length === 1
          ? "The task names one file and the route is focused."
          : "The repository and route are small enough for a primary-only context."
      ],
      riskSignals,
      options.budget,
      0.82
    );
  }

  const reasons = [
    riskSignals.crossStack ? "The route crosses implementation layers." : undefined,
    riskSignals.publicContractRisk ? "A public contract or schema may affect indirect dependencies." : undefined,
    riskSignals.scopeRisk ? "The requested change has repository-wide or multi-file scope." : undefined,
    riskSignals.verificationChangeRisk ? "The task explicitly requests verification-file changes." : undefined,
    uncertainRoute ? "Route confidence is too low for a narrow context." : undefined,
    fileCount > 100 ? `The repository contains ${fileCount} indexed files.` : undefined
  ].filter((reason): reason is string => Boolean(reason));
  return buildSelection(
    "full-palace",
    reasons.length ? reasons : ["The task benefits from primary and supporting routed context."],
    riskSignals,
    options.budget,
    uncertainRoute ? 0.68 : 0.8
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
    tenantIsolationRisk: tenantWord && isolationWord,
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
): PalaceModeSelection {
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

function hasAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}
