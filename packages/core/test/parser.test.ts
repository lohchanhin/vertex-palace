import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseFile } from "../src/parser/parse-file";
import { withFixture } from "./test-utils";

describe("parseFile", () => {
  it("extracts TypeScript imports, classes, methods, and functions", async () => {
    await withFixture("ts-api", async (root) => {
      const parsed = await parseFile(root, "src/controllers/auth.controller.ts", "typescript");

      expect(parsed.imports).toContain("../services/auth.service");
      expect(parsed.symbols.some((symbol) => symbol.name === "AuthController" && symbol.kind === "class")).toBe(true);
      expect(parsed.symbols.some((symbol) => symbol.name === "AuthController.login" && symbol.kind === "method")).toBe(true);
    });
  });

  it("extracts function-valued properties and methods from top-level object literals", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "default-behaviors.js");
      await writeFile(
        target,
        `const defaultBehaviors = {
  returns: function returns(fake, value) {
    fake.returnValue = value;
    fake.returnArgAt = undefined;
  },
  returnsArg(fake, index) {
    fake.returnArgAt = index;
  },
  resolves: (fake, value) => {
    fake.returnValue = Promise.resolve(value);
  }
};
export default defaultBehaviors;
`,
        "utf8"
      );

      const parsed = await parseFile(root, "src/default-behaviors.js", "javascript");

      expect(parsed.symbols).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "defaultBehaviors.returns", kind: "method" }),
        expect.objectContaining({ name: "defaultBehaviors.returnsArg", kind: "method" }),
        expect.objectContaining({ name: "defaultBehaviors.resolves", kind: "method" })
      ]));
      expect(parsed.summarySeed).toContain("defaultBehaviors.returnsArg");
    });
  });

  it("preserves exact AST identifier references in bounded symbol search evidence", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "worker.ts");
      await writeFile(
        target,
        "import { ResultEnvelope } from './ResultEnvelope';\nexport const worker = () => new ResultEnvelope();\n",
        "utf8"
      );

      const parsed = await parseFile(root, "src/worker.ts", "typescript");

      expect(parsed.symbols.find((symbol) => symbol.name === "worker")?.searchText)
        .toContain("ResultEnvelope");
    });
  });

  it("extracts static CommonJS require targets", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "tests", "directive-utils.test.js");
      await writeFile(
        target,
        `const { parseDirective } = require("../src/directives")
const dynamicTarget = "../src/other"
require(dynamicTarget)

test("parses a directive", () => parseDirective("private"))
`,
        "utf8"
      );

      const parsed = await parseFile(root, "tests/directive-utils.test.js", "javascript");

      expect(parsed.imports).toContain("../src/directives");
      expect(parsed.imports).not.toContain("../src/other");
    });
  });

  it("falls back without crashing", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "broken.custom");
      await import("node:fs/promises").then((fs) => fs.writeFile(target, "function looseThing() {}", "utf8"));
      const parsed = await parseFile(root, "src/broken.custom", "custom");
      expect(parsed.symbols.some((symbol) => symbol.name === "looseThing")).toBe(true);
    });
  });

  it("extracts Rust types, module imports, and complete function bodies", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "tls.rs");
      await writeFile(
        target,
        `use crate::attr::{Field, Fields};
mod expand;

pub struct TlsInfo {
    version: Option<Version>,
}

pub fn build_tls_info(rows: Rows) -> TlsInfo {
    if rows.next() {
        inspect_peer_certificate();
        inspect_protocol_version();
    }
    rows.Close();
    TlsInfo { version: None }
}
`,
        "utf8"
      );

      const parsed = await parseFile(root, "src/tls.rs", "rs");
      const fn = parsed.symbols.find((symbol) => symbol.name === "build_tls_info");

      expect(parsed.imports).toEqual(expect.arrayContaining(["crate::attr", "self::expand"]));
      expect(parsed.symbols).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "TlsInfo", kind: "type" })
      ]));
      expect(fn).toMatchObject({ startLine: 8, endLine: 15 });
      expect(fn?.searchText).toContain("row");
      expect(fn?.searchText).toContain("close");
      expect(fn?.searchText).toContain("protocol version");
    });
  });

  it("preserves late compound literals as search evidence in long fallback symbols", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "flags.rs");
      const filler = Array.from(
        { length: 260 },
        (_, index) => `    let unique_token_${index} = ${index};`
      ).join("\n");
      await writeFile(
        target,
        `pub fn add_default_flags() {
${filler}
    command.push("-mfpu=neon-vfpv4");
}
`,
        "utf8"
      );

      const parsed = await parseFile(root, "src/flags.rs", "rs");
      const symbol = parsed.symbols.find((candidate) => candidate.name === "add_default_flags");

      expect(symbol?.searchText).toContain("neon vfpv4");
    });
  });

  it("extracts bounded Rust generator output declarations from explicit write calls", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "codegen", "src", "snapshot.rs");
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(
        target,
        `const GENERATED_SOURCE: &str = "tests/debug/gen.rs";
const UNUSED_NOTE: &str = "docs/generator.md";
const OUTSIDE_ROOT: &str = "../outside.rs";

pub fn generate(definitions: &Definitions) -> Result<()> {
    file::write(
        GENERATED_SOURCE,
        render(definitions),
    )?;
    file::write(OUTSIDE_ROOT, "unsafe")?;
    Ok(())
}
`,
        "utf8"
      );

      const parsed = await parseFile(root, "codegen/src/snapshot.rs", "rs");

      expect(parsed.generatedArtifacts).toEqual([
        {
          inputPath: "codegen/src/snapshot.rs",
          outputPath: "tests/debug/gen.rs",
          tool: "rust-generator"
        }
      ]);
    });
  });

  it("extracts Go receiver methods and member references from the full body", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "finisher_api.go");
      await writeFile(
        target,
        `package data

func (db *DB) Scan(dest interface{}) (tx *DB) {
    tx = db.getInstance()
    if rows, err := tx.Rows(); err == nil {
        if rows.Next() {
            tx.ScanRows(rows, dest)
        } else {
            tx.AddError(rows.Err())
        }
        tx.AddError(rows.Close())
    }
    return
}
`,
        "utf8"
      );

      const parsed = await parseFile(root, "finisher_api.go", "go");
      const method = parsed.symbols.find((symbol) => symbol.name === "DB.Scan");

      expect(method).toMatchObject({ kind: "method", startLine: 3, endLine: 14 });
      expect(method?.searchText).toContain("row close");
      expect(method?.searchText).toContain("scan row");
    });
  });

  it("extracts a top-level Go var declaration and its complete literal body", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "collations.go");
      await writeFile(
        target,
        `package protocol

var collations = map[string]byte{
    "utf8mb4_general_ci": 45,
    "binary": 63,
}
`,
        "utf8"
      );

      const parsed = await parseFile(root, "collations.go", "go");
      const declaration = parsed.symbols.find((symbol) => symbol.name === "collations");

      expect(declaration).toMatchObject({ kind: "const", startLine: 3, endLine: 6 });
      expect(declaration?.searchText).toContain("utf8mb4 general ci");
    });
  });

  it("does not treat Rust lifetimes as unterminated character literals", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "borrowed.rs");
      await writeFile(
        target,
        `pub fn borrowed_value<'a>(value: &'a str) -> &'a str {
    if value.is_empty() {
        return "fallback";
    }
    value
}
`,
        "utf8"
      );

      const parsed = await parseFile(root, "src/borrowed.rs", "rs");
      expect(parsed.symbols.find((symbol) => symbol.name === "borrowed_value")).toMatchObject({
        startLine: 1,
        endLine: 6
      });
    });
  });

  it("includes JavaScript test and suite titles in the file summary", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "tests", "command.executableSubcommand.test.js");
      await writeFile(
        target,
        `describeOrSkipOnWindows("subcommand search on Windows", () => {
  test("missing executable uses a custom message", () => true);
  helper("not a test title", () => true);
});
`,
        "utf8"
      );

      const parsed = await parseFile(root, "tests/command.executableSubcommand.test.js", "javascript");

      expect(parsed.summarySeed).toContain("subcommand search on window");
      expect(parsed.summarySeed).toContain("missing executable uses custom message");
      expect(parsed.summarySeed).not.toContain("not test title");
      expect(parsed.facts).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "subcommand search on Windows", kind: "test-suite", role: "verification" }),
        expect.objectContaining({ name: "missing executable uses a custom message", kind: "test-case", role: "verification" })
      ]));
      expect(parsed.facts?.some((fact) => fact.name.includes("not a test title"))).toBe(false);
    });
  });

  it("extracts Python classes, qualified methods, async functions, and complete symbol ranges", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "sessions.py");
      await writeFile(
        target,
        `from .models import PreparedRequest

class SessionRedirectMixin:
    def should_strip_auth(self, old_url: str, new_url: str) -> bool:
        if old_url == new_url:
            return False
        if old_url.startswith("https"):
            return True
        return old_url != new_url

async def send_request(request: PreparedRequest):
    return request
`,
        "utf8"
      );

      const parsed = await parseFile(root, "src/sessions.py", "py");
      const method = parsed.symbols.find((symbol) => symbol.name === "SessionRedirectMixin.should_strip_auth");

      expect(parsed.language).toBe("python");
      expect(parsed.imports).toContain(".models");
      expect(method).toMatchObject({ kind: "method", startLine: 4, endLine: 9 });
      expect(method?.searchText).toContain("old url");
      expect(parsed.symbols).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "SessionRedirectMixin", kind: "class" }),
        expect.objectContaining({ name: "send_request", kind: "function" })
      ]));
    });
  });

  it("indexes top-level Python assignments and their multiline values", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "locales", "ja", "custom.py");
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(
        target,
        `from __future__ import annotations

DATE_FORMATS: dict[str, str] = {
    "L": "YYYY/MM/DD",
    "LL": "YYYY年M月D日",
}

LOCALE_NAME = "Japanese"
`,
        "utf8"
      );

      const parsed = await parseFile(root, "src/locales/ja/custom.py", "py");
      const dateFormats = parsed.symbols.find((symbol) => symbol.name === "DATE_FORMATS");

      expect(dateFormats).toMatchObject({ kind: "const", startLine: 3, endLine: 6 });
      expect(dateFormats?.searchText).toContain("date format");
      expect(dateFormats?.searchText).toContain("yyyy");
      expect(parsed.symbols).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "LOCALE_NAME", kind: "const", startLine: 8, endLine: 8 })
      ]));
      expect(parsed.summarySeed).toContain("DATE_FORMATS");
    });
  });
});
