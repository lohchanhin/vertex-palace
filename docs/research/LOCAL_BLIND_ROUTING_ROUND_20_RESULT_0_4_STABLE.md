# Local Blind Routing Round 20 Result (0.4 Stable Gate)

## Result Boundary

Round 20 is a fresh, publicly preregistered static-routing comparison between the public npm packages `vertex-palace@0.3.0` and `vertex-palace@0.4.0-alpha.1`. The repository pool, public package hashes, whole-target semantic reviews, eight-target manifest, execution order, budget, and decision thresholds were committed before any Palace call on a selected task.

The study completed with no validity, environment, setup, or harness-contract failure. The candidate **failed the frozen absolute gate**, is **not eligible for the Agent protocol**, and must **not replace npm `latest`**.

This study measures static evidence routing only. It does not establish Agent correctness, end-to-end Token savings, Agent tool-call reduction, or Agent wall-time improvement.

## Aggregate Result

| Metric | `0.3.0` baseline | `0.4.0-alpha.1` candidate | Candidate - baseline |
|---|---:|---:|---:|
| Completed trials | 10/16 | 14/16 | +4 |
| Task type matched targets | 5/8 | 7/8 | +2 |
| Core implementation + focused-test complete | 1/8 | 3/8 | +2 |
| Passed complete target gates | 0/8 | 3/8 | +3 |
| Exact-oracle targets | 0/8 | 1/8 | +1 |
| Target-macro changed-file coverage | 0.497 | 0.655 | +0.158 |
| Target-macro route focus | 0.337 | 0.579 | +0.242 |
| Calibration mean absolute error | 0.301 | 0.442 | +0.141 |
| Overconfident trials | 4 | 2 | -2 |
| Unsafe narrow-mode trials | 4 | 0 | -4 |
| Metric disagreement trials | 4 | 0 | -4 |
| Evaluate/context disagreement trials | 2 | 0 | -2 |
| Mean context estimated Tokens | 1,158.400 | 2,798.714 | +1,640.314 |
| Static command time total | 33.562 s | 51.150 s | +17.588 s |

The candidate made a substantial relative improvement in coverage, focus, task classification, and advisory safety. It also removed all metric-boundary disagreements. Those gains did not meet the preregistered absolute requirements of `0.90` macro coverage, `0.70` macro focus, complete repetitions, complete core and auxiliary surfaces, and zero overconfidence.

## Candidate Target Map

| Target | Coverage | Focus | Core complete | Result | Main miss |
|---|---:|---:|:---:|:---:|---|
| `mimic-fn` | 0.500 | 1.000 | No | Fail | `index.d.ts` and `readme.md` |
| `is-unicode-supported` | N/A | N/A | No | Fail | context returned no Primary candidate |
| `pyupgrade` | 0.000 | 0.000 | No | Fail | routed to generic string helpers instead of the named typing plugin |
| `add-trailing-comma` | 1.000 | 0.667 | Yes | Pass | none |
| `conc` | 0.750 | 0.429 | No | Fail | `pool/context_pool_test.go` |
| `termenv` | 1.000 | 0.625 | Yes | Pass | none |
| `backtrace-rs` | 0.333 | 0.333 | No | Fail | `src/symbolize/gimli.rs` and `tests/accuracy/main.rs` |
| `tempfile` | 1.000 | 1.000 | Yes | Pass | none |

All explicit indexes were fresh, no tracked target file was modified, there was no selected/excluded overlap, and every completed candidate route was deterministic. Candidate evaluate and context boundaries agreed on every completed trial.

## What Improved

1. **Safer advisory behavior:** unsafe narrow modes fell from four trials to zero.
2. **Better retrieval:** macro coverage increased by `0.158` and macro focus by `0.242`.
3. **More complete task handling:** complete core surfaces rose from one target to three, and three candidate targets passed their full gate versus none for baseline.
4. **Consistent metrics:** candidate-reported coverage/focus matched independent recomputation, and evaluate/context selected the same boundaries.
5. **Strong exact cases:** `tempfile` reached an exact two-file oracle, while `termenv` recovered all five changed files from a cross-file writer refactor.

## What Still Fails

1. **No-primary contract:** a valid task can still yield context with no Primary candidate. This prevented both products from completing `is-unicode-supported`; baseline also failed this way on `add-trailing-comma` and `conc`.
2. **Named-module resolution:** `pyupgrade` over-weighted generic “string” anchors and missed the explicitly relevant `typing_pep563` implementation and test.
3. **Declaration and documentation closure:** `mimic-fn` found runtime implementation and tests but omitted the adjacent TypeScript declaration and preregistered README surface.
4. **Sibling focused-test closure:** `conc` found both implementation files but only one of the two focused tests.
5. **Platform-owner closure:** `backtrace-rs` found one Apple test but missed the central `gimli` implementation and the second accuracy test.
6. **Residual overconfidence:** two completed candidate trials remained overconfident, including a zero-coverage route at confidence `0.53`.
7. **Payload cost:** the candidate used roughly 2.4 times the mean static context estimate and 52% more static command time than baseline.

## Stable Release Decision

The preregistered stable decision is **NO-GO**. npm must remain:

- `latest`: `0.3.0`
- `next`: `0.4.0-alpha.1`

Publishing `0.4.0` to `latest` after this result would violate the public decision rule committed before observation.

## Next Product Direction

Round 20 is now disclosed regression evidence. Post-observation development should remain repository-generic:

1. guarantee a structured advisory response when no Primary candidate can be justified instead of failing the context contract;
2. prioritize exact module and path-derived anchors over generic lexical matches;
3. add bounded implementation-to-declaration, documentation, and sibling-test closure only after the primary implementation anchor is established;
4. add platform/configuration owner closure using indexed path, symbol, and dependency evidence;
5. cap confidence from independently recomputed coverage signals and force low confidence when no implementation anchor is present;
6. reduce payload after evidence closure, preserving complete surfaces while pruning unrelated support.

A future stable attempt requires a new publicly frozen repository pool and held-out Round 21. Round 20 targets may be used for regression development but not as fresh confirmation evidence.

## Evidence

- [Protocol](LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_STABLE_ROUND_20.md)
- [Public product freeze](evidence/local-blind-candidate-freeze-0.4-stable-round-20.json)
- [Target manifest](evidence/local-blind-routing-target-manifest-0.4-stable-round-20.json)
- [Validation freeze](evidence/local-blind-routing-validation-freeze-0.4-stable-round-20.json)
- [Immutable result](evidence/local-blind-routing-validation-0.4-stable-round-20.json)

The immutable result SHA-256 is `AEF391A3FF7CBF918F3856DBAEF698DCD41074EBEA667626B55C6D63DCD38D58`.
