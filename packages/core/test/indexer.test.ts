import { describe, expect, it } from "vitest";
import path from "node:path";
import { access, mkdir, writeFile } from "node:fs/promises";
import { indexPalace } from "../src/indexer/index-palace";
import { readIndex } from "../src/storage/read-palace";
import { withFixture } from "./test-utils";

describe("indexPalace", () => {
  it("creates nodes, edges, rooms, symbols, and verification floor nodes", async () => {
    await withFixture("ts-api", async (root) => {
      const result = await indexPalace(root);
      const index = await readIndex(root);

      expect(result.nodeCount).toBeGreaterThan(result.fileCount);
      expect(index.edges.length).toBeGreaterThan(0);
      expect(index.rooms.length).toBeGreaterThan(0);
      expect(index.symbols.some((node) => node.title.includes("login"))).toBe(true);
      expect(index.nodes.some((node) => node.sourcePath.endsWith("auth.e2e.test.ts") && node.floor === "05-verification")).toBe(true);
    });
  });

  it("removes stale generated rooms when rebuilding the index", async () => {
    await withFixture("ts-api", async (root) => {
      const staleRoom = path.join(root, ".palace", "rooms", "stale-wing", "stale-room");
      await mkdir(staleRoom, { recursive: true });
      await writeFile(path.join(staleRoom, "overview.md"), "stale", "utf8");

      await indexPalace(root);

      await expect(access(staleRoom)).rejects.toThrow();
    });
  });

  it("indexes workspace imports, local co-consumers, and generated artifact provenance", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["packages/acme-core/package.json", JSON.stringify({ name: "@acme/core", main: "./dist/index.js" })],
        [
          "packages/acme-core/src/index.ts",
          "export * from './router/analyze-task';\nexport * from './router/classify-task';\n"
        ],
        [
          "packages/acme-core/src/router/publication-intent.ts",
          "export function publicationIntent() { return 'publish'; }\n"
        ],
        [
          "packages/acme-core/src/router/analyze-task.ts",
          "import { publicationIntent } from './publication-intent';\nexport const analyzeTask = () => publicationIntent();\n"
        ],
        [
          "packages/acme-core/src/router/classify-task.ts",
          "import { publicationIntent } from './publication-intent';\nexport const classifyTask = () => publicationIntent();\n"
        ],
        [
          "packages/acme-mcp/src/server.ts",
          "import { analyzeTask } from '@acme/core';\nexport const startServer = () => analyzeTask();\n"
        ],
        [
          "tsup.acme-mcp.config.ts",
          "import { defineConfig } from 'tsup';\nexport default defineConfig({ entry: { server: 'packages/acme-mcp/src/server.ts' }, outDir: 'plugins/acme/mcp', outExtension: () => ({ js: '.cjs' }) });\n"
        ],
        ["plugins/acme/mcp/server.cjs", "module.exports = { generated: true };\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }

      await indexPalace(root);
      const index = await readIndex(root);
      const fileNode = (sourcePath: string) => index.nodes.find(
        (node) => node.sourcePath === sourcePath && !node.startLine
      );
      const hasRelation = (leftPath: string, rightPath: string, type: string) => {
        const left = fileNode(leftPath);
        const right = fileNode(rightPath);
        return Boolean(left && right && index.edges.some(
          (edge) => edge.type === type
            && ((edge.from === left.id && edge.to === right.id) || (edge.from === right.id && edge.to === left.id))
        ));
      };

      expect(hasRelation(
        "packages/acme-mcp/src/server.ts",
        "packages/acme-core/src/index.ts",
        "imports"
      )).toBe(true);
      expect(hasRelation(
        "packages/acme-core/src/router/analyze-task.ts",
        "packages/acme-core/src/router/classify-task.ts",
        "changed_with"
      )).toBe(true);
      expect(hasRelation(
        "tsup.acme-mcp.config.ts",
        "plugins/acme/mcp/server.cjs",
        "configures"
      )).toBe(true);
      expect(hasRelation(
        "packages/acme-mcp/src/server.ts",
        "plugins/acme/mcp/server.cjs",
        "changed_with"
      )).toBe(true);
      expect(fileNode("plugins/acme/mcp/server.cjs")?.tags).toContain("generated-artifact");
    });
  });

  it("resolves absolute Python package imports from tests into a src layout", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["src/click/_compat.py", "import sys\nWIN = sys.platform.startswith('win')\n"],
        [
          "tests/test_utils.py",
          "from click._compat import WIN\n\ndef test_echo_via_pager():\n    assert WIN is not None\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }

      await indexPalace(root);
      const index = await readIndex(root);
      const fileNode = (sourcePath: string) => index.nodes.find(
        (node) => node.sourcePath === sourcePath && !node.startLine
      );
      const source = fileNode("src/click/_compat.py");
      const test = fileNode("tests/test_utils.py");

      expect(source).toBeDefined();
      expect(test).toBeDefined();
      expect(index.edges.some(
        (edge) => edge.type === "imports" && edge.from === test?.id && edge.to === source?.id
      )).toBe(true);
    });
  });

  it("resolves Rust crate modules and use paths into source relations", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "telemetry-derive/src/lib.rs",
          "mod attr;\nmod expand;\npub fn instrument() { expand::gen_block(attr::parse_args()); }\n"
        ],
        [
          "telemetry-derive/src/attr.rs",
          "pub struct Fields;\npub fn parse_args() -> Fields { Fields }\n"
        ],
        [
          "telemetry-derive/src/expand.rs",
          "use crate::attr::{Fields, parse_args};\npub fn gen_block(_: Fields) { parse_args(); }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }

      await indexPalace(root);
      const index = await readIndex(root);
      const fileNode = (sourcePath: string) => index.nodes.find(
        (node) => node.sourcePath === sourcePath && !node.startLine
      );
      const hasImport = (fromPath: string, toPath: string) => {
        const from = fileNode(fromPath);
        const to = fileNode(toPath);
        return Boolean(from && to && index.edges.some(
          (edge) => edge.type === "imports" && edge.from === from.id && edge.to === to.id
        ));
      };

      expect(hasImport("telemetry-derive/src/lib.rs", "telemetry-derive/src/attr.rs")).toBe(true);
      expect(hasImport("telemetry-derive/src/lib.rs", "telemetry-derive/src/expand.rs")).toBe(true);
      expect(hasImport("telemetry-derive/src/expand.rs", "telemetry-derive/src/attr.rs")).toBe(true);
    });
  });

  it("links qualified Rust references and uniquely declared cross-file types", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["src/tls.rs", "pub struct TlsInfo { version: Option<String> }\n"],
        [
          "src/connect.rs",
          "pub fn connection_info() -> crate::tls::TlsInfo { crate::tls::TlsInfo { version: None } }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }

      await indexPalace(root);
      const index = await readIndex(root);
      const from = index.nodes.find((node) => node.sourcePath === "src/connect.rs" && !node.startLine);
      const to = index.nodes.find((node) => node.sourcePath === "src/tls.rs" && !node.startLine);
      expect(index.edges.some(
        (edge) => edge.type === "depends_on" && edge.from === from?.id && edge.to === to?.id
      )).toBe(true);
      expect(index.edges.some(
        (edge) => edge.type === "imports" && edge.from === from?.id && edge.to === to?.id
      )).toBe(true);
    });
  });
});
