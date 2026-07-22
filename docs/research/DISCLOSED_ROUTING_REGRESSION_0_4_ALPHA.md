# Disclosed Routing Regression Result (0.4 Alpha)

## Result

**Passed as a seen development regression, not as held-out evidence.** Candidate `0ef19a7bbef1901d813b81389405f87482db47c5` corrected all four routing failures disclosed by the first held-out study. All `8/8` preregistered development-regression trials completed and passed the static gates.

This result does not establish generalization. Fastify, Click, Cobra, and Marked were inspected while the repair was developed, so they can only show that the known failures remain fixed. A new untouched repository pool is still required before the candidate can advance to an Agent A/B study.

## Frozen Evidence

- Candidate and validation harness commit: `0ef19a7bbef1901d813b81389405f87482db47c5`
- Raw evidence: `docs/research/evidence/disclosed-routing-regression-0.4-alpha.json`
- Raw evidence SHA-256: `536795FF78A6F4F7B6E0498D2E73342B805284F1C8CBED99A248C3BB73B70C90`
- Original held-out failure: `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha.json`
- Original held-out evidence SHA-256: `B466582D48A1E2B70ED679BA4ADD7AB5192EF0F3E6A875CB70B7C0C336396606`
- Evidence class: `seen-development-regression`
- `heldOutAgainstCandidate`: `false`

The target manifest and original held-out evidence remained unchanged. The harness verified each pinned route commit, ground-truth commit subject, parent relationship, and changed-file oracle before measuring the candidate.

## Aggregate

| Targets | Passed | Completed trials | Macro coverage | Macro focus | Macro precision | Overconfident trials | Max context | Setup failures |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 4 | 4 | 8/8 | 1.00 | 1.00 | 1.00 | 0 | 5,992 | 0 |

Every route was deterministic across two repetitions. Every repository was fresh immediately after explicit indexing, remained clean in tracked Git state, stayed within the 6,000-token context ceiling, and had no overlap between selected and excluded context boundaries.

## Target Results

| Repository | Exact route | Coverage | Focus | Precision | Confidence | Calibration |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Fastify | `lib/route.js`; `test/find-route.test.js` | 1.00 | 1.00 | 1.00 | 0.90 | well-calibrated |
| Click | `src/click/_compat.py`; `tests/test_utils.py` | 1.00 | 1.00 | 1.00 | 0.66 | underconfident |
| Cobra | `completions.go`; `completions_test.go` | 1.00 | 1.00 | 1.00 | 0.71 | underconfident |
| Marked | `bin/main.js`; `test/unit/bin.test.js` | 1.00 | 1.00 | 1.00 | 0.61 | underconfident |

The repaired routes stopped at the two-file implementation and test pair instead of filling all nine route slots. Underconfidence is safer than the previous overconfidence, but the three conservative scores still need calibration on untouched observations.

## General Mechanisms Added

1. Lexical identity is normalized across camelCase, snake_case, and hyphenated task, symbol, and path forms.
2. Absolute Python package imports are resolved against indexed `src`, repository-root, and `lib` candidates.
3. Language-specific test names such as `test_*.py`, `*_test.go`, and `*Test.java` are recognized as verification surfaces.
4. Repository `bin` paths are recognized as CLI implementation surfaces.
5. Focused implementation-test pairing combines path affinity, import evidence, semantic evidence, and normalized basename identity.
6. Route limit is treated as a ceiling for bounded bugfixes; strong pairs can stop before unrelated siblings are added.
7. Implicit bypass requires the entire physical route to contain one file, preventing support evidence from being silently discarded.
8. Ambiguous and compound routes receive lower confidence when evidence does not justify a narrow intervention.
9. Validation telemetry normalizes full, route-lite, and bypass context shapes before measuring boundaries and payload.

No repository name, commit hash, or target-specific path was added to production routing rules.

## Candidate Self-Evaluation

The same candidate evaluated the real 15-file repair task after the build:

| Route files | Matched changed files | Changed-file coverage | Route focus | Confidence | Calibration | Assessment |
| ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6 | 4/15 | 0.27 | 0.67 | 0.40 | well-calibrated, error 0.13 | needs-review |

This is an important remaining limitation. Confidence safety improved: the complex route no longer presents itself as sufficient. Multi-surface recall did not improve enough for a broad implementation, indexer, generated bundle, validation script, and test task. Palace must remain advisory and the Agent must expand from current code and test evidence.

## Interpretation Limits

- These four repositories are development data after the original `0/4` held-out failure.
- Two repetitions establish deterministic behavior for this run, not population-level reliability.
- Static route coverage and context size do not measure final Agent correctness, reported tokens, wall time, or tool calls.
- The maximum context payload was 5,992 estimated tokens, close to the 6,000-token ceiling; context packing still needs pressure testing.
- No Agent token-saving or speed claim is supported by this result.

## Promotion Decision

The candidate passes the disclosed-regression gate but does **not** advance directly to Agent A/B testing. The next gate is a mechanically selected, preregistered, untouched cross-repository pool with the same minimum requirements:

1. changed-file coverage `>= 0.90` in aggregate and no target with missing required implementation/test surfaces;
2. route focus and precision `>= 0.75`;
3. deterministic routes across repetitions;
4. zero overconfident trials;
5. fresh indexes, clean tracked worktrees, normalized telemetry, and bounded context;
6. immutable raw evidence and explicit separation of product, harness, and environment failures.

Only a passing untouched study can authorize the Control versus Adaptive Agent experiment.
