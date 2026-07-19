export type PalaceNodeKind =
  | "directory"
  | "file"
  | "symbol"
  | "function"
  | "class"
  | "interface"
  | "type"
  | "api"
  | "test"
  | "config"
  | "doc"
  | "runtime-log"
  | "decision"
  | "memory";

export type PalaceFloor =
  | "00-entrance"
  | "01-business"
  | "02-interface"
  | "03-implementation"
  | "04-data"
  | "05-verification"
  | "06-runtime"
  | "07-memory";

export type LoadLevel =
  | "summary"
  | "signature"
  | "snippet"
  | "full_symbol"
  | "full_file"
  | "defer";

export type PalaceMode =
  | "bypass"
  | "route-lite"
  | "full-palace"
  | "guarded-memory-palace";

export type RouteTier = "primary" | "support" | "deferred" | "excluded";

export type MemoryLevel = "none" | "hint" | "scoped-summary" | "guarded-evidence";

export type MemoryExclusionReason =
  | "scope_mismatch"
  | "expired"
  | "selection_limit_reached"
  | "token_budget_exceeded";

export type MemorySelectionTelemetry = {
  memoryCandidates: number;
  memoryIncluded: number;
  memoryExcluded: {
    id: string;
    reason: MemoryExclusionReason;
  }[];
  candidateIds: string[];
  includedIds: string[];
};

export type PalaceRiskSignals = {
  crossStack: boolean;
  memoryRelevant: boolean;
  staleMemoryRisk: boolean;
  tenantIsolationRisk: boolean;
  publicContractRisk: boolean;
  testOnly: boolean;
};

export type PalaceModeSelection = {
  mode: PalaceMode;
  confidence: number;
  reasons: string[];
  disabledSections: string[];
  maxContextTokens: number;
  memoryLevel: MemoryLevel;
  riskSignals: PalaceRiskSignals;
};

export type PalacePayloadMetrics = {
  mode: PalaceMode;
  calls: number;
  contextCalls: number;
  contextBytes: number;
  contextEstimatedTokens: number;
  routeStepCount: number;
  primaryCount: number;
  supportCount: number;
  deferredCount: number;
  memoryItemCount: number;
  memoryCandidateCount: number;
  memoryExcludedCount: number;
  memoryEstimatedTokens: number;
  guardrailCount: number;
};

export type TaskType =
  | "bugfix"
  | "feature"
  | "refactor"
  | "test"
  | "explain"
  | "evaluation"
  | "release"
  | "review"
  | "unknown";

export type PalaceNode = {
  id: string;
  palacePath: string;
  sourcePath: string;
  floor: PalaceFloor;
  wing?: string;
  room?: string;
  cabinet?: string;
  drawer?: string;
  kind: PalaceNodeKind;
  language?: string;
  title: string;
  summary: string;
  tags: string[];
  startLine?: number;
  endLine?: number;
  tokenCost: number;
  contentHash: string;
  sourceHash: string;
  lod: {
    level0?: string;
    level1?: string;
    level2?: string;
    level3?: string;
    level4?: string;
    level5Ref?: {
      sourcePath: string;
      startLine?: number;
      endLine?: number;
    };
  };
  createdAt: string;
  updatedAt: string;
};

export type PalaceEdgeType =
  | "contains"
  | "imports"
  | "exports"
  | "calls"
  | "tested_by"
  | "tests"
  | "documents"
  | "configures"
  | "depends_on"
  | "same_room"
  | "same_wing"
  | "changed_with"
  | "runtime_evidence_for"
  | "memory_of"
  | "successful_route_for"
  | "failed_route_for";

export type PalaceEdge = {
  id: string;
  from: string;
  to: string;
  type: PalaceEdgeType;
  weight: number;
  evidence?: string;
  createdAt: string;
};

export type PalaceRoom = {
  id: string;
  palacePath: string;
  floor: PalaceFloor;
  wing: string;
  room: string;
  title: string;
  summary: string;
  sourcePaths: string[];
  drawers: string[];
  cabinets: string[];
  tags: string[];
  entryNodes: string[];
  verificationNodes: string[];
  runtimeNodes: string[];
  memoryNodes: string[];
  tokenCost: {
    summary: number;
    full: number;
  };
  updatedAt: string;
};

export type PalaceRouteStep = {
  nodeId: string;
  palacePath: string;
  sourcePath: string;
  reason: string;
  loadLevel: LoadLevel;
  estimatedTokens: number;
  priority: number;
  tier?: Exclude<RouteTier, "excluded">;
  confidence?: number;
  evidence?: string[];
};

export type PalaceRoute = {
  id: string;
  task: string;
  taskType: TaskType;
  entry: {
    floor: PalaceFloor;
    wing?: string;
    room?: string;
  };
  route: PalaceRouteStep[];
  excluded: {
    sourcePath: string;
    reason: string;
  }[];
  budget: {
    maxInputTokens: number;
    estimatedTokens: number;
    reservedOutputTokens: number;
  };
  confidence: number;
  createdAt: string;
};

export type PalaceConfig = {
  schema_version: 1;
  project_name: string;
  created_at: string;
  updated_at: string;
  source_root: string;
  palace_root: string;
  ignore: string[];
  language: {
    primary: string;
    parsers: {
      typescript: boolean;
      javascript: boolean;
      markdown: boolean;
      json: boolean;
      fallback: boolean;
    };
  };
  floors: PalaceFloor[];
};

export type ScanRepoInput = {
  root: string;
  palaceRoot?: string;
  includeHidden?: boolean;
};

export type ScanRepoOutput = {
  root: string;
  files: {
    path: string;
    size: number;
    hash: string;
    language: string;
  }[];
  ignored: {
    path: string;
    reason: string;
  }[];
};

export type ParsedSymbol = {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "const" | "method";
  startLine: number;
  endLine: number;
  signature: string;
};

export type ParsedHeading = {
  depth: number;
  text: string;
  line: number;
};

export type ParsedFile = {
  sourcePath: string;
  language: string;
  imports: string[];
  exports: string[];
  symbols: ParsedSymbol[];
  headings?: ParsedHeading[];
  summarySeed: string;
};

export type DirectoryTreeNode = {
  name: string;
  path: string;
  type: "directory" | "file";
  children?: DirectoryTreeNode[];
};

export type PalaceIndex = {
  nodes: PalaceNode[];
  edges: PalaceEdge[];
  rooms: PalaceRoom[];
  symbols: PalaceNode[];
  directoryTree: DirectoryTreeNode;
  fileHashes: Record<string, string>;
  routes: PalaceRoute[];
};

export type PalaceStatus = {
  root: string;
  palaceRoot: string;
  initialized: boolean;
  indexed: boolean;
  stale: boolean;
  nodeCount: number;
  edgeCount: number;
  roomCount: number;
  lastIndexedAt?: string;
  configPath?: string;
};

export type IndexPalaceOutput = {
  root: string;
  palaceRoot: string;
  fileCount: number;
  nodeCount: number;
  edgeCount: number;
  roomCount: number;
  symbolCount: number;
  ignoredCount: number;
  indexedAt: string;
};

export type PackOutput = {
  task: string;
  routeId: string;
  estimatedTokens: number;
  mode?: PalaceMode;
  modeSelection?: PalaceModeSelection;
  payload?: PalacePayloadMetrics;
  memoryTelemetry?: MemorySelectionTelemetry;
  markdown?: string;
  json?: unknown;
};

export type PalaceContextInput = {
  root?: string;
  task: string;
  budget?: number;
  format?: "markdown" | "json";
  routeLimit?: number;
  maxDrawers?: number;
  auto?: boolean;
  mode?: PalaceMode;
};

export type PalaceEvaluationInput = {
  root?: string;
  task: string;
  routeId?: string;
  changedFiles?: string[];
  budget?: number;
  routeLimit?: number;
  maxDrawers?: number;
};

export type PalaceEvaluation = {
  id: string;
  task: string;
  taskType: TaskType;
  routeId: string;
  createdAt: string;
  route: {
    confidence: number;
    files: string[];
    fileCount: number;
  };
  context: {
    repositoryTextFiles: number;
    skippedBinaryFiles: number;
    repositoryTokens: number;
    packTokens: number;
    savedTokens: number;
    tokenReductionPercent: number;
    repositoryToPackRatio: number;
  };
  coverage: {
    status: "measured" | "unverified";
    changedFiles: string[];
    matchedFiles: string[];
    missedFiles: string[];
    routeOnlyFiles: string[];
    changedFileCoverage?: number;
    routeFocus?: number;
  };
  calibration: {
    status: "unverified" | "well-calibrated" | "overconfident" | "underconfident";
    predictedConfidence: number;
    observedCoverage?: number;
    error?: number;
  };
  assessment: "strong" | "needs-review" | "unverified";
  warnings: string[];
  artifacts: {
    markdownPath: string;
    jsonPath: string;
    latestMarkdownPath: string;
    latestJsonPath: string;
  };
  markdown: string;
};

export type OpenOutput = {
  node: PalaceNode;
  content: string;
  estimatedTokens: number;
};

export type MemoryInput = {
  root?: string;
  client?: string;
  task: string;
  routeId?: string;
  outcome: "success" | "failed" | "partial";
  changedFiles?: string[];
  testsRun?: {
    command: string;
    status: "passed" | "failed" | "skipped";
    summary?: string;
  }[];
  decisions?: string[];
  failedAttempts?: string[];
  pitfalls?: string[];
  tags?: string[];
  notes?: string;
};

export type DoctorIssue = {
  severity: "info" | "warning" | "error";
  message: string;
  fix?: string;
};

export type DoctorOutput = {
  ok: boolean;
  issues: DoctorIssue[];
};
