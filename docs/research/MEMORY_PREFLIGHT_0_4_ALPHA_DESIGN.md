# Memory Preflight 0.4.0-alpha Design

Status: implementation design for post-v3 engineering validation. This work does
not alter the frozen v1, v2.2, or Control-First v3 benchmark outcomes.

## Problem

The current adaptive call chain is:

```text
routePalace
-> readGuardedMemory (probe)
-> selectPalaceMode (receives only items.length)
-> packContext
-> readGuardedMemory (second selection)
-> render payload
```

The probe and pack policies are not identical:

| Stage | limit | maxTokens | maxAgeDays | minRelevance |
| --- | ---: | ---: | ---: | ---: |
| `palaceContext` probe | 3 | 600 | 90 | 2 |
| normal adaptive pack | 3 | 600 | 90 | default 1 |
| stale-risk adaptive pack | 2 | 500 | 60 | default 1 |

Mode selection also gives memory, stale, and tenant keywords priority over the
actual selection result. A task can therefore enter guarded mode even when all
candidates were deterministically rejected and no memory will be delivered.

## Single Source Of Truth

`palaceContext` will create one `MemoryPreflightResult`. The result contains the
selected items, candidate and exclusion identities, rejection counts, conflict
state, and the compact decision. The same object is passed to both
`selectPalaceMode` and `packContext`.

`packAdaptiveContext` may select memory only for direct callers that did not
provide a prepared result. It must never reselect when `preparedMemory` exists.
The existing `memoryTelemetry` fields remain available to CLI, MCP, Markdown,
and JSON consumers; new fields are additive.

## Mode Policy

1. An unresolved conflict requires `guarded-memory-palace`.
2. Included memory plus stale, contradiction, tenant-scope, or explicit
   historical-decision risk requires `guarded-memory-palace`.
3. Included current memory without those risks uses `full-palace`.
4. Candidates rejected only as `expired` or `scope_mismatch`, with no conflict,
   cannot force guarded mode. Structural route risk then chooses bypass,
   route-lite, or full-palace.
5. A historical decision task with applicable current memory must remain in a
   memory-bearing mode.

Selection before memory and selection after memory are recorded for audit. A
downgrade reason is emitted only when deterministic rejection changes the mode.

## Output Policy

When no memory is delivered because every candidate was safely rejected, the
payload emits only the decision, rejected count, grouped reasons, and one
current-code-first guardrail. It does not render rejected memory text or a full
guarded-memory section. Candidate IDs and per-item exclusion reasons remain in
machine-readable telemetry for audit compatibility.

## Safety Invariants

- Current code, tests, and hidden oracles always outrank memory.
- Expired or contradictory-version memory is never included.
- Ambiguous tenant evidence remains excluded as `scope_mismatch`.
- Unique historical alias inference remains supported.
- Bypass keeps its three-field JSON contract and stays memory-free.
- Frozen benchmark evidence is not modified or reinterpreted.
- No npm publication, Git tag, or GitHub Release is part of this change.

## Regression Strategy

Tests are added before implementation for deterministic stale/scope downgrade,
preflight-to-payload identity, prepared-result reuse, current decision memory,
ambiguous tenant rejection, and superseded-version rejection. Existing bypass,
240-distractor, CLI/MCP, payload-accounting, and release-candidate gates remain
mandatory.
