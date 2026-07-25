const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  allowedAuxiliaryExtensions,
  classifyFileSurfaces
} = require("../lib/held-out-file-surfaces.cjs");

test("requires primary-language implementation and focused-test files", () => {
  assert.deepEqual(
    classifyFileSurfaces(["src/main.py", "tests/test_main.py"], [".py"], 2),
    {
      eligible: true,
      reason: null,
      primarySourceFiles: ["src/main.py", "tests/test_main.py"],
      implementationFiles: ["src/main.py"],
      testFiles: ["tests/test_main.py"],
      auxiliaryFiles: []
    }
  );
  assert.equal(
    classifyFileSurfaces(["src/main.py", "CHANGELOG.md"], [".py"], 2).reason,
    "missing-implementation-or-test"
  );
});

test("includes at most two modified documentation or configuration files", () => {
  const result = classifyFileSurfaces(
    ["src/main.py", "tests/test_main.py", "CHANGELOG.md", "pyproject.toml"],
    [".py"],
    2
  );
  assert.equal(result.eligible, true);
  assert.deepEqual(result.auxiliaryFiles, ["CHANGELOG.md", "pyproject.toml"]);
  assert.deepEqual(allowedAuxiliaryExtensions, [
    ".cfg", ".conf", ".ini", ".json", ".md", ".mdx", ".rst", ".toml", ".txt", ".yaml", ".yml"
  ]);

  assert.equal(
    classifyFileSurfaces(
      ["src/main.py", "tests/test_main.py", "README.md", "tox.ini", "pyproject.toml"],
      [".py"],
      2
    ).reason,
    "too-many-auxiliary-files"
  );
});

test("continues to reject generated, lock, fixture, and unsupported files", () => {
  const base = ["src/main.ts", "test/main.test.ts"];
  assert.equal(
    classifyFileSurfaces([...base, "docs/generated/api.md"], [".ts"], 2).reason,
    "contains-excluded-path"
  );
  assert.equal(
    classifyFileSurfaces([...base, "package-lock.json"], [".ts"], 2).reason,
    "contains-excluded-path"
  );
  assert.equal(
    classifyFileSurfaces([...base, "fixtures/input.json"], [".ts"], 2).reason,
    "contains-excluded-path"
  );
  assert.equal(
    classifyFileSurfaces([...base, "schema.sql"], [".ts"], 2).reason,
    "contains-unsupported-extension"
  );
});

test("does not let an auxiliary test artifact replace a primary-language test", () => {
  assert.equal(
    classifyFileSurfaces(["src/main.ts", "tests/cases.json"], [".ts"], 2).reason,
    "missing-implementation-or-test"
  );
});
