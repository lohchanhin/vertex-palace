function normalizeContextTelemetry(context, rawOutput = "") {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    throw new TypeError("Context output must be a JSON object.");
  }

  const executionBoundaries = context.executionBoundaries
    ? {
        primary: stringEntries(context.executionBoundaries.primary),
        support: stringEntries(context.executionBoundaries.support),
        deferred: stringEntries(context.executionBoundaries.deferred),
        excluded: Array.isArray(context.executionBoundaries.excluded)
          ? context.executionBoundaries.excluded
          : []
      }
    : {
        primary: typeof context.primaryCandidate === "string" && context.primaryCandidate.length > 0
          ? [context.primaryCandidate]
          : [],
        support: [],
        deferred: [],
        excluded: []
      };

  if (!executionBoundaries.primary.length) {
    throw new Error("Context output did not identify a Primary candidate.");
  }

  const measuredBytes = Buffer.byteLength(String(rawOutput), "utf8");
  const reportedBytes = finiteNumber(context.payload?.contextBytes);
  const reportedTokens = finiteNumber(context.payload?.contextEstimatedTokens);
  const contextBytes = reportedBytes ?? measuredBytes;
  const contextEstimatedTokens = reportedTokens ?? Math.ceil(contextBytes / 4);

  return {
    mode: typeof context.mode === "string" ? context.mode : "unknown",
    evidenceStatus: typeof context.evidenceStatus === "string" ? context.evidenceStatus : null,
    executionBoundaries,
    payload: {
      contextBytes,
      contextEstimatedTokens,
      source: reportedBytes !== null && reportedTokens !== null ? "reported" : "measured-fallback"
    }
  };
}

function stringEntries(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry.length > 0) : [];
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

module.exports = { normalizeContextTelemetry };
