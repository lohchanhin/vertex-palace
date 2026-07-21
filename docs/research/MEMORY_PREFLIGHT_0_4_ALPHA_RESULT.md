# Memory Preflight 0.4.0-alpha Engineering Result

Status: implemented and verified as post-v3 engineering work. This is not a v4
Agent benchmark and does not modify or extend the frozen v1, v2.2, or
Control-First v3 outcomes.

[Simplified Chinese](../zh-CN/MEMORY_PREFLIGHT_0_4_ALPHA_RESULT.md) | [Design](MEMORY_PREFLIGHT_0_4_ALPHA_DESIGN.md)

## Root Cause

`palaceContext` selected memory once as a probe, passed only `items.length` to
the mode selector, and let the packer select memory again. The two selections
used different age, limit, token, and relevance policies. Independently, stale,
memory, and tenant keywords forced guarded mode before the selector could see
whether every candidate had already been safely rejected.

The result was internally inconsistent telemetry and a fixed guarded-memory
cost even when no memory was delivered.

## Test-First Evidence

The first regression run intentionally failed 9 tests while 88 existing tests
still passed. The failures reproduced:

- two memory selections for one `palace context` call;
- a 70-day candidate accepted by the probe but rejected by the packer;
- expired and scope-mismatched candidates still forcing guarded mode;
- a prepared memory result being ignored by the packer;
- missing preflight decision and rejection telemetry.

No benchmark outcome file was edited during this work.

## Implementation

- Added `MemoryPreflightResult`, decision states, rejection counters, mode
  transition telemetry, and shared guarded-memory item types.
- Centralized one policy: limit 3, 600 estimated memory tokens, 90 days, and
  minimum relevance 2.
- `palaceContext` now selects once and passes the same prepared object to mode
  selection and packing.
- Direct packer callers retain a compatible fallback selection when no prepared
  object is supplied.
- Deterministically expired or scope-mismatched candidates with zero included
  items cannot force guarded mode.
- Current decision memory, undeliverable relevant memory, and explicitly
  requested but missing decision memory remain guarded.
- Markdown emits one compact rejection summary instead of a full empty guarded
  section. JSON adds a compact `memoryRejection` object while preserving the
  existing auditable telemetry fields.
- The bypass JSON contract remains exactly `mode`, `primaryCandidate`, and
  `reason`.

## Mode Decision Change

| Memory state | Previous behavior | 0.4.0-alpha behavior |
| --- | --- | --- |
| No memory risk, focused task | Bypass or route-lite | Unchanged |
| Current, relevant, low-risk memory | Full Palace | Full Palace |
| Current decision or tenant-sensitive memory | Guarded Memory Palace | Guarded Memory Palace |
| All candidates expired or scope-mismatched | Guarded from keywords | Structural choice: bypass, route-lite, or full |
| Explicit decision dependency, no candidate found | Guarded from keywords | Guarded with an auditable missing-memory warning |
| Relevant item cannot fit the memory budget | Guarded | Guarded as an unresolved delivery conflict |

## Verification

| Gate | Result |
| --- | --- |
| `pnpm build` | Passed for shared, core, CLI, MCP, plugin MCP, and package CLI |
| `pnpm test` | 99 core + 2 MCP + 2 CLI tests passed (103 total) |
| `pnpm lint` | All TypeScript no-emit checks passed |
| `pnpm test:mcp-smoke` | Passed with all 10 MCP tools |
| `pnpm test:release-candidate` | Passed packaging, clean install, Git isolation, memory, and MCP checks |

The release-candidate gate also retained four consecutive bypass selections in
a repository with 240 distractor files. Each serialized JSON payload kept three
fields. Historical Aurora scope inference stayed guarded and promoted only the
Aurora implementation. Dense 50-candidate Markdown and JSON remained below the
5,000-token ceiling.

The first full build exposed one declaration error: moving
`GuardedMemoryItem` into shared types created a duplicate barrel export. Core
now exposes that public name only through its existing shared re-export. This
failure is retained as engineering evidence rather than omitted.

## Palace Self-Evaluation

The post-change route evaluation reported 64% changed-file coverage at 0.85
predicted confidence, classified as overconfident. It found the five primary
implementation files and the design document, but missed three changed
regression files and the generated MCP artifact.

This is a useful negative result: the memory fix is verified, while routing for
multi-test and generated-artifact changes still needs calibration. The reported
99.2% pack-size reduction is context accounting only and is not evidence of
end-to-end Agent speed or Token savings.

## Remaining Risks

- Explicit decision-memory intent is still recognized with task-language
  heuristics rather than a versioned project policy.
- The 90-day age policy is global and not yet project configurable.
- Conflict counting covers deterministic delivery conflicts; it does not yet
  perform semantic contradiction analysis across multiple current memories.
- No real-repository v4 Agent study has measured Token, calls, time, correctness,
  or cost per successful solution for this implementation.

## Next Work

The next engineering PR should add compact Decision Capsules with stronger
provenance and section-level payload accounting, then use those metrics to
separate Palace payload cost from Agent adherence cost. A new v4 protocol may
be prepared afterward, but formal trials must remain separately frozen and
human reviewed before execution.

No npm package, Git tag, or GitHub Release was created by this work.
