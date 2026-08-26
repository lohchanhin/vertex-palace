# Confidence Evidence Gate Round 15 Result 0.4 Alpha

Status: the disclosed post-observation controlled regression passed, and the live self-hosting route was repaired with two explicit residual misses.

## Why This Round Was Necessary

Compound bugfix tasks previously carried a coarse `0.4` confidence cap whenever they requested at least three surfaces and contained many task terms. That avoided overconfidence, but it could not distinguish a complete and causally verified route from an equally broad route with missing verification.

Round 15 replaces the unconditional cap with a conservative evidence gate. A compound route may rise only to `0.68`, and only when completeness, connectivity, semantic coverage, requested-surface breadth, artifact-family coverage, ambiguity, independent verification, and budget all pass their separate checks.

## Controlled Conditions

The same seven-file Keystone fixture, task text, and route limit were used sequentially in all conditions.

| Condition | Matched | Focus | Confidence | Decisive evidence |
| --- | ---: | ---: | ---: | --- |
| Complete evidence | 7/7 | 1.000 | 0.68 | Three implementation sources independently connected to the focused test |
| Tight 100-token budget | same ordered 7 files | 1.000 | 0.40 | Estimated route was 1,548 tokens, so the budget cap remained active |
| Incomplete independent verification | 7/7 | 1.000 | 0.40 | The test covered analysis but not planner or scorer |

The negative verification condition is intentionally strict. File coverage and focus stayed perfect, and role-level evidence closure still reported `sufficient`. Confidence nevertheless remained `0.40` because the narrower causal check identified two routed implementation sources without independent verification.

## Output Qualifiers

The task-intent model now removes output qualifiers such as `machine-readable`, `JSON`, `English`, and `Simplified Chinese` from code subjects when they belong only to evidence or report clauses. The same words are preserved in implementation context: `Fix the English parser` still produces `english` and `parser` subjects.

## Live Self-Hosting Check

The real Round 15 task was evaluated three times as the generalized routing defects were identified and repaired. These runs are disclosed post-observation evidence, not independent held-out trials.

| Stage | Task type | Full changed-file oracle | Focus | Confidence | Calibration | Result |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Baseline (`evaluation_d806f35697a07487`) | `evaluation` | 0/9 | 0.000 | 0.30 | overconfident | Selected the unrelated `artifact-intent-bilingual-followup` family |
| Intermediate (`evaluation_33738334c61a91f0`) | `refactor` | 4/9 | 0.571 | 0.40 | well-calibrated | Recovered all four product code/test files, but selected an older multi-surface report family |
| Repaired (`evaluation_d36bfd38072b0d23`) | `refactor` | 7/9 | 1.000 | 0.40 | underconfident | Selected all seven requested semantic-core files with no route-only files |

The repaired route achieved **7/7 on the requested semantic core** and **7/9 on the broader historical changed-file oracle** within a 4,852-token context and a 6,000-token ceiling. It missed only `scripts/test/round15-confidence-evidence-gate.test.cjs`, a retrospective report-lock test, and `plugins/vertex-palace/mcp/server.cjs`, a generated bundle. Those auxiliary misses are reported rather than hidden or forced into a misleading 9/9 result.

The baseline 0/9 failure remains immutable. The repair was designed after observing both earlier runs, so it demonstrates a local self-hosting correction, not unseen-repository generalization.

## Verification

- Focused Keystone confidence regression: passed.
- Focused intent-qualifier regression: passed.
- Router plus evidence-model regressions: 120/120 passed.
- Monorepo tests: 225 Core, 2 CLI, and 2 MCP tests; 229/229 passed.
- Core TypeScript check: passed.
- Full build, packaged CLI, and generated MCP bundle: passed.
- Research lifecycle: 173/173 regular tests passed (170 inherited plus 3 Round 15 evidence locks), together with 2/2 Round 11 and 2/2 Round 12 freeze guards.

## Interpretation

This round establishes a local safety invariant: moderate confidence uplift now requires complete, connected, unambiguous, independently verified, and budget-compliant evidence. Perfect changed-file coverage alone cannot unlock the uplift.

This is a post-observation controlled regression on a synthetic fixture. It is not independent held-out evidence, does not establish better recall on unseen repositories, and supports no claim about Agent correctness, Token use, tool calls, or wall time. Earlier immutable formal results remain unchanged.

## Competition Freeze

All work remains local. Nothing from this round was committed, pushed, tagged, released, published to npm, or used to alter the Devpost submission.
