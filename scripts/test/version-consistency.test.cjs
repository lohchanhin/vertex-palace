const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const packagePaths = [
  "package.json",
  "packages/shared/package.json",
  "packages/core/package.json",
  "packages/cli/package.json",
  "packages/mcp/package.json",
  "plugins/vertex-palace/.codex-plugin/plugin.json"
];

test("keeps package, plugin, CLI, and MCP versions aligned", () => {
  const packages = packagePaths.map((relativePath) => ({
    relativePath,
    manifest: JSON.parse(readFileSync(path.join(root, relativePath), "utf8"))
  }));
  const expected = packages[0].manifest.version;

  for (const entry of packages) {
    assert.equal(entry.manifest.version, expected, `${entry.relativePath} version drifted`);
  }

  const versionSource = readFileSync(path.join(root, "packages/shared/src/version.ts"), "utf8");
  assert.match(versionSource, new RegExp(`VERTEX_PALACE_VERSION\\s*=\\s*["']${escapeRegExp(expected)}["']`));

  const mcpConfig = JSON.parse(readFileSync(path.join(root, "plugins/vertex-palace/.mcp.json"), "utf8"));
  assert.ok(JSON.stringify(mcpConfig).includes(`vertex-palace@${expected}`), ".mcp.json package version drifted");

  const cliSource = readFileSync(path.join(root, "packages/cli/src/index.ts"), "utf8");
  const mcpSource = readFileSync(path.join(root, "packages/mcp/src/server.ts"), "utf8");
  assert.match(cliSource, /version\(VERTEX_PALACE_VERSION\)/);
  assert.match(mcpSource, /version:\s*VERTEX_PALACE_VERSION/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
