const assert = require("node:assert/strict");
const { test } = require("node:test");
const { normalizeContextTelemetry } = require("../lib/context-telemetry.cjs");

test("preserves full context boundaries and reported payload metrics", () => {
  const context = {
    mode: "route-lite",
    evidenceStatus: "sufficient",
    executionBoundaries: {
      primary: ["src/main.ts"],
      support: ["src/helper.ts"],
      deferred: ["test/main.test.ts"],
      excluded: [{ sourcePath: "docs/archive.md", reason: "unrelated" }]
    },
    payload: { contextBytes: 1200, contextEstimatedTokens: 300 }
  };

  const normalized = normalizeContextTelemetry(context, JSON.stringify(context));

  assert.deepEqual(normalized.executionBoundaries, context.executionBoundaries);
  assert.deepEqual(normalized.payload, {
    contextBytes: 1200,
    contextEstimatedTokens: 300,
    source: "reported"
  });
});

test("normalizes bypass context and measures its delivered payload", () => {
  const context = {
    mode: "bypass",
    evidenceStatus: "insufficient",
    interventionPolicy: "advisory",
    primaryCandidate: "src/click/_compat.py",
    reason: "Inspect the Primary candidate and expand when evidence requires it."
  };
  const raw = `${JSON.stringify(context, null, 2)}\n`;
  const normalized = normalizeContextTelemetry(context, raw);

  assert.deepEqual(normalized.executionBoundaries, {
    primary: ["src/click/_compat.py"],
    support: [],
    deferred: [],
    excluded: []
  });
  assert.equal(normalized.payload.contextBytes, Buffer.byteLength(raw, "utf8"));
  assert.equal(normalized.payload.contextEstimatedTokens, Math.ceil(Buffer.byteLength(raw, "utf8") / 4));
  assert.equal(normalized.payload.source, "measured-fallback");
});

test("rejects context output without a Primary candidate", () => {
  assert.throws(
    () => normalizeContextTelemetry({ mode: "bypass", primaryCandidate: "" }, "{}"),
    /Primary candidate/
  );
});
