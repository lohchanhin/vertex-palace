import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  PalaceEvaluation,
  PalaceEvaluationCoverageLayer,
  PalaceEvaluationInput,
  PalaceIndex,
  PalaceRoute
} from "@vertex-palace/shared";
import { indexPalace } from "../indexer/index-palace";
import { packAutoContextForRoute } from "../packer/context-packer";
import { estimateTokens } from "../packer/token-estimator";
import { routePalace } from "../router/route-planner";
import { hashText } from "../scanner/file-hash";
import { readIndex } from "../storage/read-palace";
import { getPalaceStatus } from "../storage/status";
import { writeJson } from "../storage/write-palace";
import { isBinaryLikePath } from "../utils/binary-files";
import { assertPalace } from "../utils/errors";
import { normalizeRelativePath, relativePath } from "../utils/path-utils";

export type EvaluateRouteOptions = Omit<PalaceEvaluationInput, "root" | "task">;

type RepositoryTokenEstimate = {
  textFiles: number;
  skippedBinaryFiles: number;
  skippedGeneratedFiles: number;
  tokens: number;
};

export async function evaluateRoute(root: string, task: string, options: EvaluateRouteOptions = {}): Promise<PalaceEvaluation> {
  await ensureFreshIndex(root);
  let index = await readIndex(root);
  const route = await resolveRoute(root, task, options, index);
  index = await readIndex(root);

  const [pack, repository] = await Promise.all([
    packAutoContextForRoute(root, task, route, {
      budget: options.budget,
      routeLimit: options.routeLimit,
      maxDrawers: options.maxDrawers
    }),
    estimateRepositoryTokens(root, index)
  ]);

  const routeFiles = unique(route.route.map((step) => stripLocation(step.sourcePath)));
  const legacyChangedFiles = normalizeFiles(root, options.changedFiles);
  const layeredInputProvided = options.coreFiles !== undefined
    || options.declaredAuxiliaryFiles !== undefined
    || options.latentAuxiliaryFiles !== undefined;
  const coreFiles = layeredInputProvided ? normalizeFiles(root, options.coreFiles) : legacyChangedFiles;
  const declaredAuxiliaryFiles = normalizeFiles(root, options.declaredAuxiliaryFiles);
  const latentAuxiliaryFiles = normalizeFiles(root, options.latentAuxiliaryFiles);
  const changedFiles = layeredInputProvided
    ? unique([...coreFiles, ...declaredAuxiliaryFiles, ...latentAuxiliaryFiles])
    : legacyChangedFiles;
  const routeKeys = new Map(routeFiles.map((file) => [pathKey(file), file]));
  const changedKeys = new Map(changedFiles.map((file) => [pathKey(file), file]));
  const matchedFiles = changedFiles.filter((file) => routeKeys.has(pathKey(file)));
  const missedFiles = changedFiles.filter((file) => !routeKeys.has(pathKey(file)));
  const routeOnlyFiles = routeFiles.filter((file) => !changedKeys.has(pathKey(file)));
  const changedFileCoverage = changedFiles.length ? ratio(matchedFiles.length, changedFiles.length) : undefined;
  const routeFocus = changedFiles.length && routeFiles.length ? ratio(matchedFiles.length, routeFiles.length) : undefined;
  const layers = {
    core: evaluateCoverageLayer(coreFiles, routeKeys, routeFiles.length),
    declaredAuxiliary: evaluateCoverageLayer(declaredAuxiliaryFiles, routeKeys, routeFiles.length),
    latentAuxiliary: evaluateCoverageLayer(latentAuxiliaryFiles, routeKeys, routeFiles.length)
  };
  const calibration = calibrateConfidence(route.confidence, layers.core.coverage);
  const packTokens = pack.estimatedTokens;
  const savedTokens = repository.tokens - packTokens;
  const tokenReductionPercent = repository.tokens ? percent(savedTokens, repository.tokens) : 0;
  const repositoryToPackRatio = packTokens ? rounded(repository.tokens / packTokens, 2) : 0;
  const createdAt = new Date().toISOString();
  const id = `evaluation_${hashText(`${route.id}:${createdAt}:${changedFiles.join("|")}`).slice(0, 16)}`;
  const artifacts = artifactPaths(id);
  const warnings = buildWarnings({
    changedFiles,
    missedFiles,
    missedCoreFiles: layers.core.missedFiles,
    missedDeclaredAuxiliaryFiles: layers.declaredAuxiliary.missedFiles,
    missedLatentAuxiliaryFiles: layers.latentAuxiliary.missedFiles,
    repositoryTokens: repository.tokens,
    packTokens,
    calibrationStatus: calibration.status
  });
  const assessment = assess(
    layers.core.coverage,
    layers.declaredAuxiliary.coverage,
    calibration.status
  );

  const evaluationWithoutMarkdown: Omit<PalaceEvaluation, "markdown"> = {
    id,
    task,
    taskType: route.taskType,
    decision: route.decision,
    taskGrounding: route.taskGrounding,
    routeId: route.id,
    createdAt,
    route: {
      confidence: route.confidence,
      files: routeFiles,
      fileCount: routeFiles.length
    },
    context: {
      measurement: "adaptive-delivered-payload",
      deliveryMode: pack.mode ?? "full-palace",
      payloadBytes: pack.payload?.contextBytes ?? 0,
      tokenCeiling: pack.modeSelection?.maxContextTokens ?? options.budget ?? 0,
      repositoryTextFiles: repository.textFiles,
      skippedBinaryFiles: repository.skippedBinaryFiles,
      skippedGeneratedFiles: repository.skippedGeneratedFiles,
      repositoryTokens: repository.tokens,
      packTokens,
      savedTokens,
      tokenReductionPercent,
      repositoryToPackRatio
    },
    coverage: {
      status: changedFiles.length ? "measured" : "unverified",
      changedFiles,
      matchedFiles,
      missedFiles,
      routeOnlyFiles,
      changedFileCoverage,
      routeFocus,
      layers
    },
    calibration,
    assessment,
    warnings,
    artifacts
  };
  const evaluation: PalaceEvaluation = {
    ...evaluationWithoutMarkdown,
    markdown: renderEvaluationMarkdown(evaluationWithoutMarkdown)
  };

  await persistEvaluation(root, evaluation);
  return evaluation;
}

export function calibrateConfidence(
  predictedConfidence: number,
  observedCoverage?: number
): PalaceEvaluation["calibration"] {
  if (observedCoverage === undefined) {
    return { status: "unverified", predictedConfidence };
  }

  const error = rounded(Math.abs(predictedConfidence - observedCoverage), 2);
  const status =
    error <= 0.15 ? "well-calibrated" : predictedConfidence > observedCoverage ? "overconfident" : "underconfident";
  return {
    status,
    predictedConfidence,
    observedCoverage,
    error
  };
}

async function ensureFreshIndex(root: string): Promise<void> {
  const status = await getPalaceStatus(root);
  if (!status.initialized || !status.indexed || status.stale) {
    await indexPalace(root);
  }
}

async function resolveRoute(
  root: string,
  task: string,
  options: EvaluateRouteOptions,
  index: PalaceIndex
): Promise<PalaceRoute> {
  if (!options.routeId) {
    return routePalace(root, task, {
      budget: options.budget,
      routeLimit: options.routeLimit,
      referencePolicy: options.referencePolicy
    });
  }

  const route = index.routes.find((candidate) => candidate.id === options.routeId);
  assertPalace(route, `Route ${options.routeId} was not found. Run palace route first or omit --route-id.`, "PALACE_ROUTE_NOT_FOUND");
  return route;
}

async function estimateRepositoryTokens(root: string, index: PalaceIndex): Promise<RepositoryTokenEstimate> {
  const languages = new Map(index.nodes.map((node) => [node.sourcePath, node.language]));
  const generatedArtifacts = new Set(
    index.nodes.filter((node) => node.tags.includes("generated-artifact")).map((node) => node.sourcePath)
  );
  const sourcePaths = Object.keys(index.fileHashes).sort();
  let textFiles = 0;
  let skippedBinaryFiles = 0;
  let skippedGeneratedFiles = 0;
  let tokens = 0;

  for (let offset = 0; offset < sourcePaths.length; offset += 50) {
    const batch = sourcePaths.slice(offset, offset + 50);
    const estimates = await Promise.all(
      batch.map(async (sourcePath) => {
        if (generatedArtifacts.has(sourcePath)) {
          return { binary: false, generated: true, tokens: 0 };
        }
        if (isBinaryLikePath(sourcePath, languages.get(sourcePath))) {
          return { binary: true, generated: false, tokens: 0 };
        }
        try {
          const content = await readFile(path.join(root, sourcePath));
          if (content.includes(0)) return { binary: true, generated: false, tokens: 0 };
          return { binary: false, generated: false, tokens: estimateTokens(content.toString("utf8")) };
        } catch {
          return { binary: false, generated: false, tokens: 0 };
        }
      })
    );
    for (const estimate of estimates) {
      if (estimate.generated) skippedGeneratedFiles += 1;
      else if (estimate.binary) skippedBinaryFiles += 1;
      else {
        textFiles += 1;
        tokens += estimate.tokens;
      }
    }
  }

  return { textFiles, skippedBinaryFiles, skippedGeneratedFiles, tokens };
}

function normalizeChangedFile(root: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = path.isAbsolute(trimmed) ? relativePath(root, path.resolve(trimmed)) : normalizeRelativePath(trimmed);
  return stripLocation(normalized);
}

function normalizeFiles(root: string, values: string[] | undefined): string[] {
  return unique((values ?? []).map((file) => normalizeChangedFile(root, file)).filter(Boolean));
}

function evaluateCoverageLayer(
  files: string[],
  routeKeys: Map<string, string>,
  routeFileCount: number
): PalaceEvaluationCoverageLayer {
  const matchedFiles = files.filter((file) => routeKeys.has(pathKey(file)));
  const missedFiles = files.filter((file) => !routeKeys.has(pathKey(file)));
  return {
    files,
    matchedFiles,
    missedFiles,
    ...(files.length ? { coverage: ratio(matchedFiles.length, files.length) } : {}),
    ...(files.length && routeFileCount ? { routeFocus: ratio(matchedFiles.length, routeFileCount) } : {})
  };
}

function stripLocation(sourcePath: string): string {
  return normalizeRelativePath(sourcePath).replace(/:\d+(?:-\d+)?$/, "");
}

function pathKey(sourcePath: string): string {
  return normalizeRelativePath(sourcePath).toLowerCase();
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = pathKey(value);
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ratio(numerator: number, denominator: number): number {
  return denominator ? rounded(numerator / denominator, 3) : 0;
}

function percent(numerator: number, denominator: number): number {
  return denominator ? rounded((numerator / denominator) * 100, 1) : 0;
}

function rounded(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

function assess(
  coreCoverage: number | undefined,
  declaredAuxiliaryCoverage: number | undefined,
  calibrationStatus: PalaceEvaluation["calibration"]["status"]
): PalaceEvaluation["assessment"] {
  if (coreCoverage === undefined) return "unverified";
  const declaredAuxiliaryClosed = declaredAuxiliaryCoverage === undefined || declaredAuxiliaryCoverage === 1;
  if (coreCoverage >= 0.8 && declaredAuxiliaryClosed && calibrationStatus !== "overconfident") {
    return "strong";
  }
  return "needs-review";
}

function buildWarnings(input: {
  changedFiles: string[];
  missedFiles: string[];
  missedCoreFiles: string[];
  missedDeclaredAuxiliaryFiles: string[];
  missedLatentAuxiliaryFiles: string[];
  repositoryTokens: number;
  packTokens: number;
  calibrationStatus: PalaceEvaluation["calibration"]["status"];
}): string[] {
  const warnings: string[] = [];
  if (!input.changedFiles.length) warnings.push("Route quality is unverified because no changed files were provided.");
  if (input.missedFiles.length) warnings.push(`Route missed ${input.missedFiles.length} changed file(s).`);
  if (input.missedCoreFiles.length) warnings.push(`Route missed ${input.missedCoreFiles.length} core implementation or verification file(s).`);
  if (input.missedDeclaredAuxiliaryFiles.length) {
    warnings.push(`Route missed ${input.missedDeclaredAuxiliaryFiles.length} explicitly required auxiliary file(s).`);
  }
  if (input.missedLatentAuxiliaryFiles.length) {
    warnings.push(`${input.missedLatentAuxiliaryFiles.length} latent auxiliary file(s) were not routed; this is descriptive, not a core failure.`);
  }
  if (!input.repositoryTokens) warnings.push("Repository token estimate is empty; refresh the index and check ignore rules.");
  if (input.repositoryTokens && input.packTokens >= input.repositoryTokens) {
    warnings.push("The context pack is not smaller than the indexed repository text.");
  }
  if (input.calibrationStatus === "overconfident") warnings.push("Route confidence is higher than observed changed-file coverage.");
  return warnings;
}

function artifactPaths(id: string): PalaceEvaluation["artifacts"] {
  return {
    markdownPath: `.palace/evaluations/${id}.md`,
    jsonPath: `.palace/evaluations/${id}.json`,
    latestMarkdownPath: ".palace/evaluations/latest-evaluation.md",
    latestJsonPath: ".palace/evaluations/latest-evaluation.json"
  };
}

async function persistEvaluation(root: string, evaluation: PalaceEvaluation): Promise<void> {
  await mkdir(path.join(root, ".palace", "evaluations"), { recursive: true });
  await Promise.all([
    writeJson(root, evaluation.artifacts.jsonPath, evaluation),
    writeJson(root, evaluation.artifacts.latestJsonPath, evaluation),
    writeFile(path.join(root, evaluation.artifacts.markdownPath), evaluation.markdown, "utf8"),
    writeFile(path.join(root, evaluation.artifacts.latestMarkdownPath), evaluation.markdown, "utf8")
  ]);
}

function renderEvaluationMarkdown(evaluation: Omit<PalaceEvaluation, "markdown">): string {
  const coverage = evaluation.coverage.changedFileCoverage;
  const focus = evaluation.coverage.routeFocus;
  const lines = [
    "# Vertex Palace Evaluation",
    "",
    `Task: ${evaluation.task}`,
    `Route: ${evaluation.routeId}`,
    `Task type: ${evaluation.taskType}`,
    `Route decision: ${evaluation.decision}`,
    `Task grounding: ${evaluation.taskGrounding.status} (${evaluation.taskGrounding.resolutionStatus})`,
    `Assessment: ${evaluation.assessment}`,
    `Created: ${evaluation.createdAt}`,
    "",
    "## Context Efficiency",
    "",
    `- Measurement: ${evaluation.context.measurement}`,
    `- Delivery mode: ${evaluation.context.deliveryMode}`,
    `- Payload bytes: ${evaluation.context.payloadBytes}`,
    `- Token ceiling: ${evaluation.context.tokenCeiling}`,
    `- Indexed repository text: ${evaluation.context.repositoryTokens} estimated tokens across ${evaluation.context.repositoryTextFiles} files`,
    `- Context pack: ${evaluation.context.packTokens} estimated tokens`,
    `- Tokens saved: ${evaluation.context.savedTokens}`,
    `- Reduction: ${evaluation.context.tokenReductionPercent}%`,
    `- Repository-to-pack ratio: ${evaluation.context.repositoryToPackRatio}x`,
    `- Skipped binary files: ${evaluation.context.skippedBinaryFiles}`,
    `- Skipped generated artifacts: ${evaluation.context.skippedGeneratedFiles}`,
    "",
    "## Route Quality",
    "",
    `- Route confidence: ${evaluation.route.confidence}`,
    `- Changed-file coverage: ${coverage === undefined ? "unverified" : `${Math.round(coverage * 100)}%`}`,
    `- Route focus: ${focus === undefined ? "unverified" : `${Math.round(focus * 100)}%`}`,
    `- Core coverage: ${formatCoverage(evaluation.coverage.layers.core.coverage)}`,
    `- Declared auxiliary coverage: ${formatCoverage(evaluation.coverage.layers.declaredAuxiliary.coverage)}`,
    `- Latent auxiliary coverage: ${formatCoverage(evaluation.coverage.layers.latentAuxiliary.coverage)} (descriptive only)`,
    `- Confidence calibration: ${evaluation.calibration.status}${evaluation.calibration.error === undefined ? "" : ` (error ${evaluation.calibration.error})`}`,
    "",
    "## Changed Files",
    "",
    ...(evaluation.coverage.changedFiles.length ? evaluation.coverage.changedFiles.map((file) => `- ${file}`) : ["- None provided"]),
    "",
    "## Missed Changed Files",
    "",
    ...(evaluation.coverage.missedFiles.length ? evaluation.coverage.missedFiles.map((file) => `- ${file}`) : ["- None"]),
    "",
    "## Layered Truth",
    "",
    ...renderCoverageLayer("Core implementation and focused tests", evaluation.coverage.layers.core),
    ...renderCoverageLayer("Declared auxiliary evidence", evaluation.coverage.layers.declaredAuxiliary),
    ...renderCoverageLayer("Latent auxiliary evidence (descriptive only)", evaluation.coverage.layers.latentAuxiliary),
    "",
    "## Route Files",
    "",
    ...(evaluation.route.files.length ? evaluation.route.files.map((file) => `- ${file}`) : ["- None"]),
    "",
    "## Warnings",
    "",
    ...(evaluation.warnings.length ? evaluation.warnings.map((warning) => `- ${warning}`) : ["- None"]),
    ""
  ];
  return lines.join("\n");
}

function formatCoverage(value: number | undefined): string {
  return value === undefined ? "unverified" : `${Math.round(value * 100)}%`;
}

function renderCoverageLayer(name: string, layer: PalaceEvaluationCoverageLayer): string[] {
  return [
    `### ${name}`,
    "",
    `- Coverage: ${formatCoverage(layer.coverage)}`,
    `- Route focus: ${formatCoverage(layer.routeFocus)}`,
    `- Files: ${layer.files.length}`,
    `- Matched: ${layer.matchedFiles.length}`,
    `- Missed: ${layer.missedFiles.length}`,
    ""
  ];
}
