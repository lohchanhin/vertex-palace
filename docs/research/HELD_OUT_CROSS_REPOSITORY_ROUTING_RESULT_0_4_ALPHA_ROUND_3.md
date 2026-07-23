# Held-out Cross-Repository Routing Result (0.4 Alpha, Round 3)

## Decision

**Failed. Do not advance candidate `6060e0c` to Agent A/B.**

Round 3 used eight mechanically selected targets balanced across JavaScript/TypeScript, Python, Go, and Rust. The first observation completed Koa but lost seven targets to GitHub transfer and DNS failures. A separately preregistered recovery study, under the unchanged product candidate, completed all fourteen missing trials.

The original study remains failed. The recovery evidence completes the diagnostic dataset but does not retroactively turn the first output into a pass.

## Frozen Evidence

| Artifact | Commit | SHA-256 |
| --- | --- | --- |
| Target manifest | `d35ff81` | `16D62D36341E22864DED89CB7A8C2CC6C5D765C0C4F8B6AE237CFC4D5F0E1DC2` |
| Original observation | `2964abf` | `7C1C0731008979D1DD3085EAEC86A43F277E3BFE588C86D43D5E11AFA5BD7EDF` |
| Environment recovery | `30229a1` | `E400C7C8AF72B10A18FAA51AED643EEEBC6F7A6DBF033C821C822A2E50719499` |

- Product candidate: `6060e0c6aa2aea64d0145c1e55bccdc4669e4b48`
- Original harness: `2cfc712bfa100277635f13e970ded9d05cf120e2`
- Recovery harness: `86823556585c2dbfabe3c1c3a8c9bf4ac1bb04e9`
- Palace calls on candidate tasks before freezing the manifest and original harness: `0`
- Product changes between the original and recovery observations: `0`

The first selector process was interrupted before producing a manifest. That non-result is preserved separately and did not alter the committed selector, repository pool, or task set.

## Environment Recovery

The original observation contained one valid product result and seven environment-censored targets:

- Koa completed both trials.
- Starlette failed on a reset Git transfer.
- Six targets failed DNS resolution before Palace execution.

The recovery protocol allowed at most three materialization attempts, only before Palace execution. All seven targets materialized on their first recovery attempt. There were no remaining environment, setup, or harness failures. This confirms that the seven missing original observations were infrastructure failures, not seven Palace failures.

## Combined Descriptive Result

The following arithmetic combines Koa's two immutable original trials with the fourteen recovered trials. It is a descriptive completion of the dataset, not a replacement status for the original protocol.

| Metric | Result | Gate |
| --- | ---: | ---: |
| Targets passed | 4/8 | 8/8 |
| Completed trials | 16/16 | 16/16 |
| Task-type matched targets | 7/8 | 8/8 |
| Core implementation/test complete targets | 5/8 | 8/8 |
| Macro changed-file coverage | 0.750 | >= 0.900 |
| Macro route focus | 0.538 | >= 0.750 |
| Macro route precision | 0.538 | >= 0.750 |
| Minimum target focus / precision | 0.000 / 0.000 | >= 0.500 / 0.500 |
| Overconfident trials | 6 | 0 |
| Deterministic targets | 8/8 | 8/8 |
| Clean tracked worktrees | 8/8 | 8/8 |
| Maximum context | 5,650 | <= 6,000 |

The candidate missed every promotion quality gate except completion, determinism, worktree cleanliness, and context ceiling.

## Target Results

| Target | Result | Coverage | Focus | Precision | Main observation |
| --- | --- | ---: | ---: | ---: | --- |
| Koa | failed | 0.00 | 0.00 | 0.00 | Selected request-side implementation and an older response type test; missed both oracle files. |
| Starlette | failed | 0.50 | 0.33 | 0.33 | Found `requests.py`, but selected response-side tests and omitted `tests/test_requests.py`. |
| Gin | passed | 1.00 | 1.00 | 1.00 | Exact implementation and test pair. |
| Tower | failed | 0.50 | 0.25 | 0.25 | Found `service.rs`, but omitted its colocated `test.rs` and added three broad integration tests. |
| Axios | passed | 1.00 | 1.00 | 1.00 | Exact implementation and test pair. |
| Echo | passed | 1.00 | 1.00 | 1.00 | Exact implementation and test pair. |
| serde_json | passed | 1.00 | 0.50 | 0.50 | Covered both oracle files but added two related files. |
| Pydantic | failed | 1.00 | 0.22 | 0.22 | Covered both oracle files, classified the task as unknown, and filled all nine route slots with legacy and unrelated `allow` matches. |

All target routes were deterministic across the two repetitions. Deterministic failure is still failure.

## What Generalized

1. Direct implementation/test pairs generalized well for Gin, Axios, and Echo.
2. The candidate preserved full core coverage for serde_json and Pydantic, even though focus differed sharply.
3. The 6,000-token boundary held on all sixteen completed trials.
4. Palace changed no tracked target files.
5. The earlier duplicate-module and exact-pair mechanisms transferred to several unseen languages and layouts.

## What Did Not Generalize

### Request Versus Response Semantics

Koa and Starlette exposed weak directional semantics. Shared words such as response, content type, headers, and request were enough to select nearby but behaviorally wrong surfaces. The router needs stronger evidence from explicit receiver identity, outcome wording, and matching test behavior.

### Colocated Test Topology

Tower's focused test lives beside the implementation under `src/.../test.rs`. The router preferred broad `tower/tests/...` integration files. Test evidence must recognize colocated module tests and connect them to the selected implementation before generic test directories.

### Feature Classification

`Allow periods in unquoted NameEmail display names` was classified as `unknown` despite the task type being mechanically frozen as `feature`. Imperative feature verbs such as Allow, Support, Add, and Implement need explicit bounded classification.

### Route Limit Still Behaved Like A Quota

Pydantic returned exactly nine files. It found both oracle files, then added legacy v1 modules, unrelated tests, and an `allow_partial` test. This confirms that evidence-sufficient stopping is not yet consistent across feature and unknown tasks.

### Confidence Calibration

Koa, Starlette, and Tower produced six overconfident trials despite coverage of 0.00 or 0.50. Confidence still overweights local lexical strength and underweights missing implementation/test relationships.

## Product Direction

The next repair candidate should use general mechanisms only:

1. Classify bounded imperative feature verbs without treating generic verbs such as `allow` as strong file identities.
2. Extract and prioritize explicit code identities such as `Request.cookies`, `NameEmail`, and scoped commit concepts.
3. Distinguish request-side and response-side behavior through receiver, outcome, and test-title evidence.
4. Prefer colocated module tests when their path and implementation relationship are stronger than broad integration tests.
5. Apply evidence-sufficient stopping to every task type; route limit remains a ceiling, never a quota.
6. Cap confidence when no selected test has a strong relationship to the primary implementation or when core surfaces remain ambiguous.

Koa, Starlette, Tower, and Pydantic are now disclosed development data. Gin, Axios, Echo, and serde_json also belong to the observed Round 3 pool and cannot be reused as held-out evidence after repair.

## Claim Boundary

Round 3 is static routing evidence. It shows a real improvement over the earlier `0/6` unseen failure pattern, but it does not prove Agent correctness, Token savings, lower wall time, or fewer tool calls.

After general repair and seen-data regression, another untouched pool is required before Agent A/B. No release or performance claim is authorized by this result.
