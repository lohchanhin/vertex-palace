# Disclosed Round 9 Evidence-Closure Repair Result (0.4 Alpha)

## Status

The immutable formal Round 9 candidate gate remains **failed**. This document reports a later, disclosed regression on the same eight already observed tasks. It is diagnostic repair evidence, not a new held-out result.

Attempt 3 completed all eight targets and passed the disclosed core gate. It executed static Palace indexing, evaluation, and context packing only. It did not execute target tests or an Agent.

## Evidence chain

1. Formal Round 9 Attempt 2 completed and failed: 3/8 target gates passed, 6/8 targets had complete implementation/test coverage, macro changed-file coverage was 0.792, macro route focus was 0.499, and two unsafe narrow trials were observed.
2. Disclosed Attempt 1 is preserved as invalid harness evidence. Its path normalizer failed to remove ranges such as `:87-117`, producing false evaluate/context disagreements.
3. Disclosed Attempt 2 fixed only that harness defect and passed the disclosed core gate, but `smallvec` and `ramda` still retained five-file routes. Macro route focus was 0.808.
4. Disclosed Attempt 3 added generic module-mirror and additive external-contract repairs. It passed all eight targets with macro route focus 0.958.

## Aggregate result

| Metric | Formal candidate | Disclosed Attempt 3 |
| --- | ---: | ---: |
| Passed targets | 3/8 | 8/8 |
| Complete core surfaces | 6/8 | 8/8 |
| Macro changed-file coverage | 0.792 | 0.927 |
| Macro route focus | 0.499 | 0.958 |
| Minimum target focus | 0.125 | 0.667 |
| Unsafe narrow trials | 2 | 0 |
| Metric disagreement trials | 6 | 0 |
| Environment/setup failures | 0 | 0 |

The repaired routes were deterministic across two repetitions per target. No tracked target file changed, every context remained under the 6,000-token ceiling, and evaluate/context route membership agreed after line locations were normalized correctly.

## Target result

| Target | Formal files | Repaired files | Formal focus | Repaired focus | Repaired route |
| --- | ---: | ---: | ---: | ---: | --- |
| eslint | 2 | 2 | 1.000 | 1.000 | rule + focused test |
| fsnotify | 10 | 2 | 0.200 | 1.000 | `fsnotify.go` + `fsnotify_test.go` |
| smallvec | 5 | 3 | 0.400 | 1.000 | `src/lib.rs` + `Cargo.toml` + `src/tests.rs` |
| ramda | 5 | 2 | 0.400 | 1.000 | `_equals.js` + `test/equals.js` |
| structlog | 3 | 3 | 0.667 | 0.667 | processor + related stdlib surface + focused test |
| go-kit | 2 | 2 | 1.000 | 1.000 | instancer + focused test |
| rand | 10 | 3 | 0.200 | 1.000 | Pert implementation + package boundary + stability test |
| pendulum | 8 | 2 | 0.125 | 1.000 | Japanese locale implementation + formatter test |

## Generic repairs

- Automatic `bypass` and `route-lite` modes now widen to advisory `full-palace` when evidence is insufficient or conflicted.
- Explicit call identifiers such as `Add()` and `Remove()` survive action-word filtering.
- Fixtures, testdata, fuzz targets, and benchmarks are classified as verification evidence rather than primary implementation.
- Causal expansion is bounded to the dominant package and task-named modules.
- A task-named implementation/test module mirror can stop before lexical collection helpers even when the requested future behavior is not present yet.
- Additive external trait/interface features route to the target type, nearest package manifest, and main tests instead of chasing lexical matches in fuzz and benchmark trees.
- Python top-level assignments are indexed as constants, including multiline locale dictionaries.
- Requested locale identity and locale-specific test phrases participate in pair selection.

## Limits

- These tasks were already observed. Attempt 3 cannot establish generalization.
- The oracle is a frozen Git changed-file diff. Changelogs and package/config files are reported separately from core implementation/test evidence because they can be bookkeeping or required build boundaries.
- No target test, Agent task, correctness outcome, reported Token, tool-call, or wall-time measurement was performed.
- Core calibration MAE is 0.418. There were no overconfident trials, but the repaired candidate is deliberately underconfident.
- No efficiency or end-to-end productivity claim follows from this disclosed static regression.

## Next gate

Freeze the repaired product and run a newly selected Round 10 whose repositories, tasks, and oracles were not observed during these repairs. Only a passing fresh static gate can authorize a later Agent A/B protocol.
