import { describe, expect, it, vi } from "vitest";
import { indexPalace } from "../src/indexer/index-palace";
import { readIndex } from "../src/storage/read-palace";
import {
  collectGitHubReferences,
  groundTask,
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
