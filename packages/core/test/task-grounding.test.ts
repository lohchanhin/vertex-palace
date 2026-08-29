import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { indexPalace } from "../src/indexer/index-palace";
import { analyzeTask } from "../src/router/analyze-task";
import { routePalace } from "../src/router/route-planner";
import { readIndex } from "../src/storage/read-palace";
import {
  collectGitHubReferences,
  groundTask,
  isTaskLocallyIdentifiable,
  parseGitHubRemote
} from "../src/router/task-grounding";
import { withFixture } from "./test-utils";

describe("task grounding", () => {
  it("parses HTTPS and SSH GitHub remotes", () => {
    expect(parseGitHubRemote("https://github.com/openai/codex.git")).toEqual({ owner: "openai", repo: "codex" });
    expect(parseGitHubRemote("git@github.com:openai/codex.git")).toEqual({ owner: "openai", repo: "codex" });
    expect(parseGitHubRemote("ssh://git@github.com/openai/codex.git")).toEqual({ owner: "openai", repo: "codex" });
    expect(parseGitHubRemote("https://gitlab.com/openai/codex.git")).toBeUndefined();
  });

  it("prioritizes full URLs and labeled references and returns at most two", () => {
    const references = collectGitHubReferences(
      "Fix https://github.com/acme/widget/issues/9, issue 10, and #11",
      { owner: "acme", repo: "widget" }
    );
    expect(references.slice(0, 2)).toEqual([
      { owner: "acme", repo: "widget", kind: "issue", number: 9 },
      { owner: "acme", repo: "widget", kind: "issue", number: 10 }
    ]);
  });

  it("does not call GitHub for a locally identifiable task", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const fetchImpl = vi.fn();
      const result = await groundTask(
        root,
        "Fix refresh token rotation in auth.service.ts (#18)",
        (await readIndex(root)).nodes,
        { remoteUrl: "git@github.com:acme/widget.git", fetchImpl }
      );
      expect(result.grounding).toMatchObject({ status: "local", decision: "route", resolutionStatus: "not-needed" });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  it("enriches an explicit URL without letting reference identity displace polyglot evidence", async () => {
    await withFixture("ts-api", async (root) => {
      const files = new Map<string, string>([
        [
          "crates/access/src/ledger.rs",
          `pub fn inspect_access_root(path: &str, attributes: u32) -> Result<(), String> {
    if attributes & 0x400 != 0 {
        return Err(format!("ACL root contains a reparse point: {path}"));
    }
    Ok(())
}
`
        ],
        [
          "crates/access/tests/ledger_test.rs",
          `use access::inspect_access_root;
#[test]
fn nested_alias_is_skipped_without_granting_its_target() {
    assert!(inspect_access_root("ordinary", 0).is_ok());
}
`
        ],
        [
          "packages/runtime/src/workbench.ts",
          "import '@example/workbench'; export function Glob() { return 'workbench'; }\n"
        ],
        [
          "packages/runtime/test/workbench.test.ts",
          "import '@example/workbench'; test('workbench Glob', () => expect(true).toBe(true));\n"
        ]
      ]);
      for (const [relativePath, source] of files) {
        const target = path.join(root, relativePath);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, source, "utf8");
      }
      await indexPalace(root);

      const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
        title: "Glob fails before enumeration on a nested filesystem alias",
        body: "The worker reports `ACL root contains a reparse point`. Keep ordinary files enumerable, skip the nested alias, and do not grant its target. Add the focused ledger regression test.",
        html_url: "https://github.com/example/workbench/issues/47",
        labels: [{ name: "bug" }]
      }), { status: 200, headers: { "content-type": "application/json" } }));
      const grounded = await groundTask(
        root,
        "Fix https://github.com/example/workbench/issues/47: keep Glob enumeration safe.",
        (await readIndex(root)).nodes,
        { fetchImpl }
      );
      const analysis = analyzeTask(grounded.effectiveTask);
      const route = await routePalace(root, grounded.effectiveTask, { routeLimit: 6, budget: 6000 });
      const routed = route.route.map((step) => step.sourcePath.replace(/:\d+(?:-\d+)?$/, ""));

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(grounded.grounding).toMatchObject({
        status: "resolved",
        decision: "route",
        resolutionStatus: "fetched"
      });
      expect(analysis.raw).not.toContain("github.com");
      expect(analysis.keywords).not.toEqual(expect.arrayContaining([
        "http",
        "github",
        "com",
        "example",
        "workbench"
      ]));
      expect(routed).toEqual(expect.arrayContaining([
        "crates/access/src/ledger.rs",
        "crates/access/tests/ledger_test.rs"
      ]));
      expect(routed).not.toContain("packages/runtime/src/workbench.ts");
      expect(routed).not.toContain("packages/runtime/test/workbench.test.ts");
    });
  });

  it("keeps routing with local evidence when explicit URL enrichment fails", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const result = await groundTask(
        root,
        "Fix https://github.com/acme/widget/issues/18 in auth.service.ts",
        (await readIndex(root)).nodes,
        { fetchImpl: async () => new Response("", { status: 404 }) }
      );

      expect(result.grounding).toMatchObject({
        status: "local",
        decision: "route",
        resolutionStatus: "not-found"
      });
      expect(result.grounding.references).toHaveLength(1);
    });
  });

  it("does not treat a bare incident number as a local code identifier", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const nodes = (await readIndex(root)).nodes;
      expect(isTaskLocallyIdentifiable("Investigate incident 7441.", nodes)).toBe(false);
      const result = await groundTask(root, "Investigate incident 7441.", nodes, {
        remoteUrl: "https://gitlab.com/acme/widget.git"
      });
      expect(result.grounding).toMatchObject({
        status: "unresolved",
        decision: "abstain",
        resolutionStatus: "unsupported-remote"
      });
    });
  });

  it("resolves an opaque issue, caches normalized metadata, and never exposes the token", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const previousToken = process.env.GH_TOKEN;
      process.env.GH_TOKEN = "secret-test-token";
      let authorization = "";
      const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        authorization = new Headers(init?.headers).get("authorization") ?? "";
        return new Response(JSON.stringify({
          title: "Refresh token rotation loses the current session",
          body: "Update the auth service and focused auth e2e test.",
          html_url: "https://github.com/acme/widget/issues/18",
          labels: [{ name: "bug" }]
        }), { status: 200, headers: { "content-type": "application/json" } });
      });
      try {
        const first = await groundTask(root, "Fix issue #18", (await readIndex(root)).nodes, {
          remoteUrl: "https://github.com/acme/widget.git",
          fetchImpl
        });
        expect(first.grounding).toMatchObject({ status: "resolved", decision: "route", resolutionStatus: "fetched" });
        expect(first.grounding.references[0]).toMatchObject({
          repository: "acme/widget",
          number: 18,
          title: "Refresh token rotation loses the current session"
        });
        expect(first.effectiveTask).toContain("focused auth e2e test");
        expect(authorization).toBe("Bearer secret-test-token");
        expect(JSON.stringify(first.grounding)).not.toContain("secret-test-token");

        const second = await groundTask(root, "Fix issue #18", (await readIndex(root)).nodes, {
          remoteUrl: "https://github.com/acme/widget.git",
          fetchImpl: vi.fn(async () => { throw new Error("cache should be used"); })
        });
        expect(second.grounding.resolutionStatus).toBe("cache-hit");
        expect(fetchImpl).toHaveBeenCalledTimes(1);
      } finally {
        if (previousToken === undefined) delete process.env.GH_TOKEN;
        else process.env.GH_TOKEN = previousToken;
      }
    });
  });

  it.each([
    [401, null, "unauthorized"],
    [403, "0", "rate-limited"],
    [404, null, "not-found"],
    [500, null, "network-error"]
  ] as const)("abstains for GitHub HTTP %s", async (status, remaining, expected) => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const result = await groundTask(root, "Fix issue #77", (await readIndex(root)).nodes, {
        remoteUrl: "https://github.com/acme/widget.git",
        fetchImpl: async () => new Response("", {
          status,
          headers: remaining === null ? {} : { "x-ratelimit-remaining": remaining }
        })
      });
      expect(result.grounding).toMatchObject({
        status: "unresolved",
        decision: "abstain",
        resolutionStatus: expected
      });
    });
  });

  it("abstains after the bounded network timeout", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const result = await groundTask(root, "Fix PR #91", (await readIndex(root)).nodes, {
        remoteUrl: "https://github.com/acme/widget.git",
        timeoutMs: 5,
        fetchImpl: async (_input, init) => new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        })
      });
      expect(result.grounding).toMatchObject({ status: "unresolved", decision: "abstain", resolutionStatus: "network-error" });
    });
  });

  it("abstains without fetching when reference resolution is disabled", async () => {
    await withFixture("ts-api", async (root) => {
      await indexPalace(root);
      const fetchImpl = vi.fn();
      const result = await groundTask(root, "Fix issue #18", (await readIndex(root)).nodes, {
        referencePolicy: "off",
        remoteUrl: "https://github.com/acme/widget.git",
        fetchImpl
      });
      expect(result.grounding).toMatchObject({ status: "unresolved", decision: "abstain", resolutionStatus: "disabled" });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });
});
