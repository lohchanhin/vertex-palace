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
  const primaryCount = route.route.filter((step) => (step.tier ?? inferredTier(step.priority)) === "primary").length;
  const uncertainRoute = route.confidence < 0.55;

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

  const tinyExplicitTask = fileCount <= 30 && explicitFiles.length === 1;
  if (
    tinyExplicitTask &&
    !riskSignals.crossStack &&
    !riskSignals.publicContractRisk &&
    route.confidence >= 0.45
  ) {
    return buildSelection(
      "bypass",
      ["One explicit file in a small repository does not justify routed source context."],
      riskSignals,
      options.budget,
      0.9
    );
  }

  const boundedTask =
    !uncertainRoute &&
    !riskSignals.crossStack &&
    !riskSignals.publicContractRisk &&
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
  const publicContractRisk = hasAny(task, [
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

  return {
    crossStack: crossStackTerms || (frontendRoute && backendRoute),
    memoryRelevant,
    staleMemoryRisk,
    tenantIsolationRisk: tenantWord && isolationWord,
    publicContractRisk,
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
    "full-palace": ["memory"],
    "guarded-memory-palace": []
  }[mode];

  return {
    mode,
    confidence: Number(confidence.toFixed(2)),
    reasons,
    disabledSections,
    maxContextTokens: budget,
    memoryLevel: mode === "guarded-memory-palace" ? "guarded-evidence" : "none",
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
