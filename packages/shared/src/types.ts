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

export type PalaceEvidenceStatus = "sufficient" | "insufficient" | "conflicted";

export type PalaceInterventionPolicy = "advisory" | "bounded";

export type PalaceReferencePolicy = "auto" | "off";

export type PalaceRouteDecision = "route" | "abstain";

export type PalaceTaskGroundingStatus = "local" | "resolved" | "unresolved";

export type PalaceTaskGroundingResolutionStatus =
  | "not-needed"
  | "cache-hit"
  | "fetched"
  | "disabled"
  | "network-error"
  | "unauthorized"
  | "not-found"
  | "rate-limited"
  | "unsupported-remote";

export type PalaceTaskReference = {
  provider: "github";
  kind: "issue" | "pull";
  repository: string;
  number: number;
  url: string;
  resolutionStatus: PalaceTaskGroundingResolutionStatus;
  title?: string;
  contentHash?: string;
};

export type PalaceTaskGrounding = {
  status: PalaceTaskGroundingStatus;
  decision: PalaceRouteDecision;
  resolutionStatus: PalaceTaskGroundingResolutionStatus;
  references: PalaceTaskReference[];
  reasons: string[];
};

export type RouteTier = "primary" | "support" | "deferred" | "excluded";

export type MemoryLevel = "none" | "hint" | "scoped-summary" | "guarded-evidence";

export type MemoryExclusionReason =
  | "scope_mismatch"
  | "expired"
  | "selection_limit_reached"
  | "token_budget_exceeded";

export type MemoryExclusion = {
  id: string;
  reason: MemoryExclusionReason;
};

export type MemoryScopeInference = {
  client: string;
  reason: "unique_historical_alias_match";
  evidenceTokens: string[];
};

export type GuardedMemoryItem = {
  id: string;
  text: string;
  scope: string;
  ageDays: number;
  confidence: number;
  risk: "low" | "medium" | "high";
  source: "pitfall" | "failed-attempt";
  memoryPath: string;
  contradictionCheck: string;
};

export type MemoryPreflightDecision =
  | "none"
  | "current_memory_available"
  | "stale_rejected"
  | "scope_rejected"
  | "conflict_requires_guard";

export type MemoryPreflightResult = {
  decision: MemoryPreflightDecision;
  candidates: number;
  included: number;
  excluded: MemoryExclusion[];
  candidateIds: string[];
  includedIds: string[];
  currentRelevantCount: number;
  rejectedStaleCount: number;
  rejectedScopeCount: number;
  conflictCount: number;
  requiresGuardedDelivery: boolean;
  items: GuardedMemoryItem[];
  estimatedTokens: number;
  scopeInference?: MemoryScopeInference;
};

export type MemorySelectionTelemetry = {
  memoryCandidates: number;
  memoryIncluded: number;
  memoryExcluded: MemoryExclusion[];
  candidateIds: string[];
  includedIds: string[];
  scopeInference?: MemoryScopeInference;
  memoryDecision?: MemoryPreflightDecision;
  currentRelevantCount?: number;
  rejectedStaleCount?: number;
  rejectedScopeCount?: number;
  conflictCount?: number;
  requiresGuardedDelivery?: boolean;
  selectedModeBeforeMemory?: PalaceMode;
  selectedModeAfterMemory?: PalaceMode;
  modeDowngradeReason?: "all_candidates_safely_rejected";
};

export type PalaceExecutionBoundaries = {
  primary: string[];
  support: string[];
  deferred: string[];
  excluded: {
    sourcePath: string;
    reason: string;
  }[];
  requiredEvidence: string[];
  doNot: string[];
  stopCondition: string[];
  conflictSummary: string[];
  contractCapsule?: {
    input: string;
    output: string;
    invariant: string;
    prohibitedChange: string;
  };
  verification: {
    batchCommands: boolean;
    finalScopeCheckRequired: boolean;
  };
  stopEnforced: boolean;
};

export type PalaceRiskSignals = {
  crossStack: boolean;
  memoryRelevant: boolean;
  staleMemoryRisk: boolean;
  tenantIsolationRisk: boolean;
  publicContractRisk: boolean;
  scopeRisk: boolean;
  verificationChangeRisk: boolean;
  testOnly: boolean;
};

export type PalaceModeSelection = {
  mode: PalaceMode;
  confidence: number;
  reasons: string[];
  evidenceStatus: PalaceEvidenceStatus;
  evidenceReasons: string[];
  interventionPolicy: PalaceInterventionPolicy;
  disabledSections: string[];
  maxContextTokens: number;
  memoryLevel: MemoryLevel;
  riskSignals: PalaceRiskSignals;
  memoryDecision?: MemoryPreflightDecision;
  selectedModeBeforeMemory?: PalaceMode;
  selectedModeAfterMemory?: PalaceMode;
  modeDowngradeReason?: "all_candidates_safely_rejected";
};

export type PalaceSectionMetric = {
  bytes: number;
  estimatedTokens: number;
};

export type PalaceSectionMetrics = {
  task: PalaceSectionMetric;
  modeExplanation: PalaceSectionMetric;
  primary: PalaceSectionMetric;
  support: PalaceSectionMetric;
  deferred: PalaceSectionMetric;
  excluded: PalaceSectionMetric;
  memory: PalaceSectionMetric;
  guardrails: PalaceSectionMetric;
  requiredEvidence: PalaceSectionMetric;
  doNot: PalaceSectionMetric;
  stopCondition: PalaceSectionMetric;
  conflictSummary: PalaceSectionMetric;
  serializationOverheadBytes: number;
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
  sectionMetrics: PalaceSectionMetrics;
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

export type EvidenceRole =
  | "navigation"
  | "implementation"
  | "verification"
  | "contract"
  | "documentation"
  | "configuration"
  | "generated"
  | "runtime"
  | "decision"
  | "memory";

export type EvidenceScope = "product" | "documentation" | "tooling" | "project-history" | "unknown";

export type EvidenceRoleAssignment = {
  role: EvidenceRole;
  basis: "syntax" | "artifact-kind" | "path-convention" | "declaration" | "history";
  confidence: number;
};

export type PalaceNodeEvidence = {
  scope: EvidenceScope;
  roles: EvidenceRoleAssignment[];
};

export type EvidenceFactKind =
  | "declaration"
  | "reference"
  | "call"
  | "import"
  | "export"
  | "test-case"
  | "test-suite"
  | "contract"
  | "configuration"
  | "generation"
  | "runtime-observation"
  | "decision";

export type ParsedEvidenceFact = {
  kind: EvidenceFactKind;
  role: EvidenceRole;
  name: string;
  startLine: number;
  endLine: number;
  searchText?: string;
  confidence: number;
};

export type PalaceEvidenceFact = ParsedEvidenceFact & {
  id: string;
  sourcePath: string;
  scope: EvidenceScope;
  provenance: {
    extractor: string;
    directness: "direct" | "inferred";
  };
};

export type TaskIntentTerm = {
  value: string;
  normalized: string;
  kind: "identifier" | "concept" | "outcome" | "constraint";
  source: "explicit" | "inferred";
};

export type TaskIntent = {
  action: TaskType;
  implementationBoundary: "declaration" | "runtime";
  subjects: TaskIntentTerm[];
  outcomes: TaskIntentTerm[];
  constraints: TaskIntentTerm[];
  requestedRoles: EvidenceRole[];
  requiredRoles: EvidenceRole[];
  preferredScopes: EvidenceScope[];
  verificationRequired: boolean;
};

export type EvidenceClosure = {
  status: PalaceEvidenceStatus;
  requiredRoles: EvidenceRole[];
  coveredRoles: EvidenceRole[];
  missingRoles: EvidenceRole[];
  termCoverage: {
    subjects: EvidenceTermCoverage;
    outcomes: EvidenceTermCoverage;
    constraints: EvidenceTermCoverage;
  };
  connectedRolePairs: Array<{
    from: EvidenceRole;
    to: EvidenceRole;
    strength: number;
    hops: number;
    via: string[];
  }>;
  requiredCausalSources: string[];
  missingCausalSources: string[];
  reasons: string[];
};

export type EvidenceTermCoverage = {
  required: string[];
  covered: string[];
  missing: string[];
};

export type RouteConfidenceEvidence = {
  basis: "evidence-closure-v2";
  score: number;
  completeness: number;
  connectivity: number;
  semanticCoverage: number;
  ambiguity: number;
  indexFreshness: "fresh" | "stale" | "unknown";
  memoryReliability: "not-applied" | "current" | "guarded" | "conflicted";
};

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
  evidence?: PalaceNodeEvidence;
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

export type PalaceRouteNarrowingEvidence = {
  independentImplementationAnchor: "confirmed" | "missing" | "not-required";
  leadingTaskAnchors: string[];
  reasons: string[];
};

export type PalaceRoute = {
  id: string;
  task: string;
  taskType: TaskType;
  decision: PalaceRouteDecision;
  taskGrounding: PalaceTaskGrounding;
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
  intent?: TaskIntent;
  evidenceClosure?: EvidenceClosure;
  confidenceEvidence?: RouteConfidenceEvidence;
  narrowingEvidence?: PalaceRouteNarrowingEvidence;
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
  searchText?: string;
};

export type ParsedHeading = {
  depth: number;
  text: string;
  line: number;
};

export type ParsedPackageMetadata = {
  name: string;
  entryPoints: string[];
};

export type ParsedGeneratedArtifact = {
  inputPath: string;
  outputPath: string;
  tool: string;
};

export type ParsedGeneratedArtifactNode = {
  inputPath: string;
  configPath: string;
  tool: string;
};

export type ParsedFile = {
  sourcePath: string;
  language: string;
  imports: string[];
  exports: string[];
  symbols: ParsedSymbol[];
  facts?: ParsedEvidenceFact[];
  headings?: ParsedHeading[];
  packageMetadata?: ParsedPackageMetadata;
  generatedArtifacts?: ParsedGeneratedArtifact[];
  generatedArtifact?: ParsedGeneratedArtifactNode;
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
  facts: PalaceEvidenceFact[];
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
  factCount: number;
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
  factCount: number;
  roomCount: number;
  symbolCount: number;
  ignoredCount: number;
  indexedAt: string;
};

export type PackOutput = {
  task: string;
  routeId: string;
  decision?: PalaceRouteDecision;
  taskGrounding?: PalaceTaskGrounding;
  estimatedTokens: number;
  mode?: PalaceMode;
  modeSelection?: PalaceModeSelection;
  payload?: PalacePayloadMetrics;
  memoryTelemetry?: MemorySelectionTelemetry;
  executionBoundaries?: PalaceExecutionBoundaries;
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
  referencePolicy?: PalaceReferencePolicy;
};

export type PalaceEvaluationInput = {
  root?: string;
  task: string;
  routeId?: string;
  changedFiles?: string[];
  coreFiles?: string[];
  declaredAuxiliaryFiles?: string[];
  latentAuxiliaryFiles?: string[];
  budget?: number;
  routeLimit?: number;
  maxDrawers?: number;
  referencePolicy?: PalaceReferencePolicy;
};

export type PalaceEvaluationCoverageLayer = {
  files: string[];
  matchedFiles: string[];
  missedFiles: string[];
  coverage?: number;
  routeFocus?: number;
};

export type PalaceEvaluation = {
  id: string;
  task: string;
  taskType: TaskType;
  decision: PalaceRouteDecision;
  taskGrounding: PalaceTaskGrounding;
  routeId: string;
  createdAt: string;
  route: {
    confidence: number;
    files: string[];
    fileCount: number;
  };
  context: {
    measurement: "adaptive-delivered-payload";
    deliveryMode: PalaceMode;
    payloadBytes: number;
    tokenCeiling: number;
    repositoryTextFiles: number;
    skippedBinaryFiles: number;
    skippedGeneratedFiles: number;
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
    layers: {
      core: PalaceEvaluationCoverageLayer;
      declaredAuxiliary: PalaceEvaluationCoverageLayer;
      latentAuxiliary: PalaceEvaluationCoverageLayer;
    };
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
