const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

const REVIEW_DECISIONS = new Set(["task-aligned", "unrelated", "uncertain"]);

function buildTaskDiffCoherencePacket({ target, diffText, generatedAt }) {
  assert.ok(target?.name, "target name is required");
  assert.ok(target?.task, "target task is required");
  assert.ok(target?.routeCommit, "route commit is required");
  assert.ok(target?.groundTruthCommit, "ground-truth commit is required");
  assert.ok(Array.isArray(target.changedFiles) && target.changedFiles.length > 0, "changed files are required");

  const files = parseUnifiedDiffHunks(diffText);
  assert.deepEqual(
    files.map((file) => file.path).sort(),
    [...target.changedFiles].sort(),
    "diff files must exactly match the mechanical target oracle"
  );
  assert.ok(files.every((file) => file.hunks.length > 0), "every changed file must contain at least one reviewable hunk");

  const packet = {
    schemaVersion: 1,
    packetType: "task-diff-coherence-review",
    generatedAt: generatedAt ?? new Date().toISOString(),
    reviewTimingRequired: "after-candidate-freeze-before-any-palace-call",
    target: {
      name: target.name,
      task: target.task,
      routeCommit: target.routeCommit,
      groundTruthCommit: target.groundTruthCommit,
      changedFiles: [...target.changedFiles]
    },
    diffSha256: sha256(diffText),
    files,
    rules: {
      wholeTargetDecision: true,
      partialOraclePruningForbidden: true,
      uncertainHunkRejectsTarget: true,
      everyHunkMustBeReviewed: true,
      palaceCallsAllowedBeforeReview: 0
    }
  };
  return { ...packet, packetSha256: hashPacket(packet) };
}

function parseUnifiedDiffHunks(diffText) {
  const files = [];
  let currentFile;
  let currentHunk;

  for (const line of diffText.replaceAll("\r\n", "\n").split("\n")) {
    const fileMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (fileMatch) {
      currentFile = { path: fileMatch[2], hunks: [] };
      files.push(currentFile);
      currentHunk = undefined;
      continue;
    }
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/);
    if (hunkMatch && currentFile) {
      currentHunk = {
        id: "",
        header: line,
        oldStart: Number(hunkMatch[1]),
        oldLines: Number(hunkMatch[2] ?? 1),
        newStart: Number(hunkMatch[3]),
        newLines: Number(hunkMatch[4] ?? 1),
        section: hunkMatch[5].trim(),
        patch: []
      };
      currentFile.hunks.push(currentHunk);
      continue;
    }
    if (currentHunk && (/^[ +\-]/.test(line) || line === "\\ No newline at end of file")) {
      currentHunk.patch.push(line);
    }
  }

  for (const file of files) {
    for (const hunk of file.hunks) {
      hunk.id = `hunk_${sha256(`${file.path}\0${hunk.header}\0${hunk.patch.join("\n")}`).slice(0, 16).toLowerCase()}`;
    }
  }
  return files;
}

function validateTaskDiffCoherenceReview(packet, review) {
  validateTaskDiffCoherencePacket(packet);
  assert.equal(review.schemaVersion, 1);
  assert.equal(review.packetSha256, packet.packetSha256, "review does not bind the packet");
  assert.equal(review.reviewTiming, "pre-route");
  assert.equal(review.reviewPerformedAfterCandidateFreeze, true);
  assert.equal(review.reviewedWithoutPalaceOutput, true);
  assert.equal(review.palaceCallsOnCandidateTask, 0);
  assert.ok(["accept", "reject"].includes(review.targetDecision), "targetDecision must be accept or reject");
  assert.ok(Array.isArray(review.files), "review files are required");

  const packetFiles = new Map(packet.files.map((file) => [file.path, file]));
  const reviewFiles = new Map(review.files.map((file) => [file.path, file]));
  assert.equal(reviewFiles.size, review.files.length, "review file paths must be unique");
  assert.deepEqual([...reviewFiles.keys()].sort(), [...packetFiles.keys()].sort(), "every packet file must be reviewed exactly once");

  const decisions = [];
  for (const [sourcePath, packetFile] of packetFiles) {
    const reviewedFile = reviewFiles.get(sourcePath);
    assert.ok(REVIEW_DECISIONS.has(reviewedFile.decision), `invalid file decision for ${sourcePath}`);
    assertReason(reviewedFile.reason, `file ${sourcePath}`);
    const packetHunks = new Map(packetFile.hunks.map((hunk) => [hunk.id, hunk]));
    const reviewedHunks = new Map((reviewedFile.hunks ?? []).map((hunk) => [hunk.id, hunk]));
    assert.equal(reviewedHunks.size, reviewedFile.hunks?.length ?? 0, `hunk IDs must be unique for ${sourcePath}`);
    assert.deepEqual([...reviewedHunks.keys()].sort(), [...packetHunks.keys()].sort(), `every hunk in ${sourcePath} must be reviewed exactly once`);
    for (const [hunkId] of packetHunks) {
      const reviewedHunk = reviewedHunks.get(hunkId);
      assert.ok(REVIEW_DECISIONS.has(reviewedHunk.decision), `invalid hunk decision for ${hunkId}`);
      assertReason(reviewedHunk.reason, `hunk ${hunkId}`);
      decisions.push(reviewedHunk.decision);
    }
    if (reviewedFile.decision === "task-aligned") {
      assert.ok(reviewedFile.hunks.every((hunk) => hunk.decision === "task-aligned"), `aligned file ${sourcePath} contains a rejected hunk`);
    } else {
      assert.ok(reviewedFile.hunks.some((hunk) => hunk.decision !== "task-aligned"), `rejected file ${sourcePath} must identify a rejected hunk`);
    }
  }

  const coherent = decisions.every((decision) => decision === "task-aligned");
  assert.equal(review.targetDecision, coherent ? "accept" : "reject", "whole-target decision disagrees with hunk decisions");
  return {
    target: packet.target.name,
    decision: review.targetDecision,
    coherent,
    reviewedFiles: packet.files.length,
    reviewedHunks: decisions.length,
    unrelatedHunks: decisions.filter((decision) => decision === "unrelated").length,
    uncertainHunks: decisions.filter((decision) => decision === "uncertain").length,
    changedFiles: [...packet.target.changedFiles]
  };
}

function validateTaskDiffCoherencePacket(packet) {
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.packetType, "task-diff-coherence-review");
  assert.equal(packet.packetSha256, hashPacket(packetWithoutHash(packet)), "packet hash mismatch");
  assert.equal(packet.reviewTimingRequired, "after-candidate-freeze-before-any-palace-call");
  assert.equal(packet.rules.wholeTargetDecision, true);
  assert.equal(packet.rules.partialOraclePruningForbidden, true);
  assert.equal(packet.rules.uncertainHunkRejectsTarget, true);
  assert.equal(packet.rules.everyHunkMustBeReviewed, true);
  assert.equal(packet.rules.palaceCallsAllowedBeforeReview, 0);
  assert.ok(Array.isArray(packet.files) && packet.files.length > 0, "packet files are required");
  assert.deepEqual(
    packet.files.map(({ path }) => path).sort(),
    [...packet.target.changedFiles].sort(),
    "packet files must match the target oracle"
  );
  const hunkIds = [];
  for (const file of packet.files) {
    assert.ok(typeof file.path === "string" && file.path.length > 0);
    assert.ok(Array.isArray(file.hunks) && file.hunks.length > 0, `${file.path} requires reviewable hunks`);
    hunkIds.push(...file.hunks.map(({ id }) => id));
  }
  assert.equal(new Set(hunkIds).size, hunkIds.length, "packet hunk IDs must be unique");
  return packet;
}

function packetWithoutHash(packet) {
  const { packetSha256: _packetSha256, ...rest } = packet;
  return rest;
}

function hashPacket(packet) {
  return sha256(JSON.stringify(packet));
}

function assertReason(reason, label) {
  assert.ok(typeof reason === "string" && reason.trim().length >= 12, `${label} requires a specific reason`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

module.exports = {
  buildTaskDiffCoherencePacket,
  hashPacket,
  parseUnifiedDiffHunks,
  validateTaskDiffCoherencePacket,
  validateTaskDiffCoherenceReview
};
