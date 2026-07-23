import { writeFile } from "node:fs/promises";
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

  it("falls back without crashing", async () => {
    await withFixture("ts-api", async (root) => {
      const target = path.join(root, "src", "broken.custom");
      await import("node:fs/promises").then((fs) => fs.writeFile(target, "function looseThing() {}", "utf8"));
      const parsed = await parseFile(root, "src/broken.custom", "custom");
      expect(parsed.symbols.some((symbol) => symbol.name === "looseThing")).toBe(true);
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
});
