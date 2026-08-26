#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve("docs/research/evidence/codex-palace-usage-audit.json");
const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.resolve("docs/research/evidence/codex-palace-usage-summary.json");

const audit = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const validModes = new Set([
  "bypass",
  "route-lite",
  "full-palace",
  "guarded-memory-palace",
]);

function tally(items, keyFn) {
  const result = {};
  for (const item of items) {
    const key = keyFn(item) ?? "unknown";
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function round(value, digits = 2) {
  return value == null ? null : Number(value.toFixed(digits));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[midpoint]
    : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function summarizeNumbers(values) {
  return {
    n: values.length,
    mean: round(mean(values)),
    median: round(median(values)),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
  };
}

function metricValues(calls, key) {
  return calls
    .map((call) => call.metrics?.[key])
    .filter((value) => Number.isFinite(value));
}

function percentageBuckets(values) {
  return {
    zero: values.filter((value) => value === 0).length,
    aboveZeroBelow50: values.filter((value) => value > 0 && value < 50).length,
    atLeast50Below80: values.filter((value) => value >= 50 && value < 80).length,
    atLeast80: values.filter((value) => value >= 80).length,
    exactly100: values.filter((value) => value === 100).length,
  };
}

function classifySession(session) {
  if (session.title === "Nightly CI report") return "automation";
  if (String(session.cwd || "").toLowerCase().includes("codex palace")) return "selfDevelopment";
  return "realProject";
}

function extractAssessment(call) {
  return call.output?.match(/Assessment:\s*([a-z-]+)/i)?.[1]?.toLowerCase() || "unknown";
}

function summarizeGroup(sessions) {
  const calls = sessions.flatMap((session) => session.calls);
  const contextCalls = calls.filter((call) => call.operation === "context");
  const evaluateCalls = calls.filter((call) => call.operation === "evaluate");
  const coverage = metricValues(evaluateCalls, "changedFileCoverage");
  const focus = metricValues(evaluateCalls, "routeFocus");
  const calibrationPairs = evaluateCalls.filter(
    (call) =>
      Number.isFinite(call.metrics?.routeConfidence) &&
      Number.isFinite(call.metrics?.changedFileCoverage),
  );
  const calibrationErrors = calibrationPairs.map((call) =>
    Math.abs(call.metrics.routeConfidence - call.metrics.changedFileCoverage / 100),
  );
  const evidenceKnown = contextCalls.filter((call) => call.metrics?.evidenceStatus);
  const modes = contextCalls.map((call) => call.metrics?.mode);
  const knownModes = modes.filter((mode) => validModes.has(mode));

  const perSessionEvaluation = sessions
    .map((session) => {
      const sessionEvaluateCalls = session.calls.filter((call) => call.operation === "evaluate");
      const sessionCoverage = metricValues(sessionEvaluateCalls, "changedFileCoverage");
      const sessionFocus = metricValues(sessionEvaluateCalls, "routeFocus");
      return {
        coverageEvents: sessionCoverage.length,
        medianChangedFileCoverage: round(median(sessionCoverage)),
        medianRouteFocus: round(median(sessionFocus)),
      };
    })
    .filter((session) => session.coverageEvents > 0);
  const perSessionCoverageMedians = perSessionEvaluation.map((session) => session.medianChangedFileCoverage);

  const outcomeCounts = tally(calls, (call) => call.outcome);
  const completedCalls = (outcomeCounts.succeeded || 0) + (outcomeCounts.mixed || 0);

  return {
    sessions: sessions.length,
    calls: calls.length,
    outcomes: {
      counts: outcomeCounts,
      hardSuccessRate: round((100 * (outcomeCounts.succeeded || 0)) / Math.max(calls.length, 1)),
      completedOrMixedRate: round((100 * completedCalls) / Math.max(calls.length, 1)),
      hardFailureRate: round((100 * (outcomeCounts.failed || 0)) / Math.max(calls.length, 1)),
    },
    operations: tally(calls, (call) => call.operation),
    operationOutcomes: Object.fromEntries(
      [...new Set(calls.map((call) => call.operation))]
        .sort()
        .map((operation) => {
          const operationCalls = calls.filter((call) => call.operation === operation);
          return [operation, tally(operationCalls, (call) => call.outcome)];
        }),
    ),
    context: {
      calls: contextCalls.length,
      validModeCalls: knownModes.length,
      modes: tally(knownModes, (mode) => mode),
      unrecognizedOrMissingModes: modes.length - knownModes.length,
      evidenceStatus: tally(evidenceKnown, (call) => call.metrics.evidenceStatus),
      unrecognizedOrMissingEvidenceStatus: contextCalls.length - evidenceKnown.length,
      routeConfidence: summarizeNumbers(metricValues(contextCalls, "routeConfidence")),
      estimatedTokens: summarizeNumbers(metricValues(contextCalls, "estimatedTokens")),
      memoryIncluded: summarizeNumbers(metricValues(contextCalls, "memoryIncluded")),
    },
    evaluation: {
      calls: evaluateCalls.length,
      assessments: tally(evaluateCalls, extractAssessment),
      changedFileCoverage: {
        ...summarizeNumbers(coverage),
        buckets: percentageBuckets(coverage),
      },
      routeFocus: {
        ...summarizeNumbers(focus),
        buckets: percentageBuckets(focus),
      },
      retrospectiveCalibration: {
        pairs: calibrationPairs.length,
        routeConfidence: summarizeNumbers(
          calibrationPairs.map((call) => call.metrics.routeConfidence),
        ),
        changedFileCoverage: summarizeNumbers(
          calibrationPairs.map((call) => call.metrics.changedFileCoverage),
        ),
        absoluteError: summarizeNumbers(calibrationErrors),
      },
      perSessionWindow: {
        evaluableSessions: perSessionEvaluation.length,
        medianOfSessionMedianCoverage: round(median(perSessionCoverageMedians)),
        zeroMedianCoverageSessions: perSessionEvaluation.filter(
          (session) => session.medianChangedFileCoverage === 0,
        ).length,
        atLeast80MedianCoverageSessions: perSessionEvaluation.filter(
          (session) => session.medianChangedFileCoverage >= 80,
        ).length,
        privacyBoundary: "Only aggregate counts and distribution statistics are published; session IDs, titles, paths, and per-session rows are omitted.",
      },
    },
  };
}

const usageSessions = audit.usageSessions || [];
const allCalls = usageSessions.flatMap((session) => session.calls || []);
const firstObservedCallAt = allCalls
  .map((call) => call.timestamp)
  .filter(Boolean)
  .sort()[0] || null;
const eligibleInventory = (audit.sessionInventory || []).filter(
  (session) => firstObservedCallAt && session.updatedAt >= firstObservedCallAt,
);
const groupedSessions = {
  realProject: usageSessions.filter((session) => classifySession(session) === "realProject"),
  selfDevelopment: usageSessions.filter((session) => classifySession(session) === "selfDevelopment"),
  automation: usageSessions.filter((session) => classifySession(session) === "automation"),
};

const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceAudit: path.relative(process.cwd(), inputPath).replace(/\\/g, "/"),
  scope: audit.scope,
  adoption: {
    firstObservedCallAt,
    sessionsWithActivitySinceFirstObservedCall: eligibleInventory.length,
    sessionsWithPalaceCalls: eligibleInventory.filter((session) => session.palaceCalls > 0).length,
    sessionsWithoutPalaceCalls: eligibleInventory.filter((session) => session.palaceCalls === 0).length,
    observedUsageRate: round(
      (100 * eligibleInventory.filter((session) => session.palaceCalls > 0).length) /
        Math.max(eligibleInventory.length, 1),
    ),
    caveat: "This is observed local Codex history, not proof that every repository or future task is configured.",
  },
  groups: {
    all: summarizeGroup(usageSessions),
    realProject: summarizeGroup(groupedSessions.realProject),
    selfDevelopment: summarizeGroup(groupedSessions.selfDevelopment),
    automation: summarizeGroup(groupedSessions.automation),
  },
  qualitativeSignals: {
    automatedPositiveMatches: audit.summary?.feedback?.positiveSignals || 0,
    automatedNegativeMatches: audit.summary?.feedback?.negativeSignals || 0,
    assistantEvaluationCandidates: audit.summary?.feedback?.assistantEvaluations || 0,
    caveat: "Signal matching is a discovery aid only. Mixed feedback and false positives require manual review.",
  },
  interpretationLimits: [
    "A call is a Codex tool-call envelope and can wrap more than one process-level command.",
    "Repeated calls within one long-running conversation are not independent trials.",
    "Operational completion measures transport behavior, not route correctness.",
    "Changed-file coverage and route focus are retrospective route diagnostics, not end-to-end task success.",
    "Palace token reduction compares indexed repository text with the pack, not total Codex tokens or wall time.",
  ],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, adoption: summary.adoption, groups: summary.groups }, null, 2));
