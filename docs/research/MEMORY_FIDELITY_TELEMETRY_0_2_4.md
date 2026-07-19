# Memory Fidelity Telemetry 0.2.4

Status: implemented and release-candidate verified for Vertex Palace 0.2.4.

## Why This Exists

Vertex Palace 0.2.2 repaired a deterministic omission: Adaptive could select
`full-palace` while delivering none of the relevant Aurora memory seeded by the
public v2.2 benchmark. That repair restored delivery, but the output still
showed only the final included items. A filtered candidate could disappear
because of scope, age, selection limit, or token budget without leaving an
auditable reason.

Version 0.2.4 closes that observability gap. It does not present filtering as
free optimization: callers can inspect what retrieval considered and what the
selector removed.

## Public Contract

Adaptive `PackOutput` now exposes `memoryTelemetry`. JSON context output
contains the same object alongside the backward-compatible `memory` array:

```json
{
  "memoryTelemetry": {
    "memoryCandidates": 4,
    "memoryIncluded": 2,
    "memoryExcluded": [
      {
        "id": "memory-03",
        "reason": "scope_mismatch"
      }
    ],
    "candidateIds": ["memory-01", "memory-02", "memory-03", "memory-04"],
    "includedIds": ["memory-01", "memory-02"]
  }
}
```

Stable exclusion reasons are:

- `scope_mismatch`: the task explicitly names a different client or tenant;
- `expired`: the entry exceeds the selected maximum age;
- `selection_limit_reached`: higher-ranked entries filled the item limit;
- `token_budget_exceeded`: including the entry would exceed the memory budget.

The candidate invariant is:

```text
memoryCandidates = memoryIncluded + memoryExcluded.length
```

Only entries with positive retrieval relevance are candidates. Entries that
never matched the task are not reported as retrieved memory.

## Regression Evidence

The Full Palace regression continues to use the exact Aurora task text from
the public Adaptive v2.2 benchmark and a repository with 105 noise files. It
now additionally asserts:

- two candidates are retrieved;
- both preregistered relevant memories are included;
- no retrieved memory is excluded;
- candidate and included IDs are identical;
- Markdown and JSON report the same selection outcome.

Dedicated memory tests use controlled IDs and timestamps to verify all four
exclusion reasons. No filtered candidate may disappear without an ID and
reason.

## Source Verification

| Gate | Result |
| --- | --- |
| Focused context and memory tests | 15/15 passed |
| Core tests | 54/54 passed |
| CLI tests | 2/2 passed |
| MCP tests | 2/2 passed |
| TypeScript lint | passed |
| Monorepo build | passed |
| Generated CLI | reports 0.2.4 |
| Version consistency | root, four workspaces, plugin, marketplace ref, and MCP pin all match 0.2.4 |
| Repository MCP smoke | 10 tools, version 0.2.4, passed |
| npm pack | 7 files, package id `vertex-palace@0.2.4`, SHA-1 `ffbaa7cd08ff15b5473f67508c3b3396542f417d` |
| Clean tarball install | CLI version 0.2.4, passed |
| Clean Aurora fixture | 105 noise files, `full-palace`, 2 candidates, 2 included, 0 excluded |
| Clean JSON transport | 4,848 delivered bytes, 1,212 estimated tokens |
| Clean installed MCP | 10 tools, version 0.2.4, passed |

The clean-install harness created a unique temporary directory, installed only
the generated 0.2.4 tarball, generated all 105 noise files, wrote the two
Aurora memories through the installed CLI, and rejected any nonzero external
exit code. Public-registry, Git tag, and remote-clone evidence are intentionally
not claimed until publication.

## Palace Self-Evaluation

Vertex Palace evaluated the final 0.2.4 release task against all 21 files that
actually changed. This is a negative result worth preserving:

| Measure | Result |
| --- | --- |
| Selected mode | `guarded-memory-palace` |
| Memory telemetry | 47 candidates, 3 included, 44 `selection_limit_reached` |
| Route files | 10 |
| Changed files matched | 9/21 (0.43 coverage) |
| Route focus | 0.90 |
| Calibration | overconfident |
| Assessment | needs review |

The release route found the verification record, root package, workspace
manifests, marketplace metadata, plugin manifest, and MCP pin. It missed the
behavior implementation, shared telemetry types, their regression tests,
human-facing release notes, generated MCP bundle, source-level CLI/MCP
versions, and the plugin skill that consumes the new telemetry. This mixed
"feature implementation plus release" task demonstrates
that Palace evaluation must be checked against the real Git diff. The result
is not treated as a release blocker because every changed surface was verified
directly, but it is retained as input to the next route-boundary iteration.

## Research Boundary

This change proves that relevant memory delivery and exclusions are observable
at the product-contract level. It does not prove that Vertex Palace reduces
total Codex tokens, wall time, or errors compared with Control. A fresh,
preregistered Control-first benchmark with genuinely memory-dependent tasks is
required for those claims.

## 简体中文摘要

0.2.2 已修复 Adaptive 选择 `full-palace` 时漏掉相关记忆的问题，但旧输出只看得到
最后纳入的项目，看不到候选记忆为何被过滤。0.2.4 新增 `memoryTelemetry`：候选数量、
纳入数量、候选与纳入 ID，以及每条被排除记忆的稳定原因。Aurora 回归测试继续使用公开
v2.2 的原始任务，并确认两条预注册记忆都被纳入；受控测试另外覆盖作用域不符、过期、
数量上限与 Token 预算四条排除路径。这证明的是记忆忠实度与可审计性，不是相对纯 Codex
已经获得 Token、时间或正确率优势。
