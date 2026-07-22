# Advisory Safety Contract (0.4.0-alpha)

Status: local post-v3 engineering iteration. This work does not alter frozen
benchmark evidence and is not an npm, tag, or GitHub release.

[Simplified Chinese](../zh-CN/ADVISORY_SAFETY_CONTRACT_0_4_ALPHA.md)

## Motivation

The mechanism audit found a dangerous coupling: a low-confidence route could
select `full-palace`, while the context pack still emitted mandatory `Do Not`
rules and `stopEnforced: true`. A route that lacked evidence could therefore
restrict the Agent more strongly than a route that had earned confidence.

This iteration separates context size from intervention authority. Palace may
still return a small candidate set, but it can enforce an early stop only after
the routing evidence passes an explicit safety gate.

## Evidence States

| State | Meaning | Required behavior |
| --- | --- | --- |
| `sufficient` | A Primary candidate exists, route confidence is at least 0.7, memory preflight completed, and no relevant evidence gap remains. | May be considered for bounded execution. |
| `insufficient` | Route confidence, Primary coverage, memory preflight, or delivered memory is incomplete. | Advisory and fail-open. |
| `conflicted` | Memory preflight reports an unresolved conflict. | Advisory and fail-open until current evidence resolves it. |

The 0.7 threshold is a conservative intervention gate, not a calibrated
probability of correctness and not proof that the route is complete.

## Intervention Policy

`advisory` is the default. `bounded` is allowed only when all of these are true:

1. Evidence status is `sufficient`.
2. The selected mode is `bypass` or `route-lite`.
3. No memory-dependency, stale-memory, cross-stack, tenant-isolation,
   public-contract, repository-scope, or verification-change risk is present.

`full-palace` and `guarded-memory-palace` remain advisory even when their
current evidence status is sufficient. Broader and memory-bearing tasks should
not receive hard stopping authority from static routing alone.

## Fail-Open Output

Advisory packs:

- set `stopEnforced` to `false`;
- describe Primary paths as starting points rather than an exclusive scope;
- permit expansion into Deferred or Excluded paths whenever code, tests, the
  task, or runtime evidence points there;
- state that Palace cannot authorize an early stop;
- retain tenant and public-contract safety invariants.

Bypass remains source-free. Its Markdown and JSON now expose
`evidenceStatus` and `interventionPolicy`, so a minimal payload cannot silently
carry bounded authority.

## Acceptance Gates

- High-confidence, low-risk single-file work is `sufficient/bounded`.
- Low-confidence work is `insufficient/advisory` without enforced stop rules.
- Unresolved memory conflict is `conflicted/advisory`.
- Cross-stack full-palace output is advisory and fail-open.
- Repeated small-local tasks keep the minimal bypass payload instead of
  regressing to a heavier mode.
- Existing memory, payload-accounting, routing, and release tests remain green.

## Engineering Verification

- `pnpm test`: 103 core, 2 CLI, and 2 MCP tests passed (107 total).
- `pnpm lint`: all workspace TypeScript no-emit checks passed.
- `pnpm build`: shared, core, CLI, MCP, plugin MCP, and package CLI passed.
- `pnpm test:mcp-smoke`: all 10 installed MCP tools passed.
- `pnpm test:release-candidate`: clean install, Git isolation, memory scope,
  dense-memory ceilings, and installed MCP passed.
- Four repeated 240-distractor trials stayed in bypass while reporting
  `insufficient/advisory`; each JSON body had 5 fields and 625 bytes.
- Dense-memory JSON used 4,343 / 5,000 estimated tokens; Markdown used
  4,522 / 5,000.

Core fixture files now run serially with a 15-second per-test limit. This was
added after the same filesystem-heavy tests passed alone but timed out under
parallel disk contention. The limit still reports actual durations and does
not convert assertion failures into passes.

## Palace Self-Evaluation

The corrected evaluation received all 18 changed files. The route matched the
two core implementation files and missed 16 supporting surfaces: tests,
bilingual records, shared types, release scripts, test configuration, and the
generated MCP artifact. Observed changed-file coverage was 0.11 versus route
confidence 0.35, so Palace classified itself as overconfident and
`needs-review`.

The reported 98.2% static context reduction is pack accounting only. It is not
evidence of lower Agent tokens, faster completion, or higher correctness. The
low multi-surface coverage is retained as a negative engineering result and a
separate routing problem; it does not override the executable test gates above.

## Next Experiment

The implementation is a safety prerequisite, not evidence of improved Agent
performance. A later blinded experiment should compare Control, Sham Palace,
Advisory Palace, and the prior bounded contract while holding tasks, model,
order, environment, and scoring fixed.
