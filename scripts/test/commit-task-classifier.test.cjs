const assert = require("node:assert/strict");
const { test } = require("node:test");
const { classifyTaskType } = require("../lib/commit-task-classifier.cjs");

test("classifies conventional feature and bugfix subjects", () => {
  assert.equal(classifyTaskType("fix(parser): preserve static require edges"), "bugfix");
  assert.equal(classifyTaskType("feat!: add a new route contract"), "feature");
});

test("classifies base and inflected behavioral prefixes", () => {
  const features = [
    "Add request tracing",
    "Added request tracing",
    "Adding request tracing",
    "Allows custom transports",
    "Created a focused regression test",
    "Implemented bounded route support",
    "Introduces a stable manifest",
    "Supported Python 3.14",
    "Enables deterministic output"
  ];
  const bugfixes = [
    "Fix request parsing",
    "Fixed #123 -- request parsing",
    "Fixes route ordering",
    "Debugged the cache invalidation path",
    "Repaired malformed output",
    "Corrects the inferred task type",
    "Resolved a race in checkout",
    "Prevents integer overflow",
    "Avoided duplicate route members"
  ];

  for (const subject of features) assert.equal(classifyTaskType(subject), "feature", subject);
  for (const subject of bugfixes) assert.equal(classifyTaskType(subject), "bugfix", subject);
});

test("leaves ambiguous maintenance subjects unclassified", () => {
  for (const subject of [
    "Refactor the request parser",
    "sync: update semaphore behavior",
    "Bump dependency versions",
    "Document the route contract",
    "Update generated fixtures"
  ]) {
    assert.equal(classifyTaskType(subject), null, subject);
  }
});
