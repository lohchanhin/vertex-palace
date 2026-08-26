# Local Blind Routing Round 11 Result (0.4 Alpha)

## Verdict

Round 11 is a valid, completed, candidate-held-out paired static-routing study.
All eight targets and all 32 formal observations completed. There were no
environment/setup failures, harness-contract failures, stale indexes,
evaluation/context route disagreements, selected/excluded overlaps, or tracked
target-worktree modifications.

The candidate improved changed-file recall and passed-target count, but it
**failed the frozen absolute gate**. It is not eligible for an end-to-end Agent
A/B protocol. This result is static routing evidence only; it does not establish
Agent correctness, reported Token savings, fewer Agent tool calls, or lower
Agent wall time.

## Evidence Integrity

- Formal result SHA-256:
  `570C2AAA0F5A593466F4EAB5161897DADE310EB211ABE1F2647586B872797720`
- Validation freeze attempt 2 was created before any Palace result on a selected
  task and passed all four integrity tests.
- Validation freeze attempt 1 failed one documentation-wording assertion before
  any Palace call and remains preserved as an audit artifact.
- Candidate source, CLI, and generated MCP hashes remained unchanged throughout
  both freeze attempts and the formal run.

## Aggregate Comparison

| Metric | Baseline | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Passed targets | 2/8 | 5/8 | +3 |
| Core-surface complete | 4/8 | 5/8 | +1 |
| Auxiliary complete | 0/1 | 1/1 | +1 |
| Target-macro changed-file coverage | 0.719 | 0.802 | +0.083 |
| Target-macro route focus | 0.524 | 0.479 | -0.045 |
| Minimum target coverage | 0.250 | 0.250 | 0 |
| Minimum target focus | 0.125 | 0.100 | -0.025 |
| Calibration mean absolute error | 0.377 | 0.384 | +0.007 |
| Overconfident trials | 4 | 4 | 0 |
| Unsafe narrow-mode trials | 2 | 2 | 0 |
| Unsafe enforced-stop trials | 0 | 2 | +2 |
| Metric-disagreement trials | 10 | 0 | -10 |
| Mean delivered context Tokens | 2,663.125 | 3,249.625 | +586.500 |
| Static command time total | 61.573 s | 68.220 s | +6.647 s |

The candidate is non-inferior to the baseline within the frozen 0.05 margins for
macro coverage and focus, and it removed the prior metric-precision mismatch.
Those relative gains do not override the failed absolute gate.

## Per-Target Findings

| Target | Candidate result | Main observation |
| --- | --- | --- |
| yup | Pass | Full oracle recovered, but two extra files reduced focus from 1.0 to 0.5 and added 1,808 estimated Tokens. |
| marshmallow | Pass | Recovered implementation, focused test, and changelog; two extras reduced focus to 0.5. |
| arrayvec | Pass | Full four-file oracle recovered at the 10-file route ceiling; focus was exactly 0.4. |
| node-fetch | Fail | Found `src/response.js` but missed the public type declaration, type test, and `test/main.js`; coverage was 0.25. |
| jsonschema | Pass | Added the previously missed suite test and reached full oracle coverage with 0.667 focus. |
| go-sql-driver-mysql | Fail | Missed `collations.go` and `connector.go`, yet reported 0.90 confidence, chose `route-lite`, and enforced stopping. |
| itertools | Fail | Found `src/lib.rs` but missed `tests/quick.rs`; the 10-file route contained nine non-oracle files and focus fell to 0.10. |
| pgx | Pass | Recovered the exact implementation/test oracle plus one causally relevant codec file. |

## Product Failure Classes

1. **Public API contract closure.** JavaScript implementation evidence did not
   expand to its declaration and declaration test when a task added a public
   static API.
2. **Multi-file implementation saturation.** A single implementation/test pair
   was treated as sufficient even when same-concept producer and connector files
   remained unresolved.
3. **Fallback-language focused-test discovery.** Rust method additions routed to
   generic modules and a lexically adjacent test instead of the real integration
   test.
4. **Unsafe confidence and stop coupling.** High route confidence still triggered
   narrowing and an enforced stop without independent evidence that the task
   subject was covered across all causal participants.
5. **Recall without focus.** Several passing targets reached full coverage only by
   filling much of the route budget, increasing delivered context and static time.

## Next Research Direction

The next repair must remain generic. It should strengthen contract, ownership,
and task-subject evidence closure; require an independent completeness anchor
before `route-lite` can enforce a stop; and reserve route budget for a focused
test before admitting generic neighbors. The three failed Round 11 targets are
now disclosed regression cases. Any future confirmation requires a new,
recursively non-overlapping held-out round.

