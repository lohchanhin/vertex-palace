# Disclosed Explicit-Evidence Regression (0.4.0-alpha.3)

## Scope

This is a post-observation replay of the immutable Round 22 targets after the one allowed general product repair. It cannot qualify stable 0.4, replace the original Round 22 failure, or establish Agent performance.

## Product Repair

The repair introduces one general task-evidence contract. Repository paths explicitly named in the task or resolved GitHub metadata are materialized after scoring and pruning, before evidence closure and confidence. If an explicit path is unavailable or cannot fit, closure stays insufficient. Bare numeric incident IDs no longer establish local grounding. No repository name, issue number, or target-specific path was added to production logic.

## Attempt 1: Measurement Failure Preserved

The first disclosed replay reported only 0.500 macro core coverage. Read-only inspection showed that the product had delivered focused tests and contracts under top-level `deferredReferences`, while the study runner counted only Primary, loaded context drawers, and an obsolete nested route shape. The raw failed replay is preserved in [attempt 1](./evidence/layered-routing-regression-round-22-0.4.0-alpha.3.json). It is a harness measurement failure, not product evidence.

## Attempt 2: Corrected Disclosed Result

The corrected route extractor includes top-level `deferredReferences`. It does not change target tasks, truth layers, product code, or thresholds.

| Metric | alpha.3 result |
| --- | ---: |
| Reference grounding | 6/6 runs |
| Control abstention | 6/6 runs |
| Routable core closure | 18/18 runs |
| Macro core coverage | 1.000 |
| Macro route focus | 0.972 |
| Declared auxiliary coverage | 100% |
| Deterministic target routes | 12/12 |
| Wrong forced stops | 0 |
| Overconfident runs | 0 |
| Tracked-file pollution | 0 |
| Candidate mean delivered context | 1,726.250 tokens |

Six targets were completed by both alpha.3 and 0.3.0. Their paired coverage delta was `0.000`, and route-focus delta was `+0.431` in favor of alpha.3. Delivered context remains descriptive and is not an Agent Token or speed claim.

Machine evidence: [attempt 2](./evidence/layered-routing-regression-round-22-0.4.0-alpha.3-attempt-2.json).

## Product Verification

- The first full test run hit the existing 15-second timeout in five large router cases while the suite was under transient resource contention. All five passed individually in 0.8-2.0 seconds, and the unchanged full suite then passed with 257/257 core tests, 4/4 CLI/MCP tests, and 239 passed research tests with 2 protocol-defined skips.
- `pnpm lint`, `pnpm build`, MCP smoke, package version consistency, and the temporary-directory release-candidate install all passed for `0.4.0-alpha.3`.
- The release-candidate package integrity matched the disclosed replay candidate: `sha512-rVwwaZMQNBt8sbJV2Al/vo9RWwPn4NMGMOn159DvHDN8j4CPcVzPjm1M+UpkUGaSMbs5KBPH6RrjrKcnJE9qkA==`.
- No npm package, Git tag, or GitHub release was created from this disclosed regression.

## Decision

The known failure class is repaired, but stable qualification remains zero. Alpha.3 must pass two fresh, preregistered, unobserved rounds. Round 23 remains bound to failed alpha.2 and is retired without being used to qualify alpha.3.
