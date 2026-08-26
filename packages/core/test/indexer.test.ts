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

  it("places declaration tests on the verification floor", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "types", "index.test-d.ts");
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(
        target,
        "import {expectType} from 'tsd';\nexpectType<string>('value');\n",
        "utf8"
      );

      await indexPalace(root);
      const index = await readIndex(root);
      const declarationTest = index.nodes.find(
        (node) => node.sourcePath === "types/index.test-d.ts" && !node.startLine
      );

      expect(declarationTest?.floor).toBe("05-verification");
      expect(declarationTest?.evidence?.roles.map((role) => role.role)).toContain("verification");
      expect(declarationTest?.evidence?.roles.map((role) => role.role)).not.toContain("implementation");
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

  it("indexes tracked Rust generator outputs with provenance and ownership edges", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "codegen/src/snapshot.rs",
          `const GENERATED_SOURCE: &str = "tests/debug/gen.rs";
pub fn generate(definitions: &Definitions) -> Result<()> {
    file::write(GENERATED_SOURCE, render(definitions))?;
    Ok(())
}
`
        ],
        ["tests/debug/gen.rs", "impl Debug for GeneratedNode {}\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }

      await indexPalace(root);
      const index = await readIndex(root);
      const generator = index.nodes.find(
        (node) => node.sourcePath === "codegen/src/snapshot.rs" && !node.startLine
      );
      const output = index.nodes.find(
        (node) => node.sourcePath === "tests/debug/gen.rs" && !node.startLine
      );

      expect(output?.tags).toContain("generated-artifact");
      expect(output?.tags).toContain("generated-by-rust-generator");
      expect(index.edges.some(
        (edge) => edge.type === "changed_with"
          && edge.from === generator?.id
          && edge.to === output?.id
          && edge.weight === 0.98
      )).toBe(true);
      expect(index.edges.some(
        (edge) => edge.type === "configures"
          && edge.from === generator?.id
          && edge.to === output?.id
      )).toBe(true);
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

  it("links a Go consumer to a uniquely declared top-level var", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "collations.go",
          "package protocol\nvar collations = map[string]byte{\"binary\": 63}\n"
        ],
        [
          "packets.go",
          "package protocol\nfunc writeHandshake(name string) byte { return collations[name] }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await writeFile(target, source, "utf8");
      }

      await indexPalace(root);
      const index = await readIndex(root);
      const from = index.nodes.find((node) => node.sourcePath === "packets.go" && !node.startLine);
      const to = index.nodes.find((node) => node.sourcePath === "collations.go" && !node.startLine);

      expect(index.symbols.find(
        (node) => node.sourcePath === "collations.go" && node.title === "collations"
      )?.kind).toBe("symbol");
      expect(index.edges.some(
        (edge) => edge.type === "depends_on" && edge.from === from?.id && edge.to === to?.id
      )).toBe(true);
    });
  });

  it("links a Go caller to uniquely declared functions across implementation files", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "connection.go",
          "package protocol\nfunc handleParams() error { return nil }\n"
        ],
        [
          "packets.go",
          "package protocol\ntype mysqlConn struct{}\nfunc (mc *mysqlConn) writeHandshakeResponsePacket() error { return nil }\n"
        ],
        [
          "connector.go",
          "package protocol\nfunc Connect(mc *mysqlConn) error { if err := mc.writeHandshakeResponsePacket(); err != nil { return err }; return handleParams() }\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        await writeFile(path.join(root, relativePath), source, "utf8");
      }

      await indexPalace(root);
      const index = await readIndex(root);
      const connector = index.nodes.find((node) => node.sourcePath === "connector.go" && !node.startLine);
      const connection = index.nodes.find((node) => node.sourcePath === "connection.go" && !node.startLine);
      const packets = index.nodes.find((node) => node.sourcePath === "packets.go" && !node.startLine);

      expect(index.edges.some(
        (edge) => edge.type === "depends_on" && edge.from === connector?.id && edge.to === connection?.id
      )).toBe(true);
      expect(index.edges.some(
        (edge) => edge.type === "depends_on" && edge.from === connector?.id && edge.to === packets?.id
      )).toBe(true);
    });
  });

  it("does not create direct symbol-test edges from a short nested name", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "aiohttp/helpers.py",
          `def parse_mimetype(value: str):
    return value

class CookieMixin:
    def set_cookie(self, name: str, value: str):
        return name, value
`
        ],
        [
          "tests/test_helpers.py",
          `from aiohttp.helpers import parse_mimetype

def test_parse_mimetype():
    assert parse_mimetype("text/plain") == "text/plain"
`
        ],
        [
          "tests/test_cookie_helpers.py",
          `def test_parse_set_cookie_headers_simple():
    assert True

def test_parse_set_cookie_headers_with_attributes():
    assert True
`
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }

      await indexPalace(root);
      const index = await readIndex(root);
      const symbol = (sourcePath: string, title: string) => index.nodes.find(
        (node) => node.sourcePath === sourcePath && node.title === title
      );
      const parseMimetype = symbol("aiohttp/helpers.py", "parse_mimetype");
      const exactTest = symbol("tests/test_helpers.py", "test_parse_mimetype");
      const setCookie = symbol("aiohttp/helpers.py", "CookieMixin.set_cookie");
      const nestedNameTest = symbol(
        "tests/test_cookie_helpers.py",
        "test_parse_set_cookie_headers_simple"
      );
      const hasDirectTestEdge = (leftId?: string, rightId?: string) => Boolean(
        leftId && rightId && index.edges.some(
          (edge) => edge.weight === 0.99
            && ["tests", "tested_by"].includes(edge.type)
            && ((edge.from === leftId && edge.to === rightId) || (edge.from === rightId && edge.to === leftId))
        )
      );

      expect(hasDirectTestEdge(parseMimetype?.id, exactTest?.id)).toBe(true);
      expect(hasDirectTestEdge(setCookie?.id, nestedNameTest?.id)).toBe(false);
    });
  });

  it("links extensionless CommonJS requires to local JavaScript files", async () => {
    await withFixture("ts-api", async (root) => {
      const sourcePath = "lib/util/directives.js";
      const testPath = "tests/directive-utils.test.js";
      const files = new Map<string, string>([
        [
          sourcePath,
          `function parseDirective(value) { return value.trim() }
module.exports = { parseDirective }
`
        ],
        [
          testPath,
          `const { parseDirective } = require('../lib/util/directives')
test('parses an empty directive', () => parseDirective(''))
`
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }

      await indexPalace(root);
      const index = await readIndex(root);
      const source = index.nodes.find(
        (node) => node.sourcePath === sourcePath && node.kind === "file"
      );
      const test = index.nodes.find(
        (node) => node.sourcePath === testPath && node.kind === "test"
      );

      expect(index.edges).toContainEqual(expect.objectContaining({
        from: test?.id,
        to: source?.id,
        type: "imports",
        weight: 0.8
      }));
    });
  });

  it("resolves a relative package-root require to the declared entry point", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        ["package.json", JSON.stringify({ name: "bounded-router", main: "./lib/index.js" })],
        ["lib/index.js", "module.exports = function configureLimit(value) { return value }\n"],
        ["test/test.js", "const configureLimit = require('..')\ntest('configures a limit', () => configureLimit(0))\n"]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }

      await indexPalace(root);
      const index = await readIndex(root);
      const source = index.nodes.find(
        (node) => node.sourcePath === "lib/index.js" && !node.startLine
      );
      const test = index.nodes.find(
        (node) => node.sourcePath === "test/test.js" && !node.startLine
      );

      expect(index.edges).toContainEqual(expect.objectContaining({
        from: test?.id,
        to: source?.id,
        type: "imports",
        weight: 0.8
      }));
    });
  });
});
