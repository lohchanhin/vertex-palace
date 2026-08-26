# Local Blind Routing Round 21 Result (0.4 Stable Candidate)

Status: **COMPLETED, VALID, AND FAILED THE STABLE RELEASE GATE**.

Vertex Palace `0.4.0` is not eligible for npm `latest` from this round. The
public `0.3.0` package remains the stable release, while `0.4.0-alpha.1`
remains on `next`.

## Claim Boundary

Round 21 is a fresh, publicly preregistered, local hash-frozen paired static
routing study. Target selection, whole-diff semantic review, product artifacts,
the public `0.3.0` baseline, the validator, and every threshold were frozen and
pushed before any selected task was sent to Palace.

The study does not execute a target test suite or an Agent. It cannot establish
end-to-end correctness, reported Agent Token savings, Agent tool-call reduction,
or Agent wall-time improvement.

The raw result SHA-256 is
`37425E723EA48EF513A9DE35B8AEB0E407FBC6FEACA1E2C8CF7700A44B3EBBBF`.

## Target Selection

- 48 repository URLs were preregistered.
- 43 were reachable and 5 were definitively missing.
- The frozen pool contained 32 repositories, eight per language family.
- 94 mechanical candidates were found without a Palace call.
- 11 whole-target candidates were reviewed hunk by hunk.
- 3 candidates were rejected for unrelated or uncertain hunks.
- 8 targets were selected: two each for JavaScript/TypeScript, Python, Go,
  and Rust.
- Palace calls on selected tasks before the validation freeze: `0`.

## Absolute Candidate Result

| Metric | Required | `0.4.0` candidate | Result |
| --- | ---: | ---: | --- |
| Completed deterministic trials | 16/16 | 16/16 | Pass |
| Task type matched | 8/8 | 8/8 | Pass |
| Passed targets | 8/8 | 4/8 | Fail |
| Core implementation/test complete | 8/8 | 7/8 | Fail |
| Bounded auxiliary complete | 2/2 | 1/2 | Fail |
| Target-macro changed-file coverage | >= 0.900 | 0.833 | Fail |
| Target-macro route focus | >= 0.700 | 0.653 | Fail |
| Minimum target coverage | >= 0.500 | 0.000 | Fail |
| Minimum target focus | >= 0.400 | 0.000 | Fail |
| Overconfident trials | 0 | 0 | Pass |
| Unsafe narrow/enforced-stop trials | 0 | 0 | Pass |
| Metric/context disagreements | 0 | 0 | Pass |
| Payload ceiling | <= 6000 | 5625 maximum | Pass |

## Target Map

| Target | Coverage | Focus | Result | Main observation |
| --- | ---: | ---: | --- | --- |
| `npm-run-path` | 1.000 | 1.000 | Pass | Complete five-file public contract. |
| `cli-truncate` | 1.000 | 1.000 | Pass | Exact implementation/test pair. |
| `outcome` | 1.000 | 0.667 | Pass | Implementation and regression test plus one support file. |
| `async-timeout` | 0.667 | 1.000 | Fail | Correct code and test, but omitted `CHANGES.rst`. |
| `go-shellwords` | 1.000 | 1.000 | Pass | Exact implementation/test pair after the newer mixed candidate was rejected. |
| `go-sqlite3` | 1.000 | 0.333 | Fail | Complete oracle, but four binding/trace/example files diluted focus. |
| `indicatif` | 1.000 | 0.222 | Fail | Complete oracle, but seven broad progress/render support files diluted focus. |
| `nom` | 0.000 | 0.000 | Fail | Opaque issue-number task routed to unrelated parser examples instead of `src/traits.rs` and `tests/issues.rs`. |

## Comparison With Public 0.3.0

The candidate passed four targets versus one for the public baseline and
removed two unsafe narrow-mode trials. It also removed all metric and
evaluation/context disagreements and improved target-macro focus by `+0.150`.

Those improvements did not compensate for a `-0.112` macro coverage delta.
Only six targets produced complete paired observations because the baseline
returned no usable route for two opaque tasks. The candidate also selected
larger context packs: mean estimated context increased by about `1529` tokens,
and static command time increased by about `53.4` seconds in aggregate. These
are routing-harness measurements, not Agent Token or end-to-end latency claims.

## What The Failure Teaches Us

1. **Safety is improved but not sufficient.** Conservative confidence and
   advisory full-palace mode prevented unsafe stopping, but they often expanded
   the context after a good Primary route.
2. **Issue-number-only tasks are information-poor.** `Fix for issue 1808` does
   not contain the behavior, symbol, or file vocabulary needed to identify the
   implementation. The tool should retrieve issue metadata when available or
   explicitly expose that the task is not locally identifiable.
3. **Evidence closure is too broad on large source hubs.** `go-sqlite3` and
   `indicatif` found both oracle files but expanded through high-degree graph
   neighbors that were not required by the task.
4. **Auxiliary closure is too weak.** `async-timeout` found the implementation
   and test but did not include the bounded regression changelog surface.
5. **Full-palace became the only selected mode.** The candidate needs a bounded
   uncertainty mode that keeps verified Primary context while adding only the
   missing evidence facet.

## Post-Observation Direction

Round 21 will not be rewritten or used to qualify `0.4.0`. A later candidate
must address these as repository-generic policies and pass a new held-out round:

1. add an explicit opaque-reference path for issue/PR-only tasks, including a
   local issue-test convention and optional external issue metadata;
2. score graph expansions by task-facet gain and degree penalty so source hubs
   do not fan out merely because they are central;
3. stop expansion once implementation and focused verification facets are
   complete, unless a bounded public-contract or release-note facet is required;
4. replace unconditional low-evidence full-palace packing with a bounded
   uncertainty mode;
5. rerun disclosed Round 21 tasks only as regression evidence, then preregister
   a fresh repository pool before any stable promotion.

## Evidence

- [protocol](LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_STABLE_ROUND_21.md)
- [repository pool](evidence/local-blind-routing-repository-pool-0.4-stable-round-21.json)
- [candidate freeze](evidence/local-blind-candidate-freeze-0.4-stable-round-21.json)
- [semantic reviews](evidence/local-blind-routing-coherence-reviews-0.4-stable-round-21.json)
- [target manifest](evidence/local-blind-routing-target-manifest-0.4-stable-round-21.json)
- [validation freeze](evidence/local-blind-routing-validation-freeze-0.4-stable-round-21.json)
- [raw result](evidence/local-blind-routing-validation-0.4-stable-round-21.json)

The release decision is therefore unchanged: do not publish `0.4.0` to npm
`latest` from Round 21.
