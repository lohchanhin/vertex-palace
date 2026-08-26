# Local Blind Paired Routing Validation Protocol (0.4 Stable Candidate, Round 20)

## Status and Evidence Boundary

This protocol and its ordered 48-repository roster are committed and pushed before any Round 20 remote HEAD query, repository history inspection, target selection, or Palace call on a candidate task. The candidate is the immutable public package `vertex-palace@0.4.0-alpha.1`; the comparison baseline is the immutable public package `vertex-palace@0.3.0`.

Round 19 and its post-observation repairs remain disclosed evidence and are excluded from target selection. Round 20 is a fresh static-routing study. It does not execute an Agent or target test suite and cannot by itself prove end-to-end correctness, Token savings, tool-call reduction, or wall-time improvement.

## Research Question

On eight previously unobserved real-repository tasks, does the public 0.4 alpha preserve or improve 0.3 routing coverage and focus while eliminating unsafe narrowing, keeping context bounded, and reporting calibrated confidence?

## Frozen Inputs

- Four language families: JavaScript/TypeScript, Python, Go, and Rust.
- Twelve repositories per family in binding roster order.
- The first eight reachable repositories per family form the canonical pool.
- Two accepted targets per family are selected in repository order.
- Up to five newest mechanically eligible commits per repository are reviewed newest-first.
- A target must contain two to eight changed files, at least one implementation file, and at least one focused test file.
- Every changed hunk must be task-coherent. An uncertain or unrelated hunk rejects the whole target; partial oracle pruning is forbidden.
- The whole-file parent-to-child diff is the oracle.
- Candidate and baseline package identities, selection code, gates, and condition order are frozen before candidate history is inspected.

## Paired Execution

Each target runs twice under each condition. Condition order is balanced `AB/BA` by manifest index and execution is sequential, never concurrent. Each condition receives an independently cloned parent tree and fresh Palace index.

The validator records route membership and order, changed-file coverage, route focus, confidence calibration, selected mode, evidence status, payload Tokens, stale-index status, selected/excluded overlap, evaluation/context agreement, tracked-worktree modification, and static command time.

## Candidate Absolute Gate

The candidate passes only when all conditions hold:

1. all 8 targets and all 16 candidate repetitions complete;
2. task type matches on all 8 targets;
3. implementation and path-derived focused-test coverage are complete on all 8 targets;
4. every preregistered auxiliary surface is complete;
5. route membership and order are deterministic across repetitions;
6. target-macro changed-file coverage is at least `0.90`;
7. target-macro route focus is at least `0.70`;
8. every target has coverage at least `0.50` and focus at least `0.40`;
9. there are zero overconfident trials, unsafe narrow modes, and unsafe enforced stops;
10. there are zero metric disagreements and zero evaluation/context route disagreements;
11. every context payload remains at or below `6,000` estimated Tokens;
12. selected and excluded route boundaries never overlap;
13. every explicit index is fresh and Palace modifies no tracked target file.

The candidate must also be no more than `0.05` below baseline on macro coverage or macro focus and must not regress narrow-mode or enforced-stop safety.

## Stable Release Decision

`0.4.0` may replace npm `latest` only if:

1. Round 20 is valid and the candidate absolute gate passes without changing targets, oracles, thresholds, or product code;
2. the full workspace build, lint, test, MCP smoke, packed-tarball verifier, privacy scan, and public clean-install verifier pass;
3. stable documentation states that routing evidence is static and does not claim general Agent performance acceleration.

If the Round 20 gate fails, `0.4.0-alpha.1` remains on npm `next`, `0.3.0` remains `latest`, and the negative result is published unchanged. Post-observation repair may begin only after that result is preserved and cannot retroactively qualify this round.

## Preservation

Every phase writes create-only JSON. Protocol, roster, product freeze, queue, semantic review, target manifest, validation freeze, and result are hash-linked. Environment failures, harness failures, and product-gate failures remain distinct. A completed negative product result is not relabeled as an environment failure.
