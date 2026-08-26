const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildTaskDiffCoherencePacket,
  parseUnifiedDiffHunks,
  validateTaskDiffCoherenceReview
} = require("../lib/task-diff-coherence.cjs");

const coherentTarget = {
  name: "example",
  task: "Add SHA-512 fallback by default",
  routeCommit: "a".repeat(40),
  groundTruthCommit: "b".repeat(40),
  changedFiles: ["src/serializer.py", "tests/test_serializer.py"]
};

const coherentDiff = `diff --git a/src/serializer.py b/src/serializer.py
index 1111111..2222222 100644
--- a/src/serializer.py
+++ b/src/serializer.py
@@ -1 +1,2 @@ class Serializer:
-    fallback = None
+    fallback = "sha512"
+    enabled = True
diff --git a/tests/test_serializer.py b/tests/test_serializer.py
index 3333333..4444444 100644
--- a/tests/test_serializer.py
+++ b/tests/test_serializer.py
@@ -1 +1 @@
-assert fallback is None
+assert fallback == "sha512"
`;

test("builds a complete hunk-addressed packet for the mechanical oracle", () => {
  const packet = buildTaskDiffCoherencePacket({
    target: coherentTarget,
    diffText: coherentDiff,
    generatedAt: "2026-01-01T00:00:00.000Z"
  });
  assert.equal(packet.files.length, 2);
  assert.equal(packet.files[0].hunks.length, 1);
  assert.match(packet.files[0].hunks[0].id, /^hunk_[a-f0-9]{16}$/);
  assert.equal(packet.rules.partialOraclePruningForbidden, true);
  assert.deepEqual(parseUnifiedDiffHunks(coherentDiff).map((file) => file.path), coherentTarget.changedFiles);
});

test("accepts a target only when every file and hunk is task aligned", () => {
  const packet = buildTaskDiffCoherencePacket({ target: coherentTarget, diffText: coherentDiff });
  const review = reviewFor(packet, () => "task-aligned", "accept");
  const result = validateTaskDiffCoherenceReview(packet, review);

  assert.deepEqual(result, {
    target: "example",
    decision: "accept",
    coherent: true,
    reviewedFiles: 2,
    reviewedHunks: 2,
    unrelatedHunks: 0,
    uncertainHunks: 0,
    changedFiles: coherentTarget.changedFiles
  });
});

test("rejects the whole target when one bundled hunk is unrelated", () => {
  const mixedTarget = {
    ...coherentTarget,
    name: "mixed-example",
    changedFiles: [...coherentTarget.changedFiles, "src/timed.py"]
  };
  const mixedDiff = `${coherentDiff}diff --git a/src/timed.py b/src/timed.py
index 5555555..6666666 100644
--- a/src/timed.py
+++ b/src/timed.py
@@ -10 +10,3 @@ def loads(value):
-    except BadSignature:
+    except SignatureExpired:
+        raise
+    except BadSignature:
`;
  const packet = buildTaskDiffCoherencePacket({ target: mixedTarget, diffText: mixedDiff });
  const review = reviewFor(
    packet,
    (sourcePath) => sourcePath === "src/timed.py" ? "unrelated" : "task-aligned",
    "reject"
  );
  const result = validateTaskDiffCoherenceReview(packet, review);

  assert.equal(result.coherent, false);
  assert.equal(result.unrelatedHunks, 1);
  assert.equal(result.decision, "reject");
  assert.throws(
    () => validateTaskDiffCoherenceReview(packet, { ...review, targetDecision: "accept" }),
    /whole-target decision disagrees/
  );
});

test("treats uncertainty and incomplete hunk review as rejection evidence", () => {
  const packet = buildTaskDiffCoherencePacket({ target: coherentTarget, diffText: coherentDiff });
  const uncertain = reviewFor(
    packet,
    (sourcePath) => sourcePath === "tests/test_serializer.py" ? "uncertain" : "task-aligned",
    "reject"
  );
  assert.equal(validateTaskDiffCoherenceReview(packet, uncertain).uncertainHunks, 1);

  const incomplete = structuredClone(uncertain);
  incomplete.files[0].hunks = [];
  assert.throws(
    () => validateTaskDiffCoherenceReview(packet, incomplete),
    /every hunk in src\/serializer.py must be reviewed exactly once/
  );
});

function reviewFor(packet, decisionFor, targetDecision) {
  return {
    schemaVersion: 1,
    packetSha256: packet.packetSha256,
    reviewTiming: "pre-route",
    reviewPerformedAfterCandidateFreeze: true,
    reviewedWithoutPalaceOutput: true,
    palaceCallsOnCandidateTask: 0,
    targetDecision,
    files: packet.files.map((file) => {
      const decision = decisionFor(file.path);
      return {
        path: file.path,
        decision,
        reason: decision === "task-aligned"
          ? "This file directly implements or verifies the frozen task behavior."
          : "This file changes a separate behavior not stated by the frozen task.",
        hunks: file.hunks.map((hunk) => ({
          id: hunk.id,
          decision,
          reason: decision === "task-aligned"
            ? "The hunk directly implements or verifies the frozen task behavior."
            : "The hunk changes a separate behavior not stated by the frozen task."
        }))
      };
    })
  };
}
