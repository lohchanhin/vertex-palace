# Local Blind Routing Round 19 Result (0.4 Alpha)

## Result Boundary

The corrected Attempt 2 completed all eight paired static-routing targets with no environment or harness failures. The candidate did **not** pass the frozen absolute gate and is **not eligible** for an Agent A/B protocol.

Attempt 1 remains preserved as invalid after a generic commit-message-contract harness error exposed seven target pairs. Attempt 2 reused the unchanged candidate, baseline, targets, whole-file oracles, gates, and execution order. It is not a pristine first observation for those seven targets, and no product tuning occurred between attempts.

This study measures static evidence routing only. It does not establish Agent correctness, end-to-end Token savings, Agent tool-call reduction, or Agent wall-time improvement.

## Aggregate Result

| Metric | Baseline | Candidate | Candidate - Baseline |
|---|---:|---:|---:|
| Completed trials | 16 | 16 | 0 |
| Task type matched targets | 8/8 | 8/8 | 0 |
| Core implementation + focused-test complete | 5/8 | 4/8 | -1 |
| Exact-oracle targets | 2/8 | 2/8 | 0 |
| Target-macro changed-file coverage | 0.646 | 0.667 | +0.021 |
| Target-macro route focus | 0.460 | 0.484 | +0.024 |
| Calibration mean absolute error | 0.541 | 0.440 | -0.101 |
| Overconfident trials | 4 | 2 | -2 |
| Unsafe narrow-mode trials | 2 | 0 | -2 |
| Mean context estimated Tokens | 2,075.375 | 2,779.125 | +703.750 |
| Static command time total | 33.934 s | 38.054 s | +4.120 s |

The candidate was non-inferior to baseline on coverage, focus, narrow-mode safety, and enforced-stop safety. However, those relative improvements are too small to satisfy the absolute evidence gate. Payload and static time both increased.

## Candidate Target Map

| Target | Coverage | Focus | Core complete | Main miss |
|---|---:|---:|:---:|---|
| `cors` | 0.333 | 0.500 | No | root test and `HISTORY.md` auxiliary |
| `hoek` | 0.000 | 0.000 | No | `clone` implementation and focused test |
| `jaraco-path` | 1.000 | 0.250 | Yes | broad Ruff-related fan-out |
| `iniconfig` | 1.000 | 1.000 | Yes | none |
| `pretty` | 1.000 | 1.000 | Yes | none |
| `groupcache` | 0.500 | 0.500 | No | nested `consistenthash` implementation |
| `semver` | 1.000 | 0.375 | Yes | broad parser and fuzz support |
| `cc-rs` | 0.500 | 0.250 | No | repository-root test file |

Only `iniconfig` and `pretty` passed their complete per-target gate. Every candidate route was deterministic, every explicit index was fresh, no tracked target file was modified, and evaluation/context routes agreed.

## What Improved

1. **Safety:** the candidate removed both unsafe narrow-mode selections observed in baseline.
2. **Metric integrity:** candidate-reported coverage and focus agreed with independent recomputation on every trial; baseline had four disagreements.
3. **Calibration:** mean absolute error fell by 0.101 and overconfident trials fell from four to two.
4. **Retrieval:** aggregate coverage and focus improved slightly, including recovery of `src/lib.rs` for `cc-rs`.

## What Still Fails

1. **Inflected task anchors:** `cloning` did not reliably anchor `clone.js`, causing a total miss on `hoek`.
2. **Root-level focused tests:** implementation files were found for `cors` and `cc-rs`, but generic root test files were not closed into the route.
3. **Nested owner discovery:** a generic comment-quality task did not reach `consistenthash/consistenthash.go` in `groupcache`.
4. **Auxiliary evidence:** the only preregistered auxiliary target, `HISTORY.md`, was missed.
5. **Fan-out control:** complete routes for broad lint/parser tasks carried too many support files, reducing focus and increasing payload.
6. **Residual overconfidence:** `hoek` had zero oracle coverage at confidence 0.40 in both repetitions.

## Next Product Direction

Post-observation development must use all Round 19 targets as disclosed regression cases. The next repair should remain repository-generic:

1. canonicalize inflected lexical anchors, including consonant-doubling and silent-`e` forms such as `cloning -> clone`;
2. strengthen implementation-to-focused-test closure for repository-root and conventional test aggregators using indexed import, call, and path evidence;
3. add owner/module closure for nested packages when a task names a code-quality surface rather than a concrete file;
4. defer auxiliary changelog evidence until implementation and focused verification are covered, then add it only within the fixed budget;
5. prune support fan-out after evidence closure so complete routes become smaller rather than merely larger;
6. cap confidence when no independent implementation anchor or focused verification path is present.

No public Git, npm, Devpost, or video update is allowed while the competition freeze remains active.
