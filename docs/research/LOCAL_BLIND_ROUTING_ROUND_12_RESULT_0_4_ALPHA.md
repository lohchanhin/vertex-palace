# Local Blind Routing Round 12 Result (0.4 Alpha)

## Verdict

Round 12 is a valid, completed, candidate-held-out paired static-routing study. All eight targets and all 32 formal observations completed. There were no environment/setup failures, harness-contract failures during the corrected formal run, stale indexes, evaluation/context route disagreements, selected/excluded overlaps, or tracked target-worktree modifications.

The candidate improved aggregate coverage, focus, calibration, and mean delivered payload relative to the pre-repair baseline, but it **failed the frozen absolute gate**. It is not eligible for an end-to-end Agent A/B protocol. This is static routing evidence only; it does not establish Agent correctness, reported Token savings, fewer Agent tool calls, or lower Agent wall time.

## Evidence Integrity

- Corrected formal result SHA-256: `4A7D6DBB68FBD6C1AEA3CD3159A092E5C2E8D6931187533F827A55BA6B1529D3`
- Attempt-2 validation freeze SHA-256: `FB0F9E9F438B822FD98F9FDDF075A184B5807CB440D16A3C0199C33B6443841B`
- Target manifest SHA-256: `693B398DDB28682D535208AA87F4DDA07AE01F1B97B1BE970C103CED6B046486`
- Candidate freeze SHA-256: `D3B7BE55E1B80F964490A5E773E11AFCB97323A04E933AB30D131AAE6B48F406`
- Candidate queue SHA-256: `0B6CDDCD91C34DF7A30F57AC1CF1E3B99A1180982FC6B0DE56B45075433047C9`
- Semantic review SHA-256: `2F17D6551B4E24F1404811D1F757D2718F13E856B095DD0EE88B1E1FC7992FF0`

The first formal command produced a create-only invalid result before any target materialization, baseline build, or Palace call because the validator expected validation-freeze attempt 2 while the first freeze declared attempt 1. That result remains preserved at SHA-256 `AC7725C8CFD70283D504E699FDE1570411142F1B4B5A68138D3C7F49900379F3`. Attempt 2 changed only harness identity and provenance; candidate source, targets, tasks, oracle files, thresholds, repetitions, and condition order were unchanged.

## Aggregate Comparison

| Metric | Baseline | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Passed targets | 3/8 | 3/8 | 0 |
| Core-surface complete | 5/8 | 4/8 | -1 |
| Auxiliary complete | 0/2 | 0/2 | 0 |
| Target-macro changed-file coverage | 0.542 | 0.625 | +0.083 |
| Target-macro route focus | 0.542 | 0.563 | +0.021 |
| Minimum target coverage | 0.000 | 0.000 | 0 |
| Minimum target focus | 0.000 | 0.000 | 0 |
| Calibration mean absolute error | 0.468 | 0.331 | -0.137 |
| Overconfident trials | 6 | 6 | 0 |
| Unsafe narrow-mode trials | 0 | 0 | 0 |
| Unsafe enforced-stop trials | 0 | 0 | 0 |
| Metric-disagreement trials | 4 | 0 | -4 |
| Mean delivered context Tokens | 3,085.125 | 2,899.875 | -185.250 |
| Maximum delivered context Tokens | 5,390 | 5,227 | -163 |
| Static command time total | 56.325 s | 57.762 s | +1.437 s |

The relative comparison is directionally positive, but it does not override the failed absolute gate. The candidate remained non-inferior to baseline within the frozen 0.05 margins for macro coverage and focus and did not worsen narrow-mode or enforced-stop safety.

## Per-Target Findings

| Target | Candidate result | Main observation |
| --- | --- | --- |
| redux | Fail | Found `src/createStore.ts` but missed its focused `test/createStore.spec.ts`; broad reducer matches added `combineReducers` implementation and test. Coverage 0.50, focus 0.333, confidence 0.89. |
| blinker | Fail | Found `src/blinker/base.py` but routed to `tests/test_context.py` and `CHANGES.rst`, missing `tests/test_signals.py` and `docs/index.rst`. Coverage and focus were both 0.333. |
| sqlx | Fail | Found `named.go` but missed the adjacent `named_test.go`, while five generic SQL/reflect files consumed route budget. Coverage 0.50, focus 0.167. |
| bat | Core pass, auxiliary fail | Exact implementation and integration test at focus 1.0; the preregistered `CHANGELOG.md` auxiliary file was absent. |
| pino | Fail | Missed both `lib/redaction.js` and `test/redact.test.js`; routed to `pino.js` and `test/basic.test.js` with confidence 0.90. Coverage and focus were 0. |
| packaging | Pass | Exact two-file implementation/test oracle, coverage and focus 1.0. |
| afero | Pass | Exact `path.go` / `path_test.go` oracle, coverage and focus 1.0. |
| notify | Pass | Recovered both oracle files plus `notify/src/lib.rs`; coverage 1.0 and focus 0.667. |

## Failure Classes

1. **Compound task-subject dilution.** Exact subjects such as `replaceReducer`, `redaction shape`, and `Object.prototype` lost to broad repository words such as reducer, logger, context, and SQL.
2. **Owner-local focused-test closure.** After finding `createStore.ts`, `named.go`, or `base.py`, the planner did not reserve the matching owner-local test before admitting generic neighbors.
3. **Lexical false authority.** `context manager` selected `test_context.py`; `reducer` selected `combineReducers`; imported or central entrypoints produced high confidence without covering the requested owner.
4. **Confidence lacks exact-anchor coverage.** Redux and Pino were strongly overconfident despite incomplete or zero oracle coverage. Confidence needs an independent exact-subject and owner-pair completeness anchor.
5. **Auxiliary-oracle ambiguity.** The frozen gate required aligned changelog or documentation files, but those files are not always necessary execution context for the task. This remains a protocol question as well as a routing question; product routes should not be padded with generic documentation solely to satisfy historical-diff recall.

## What Held

- Task classification matched 8/8.
- Route membership and order were deterministic on 8/8.
- All modes remained `full-palace` with advisory stopping because evidence was insufficient.
- There were zero unsafe narrow modes and zero unsafe enforced stops.
- Evaluation and context routes agreed in all trials.
- Candidate metric reporting agreed with independent recomputation in all trials.
- No target repository was modified.

## Next Research Direction

The next product repair should remain repository-agnostic:

1. preserve whole camelCase, snake_case, dotted, and scoped subject anchors alongside segmented tokens;
2. rank exact task-subject anchors before broad centrality and one-token neighbors;
3. reserve a focused-test slot for basename, owner, symbol, import, or co-change evidence tied to the selected implementation;
4. penalize cross-owner tests that match only generic task words;
5. cap confidence unless exact-subject and owner-local implementation/test evidence are both present; and
6. keep changelog/documentation recall separate from core execution-context quality until a new protocol establishes when auxiliary files are actually necessary.

Round 12 is now disclosed regression evidence. Any post-result repair must be described as post-observation and requires a recursively non-overlapping Round 13 for fresh confirmation.
