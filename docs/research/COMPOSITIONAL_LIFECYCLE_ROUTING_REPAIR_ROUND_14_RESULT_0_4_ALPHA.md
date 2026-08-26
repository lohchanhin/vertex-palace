# Round 14 Compositional Lifecycle Routing Repair Result 0.4 Alpha

Status: disclosed post-observation development self-audit. This is not independent held-out evidence.

## Question

Can Vertex Palace distinguish a routing implementation clause from a requested artifact output when both appear in one bilingual task? The test task contrasts competition freeze with configuration, asks the router to recognize evidence and reports, and separately asks it to record real self-audit evidence and bilingual results.

## Frozen Comparison

All three observations used the same task text, nine-file changed-file oracle, route limit of 10, 6,000-token budget, and four drawers.

| Observation | Evaluation | Coverage | Focus | Confidence |
| --- | --- | ---: | ---: | ---: |
| Baseline | `evaluation_8b8f74264a8b8ff6` | 0.222 | 0.400 | 0.15 |
| Clause composition only | `evaluation_7db16c85710ed312` | 0.444 | 0.571 | 0.15 |
| Semantic artifact identity | `evaluation_5757c7811b91f791` | 0.778 | 1.000 | 0.40 |

The baseline selected old Round 8 calibration documents and a generic test configuration. Clause composition recovered the three implementation responsibilities, but artifact-family selection still depended on filenames. The final candidate used indexed title, summary, tags, and matched JSON facts, removing every route-only file and selecting the current evidence plus both language reports.

## Product Repair

- Split task text into bounded clauses before deciding requested surfaces.
- Treat recognize, distinguish, classify, and parse as meta-routing actions.
- Treat record, add, generate, update, and sync as real artifact-output actions.
- Keep configuration words inside a contrast clause from requesting configuration files.
- Allocate independent implementation ownership to task analysis, route scoring, and route planning.
- Use semantic index evidence for numbered artifact identity instead of requiring a filename convention.
- Normalize Chinese headings such as `第 13 轮` and `第 2 阶段` to the same identities as `Round 13` and `Phase 2`.
- Size test allocation from the task's explicit request instead of reserving one test for every numbered round.
- Prefer the product regression over auxiliary report-lock tests even when only one test slot is available.

## Residual Boundary

The primary oracle remains all nine changed files. The candidate matched seven and missed:

- the generated MCP bundle, because generated/MCP distribution was not requested;
- the Round 13 report-lock test, because the product regression was already selected and the lock test is auxiliary.

The post-observation seven-file semantic core is 7/7, but it is a secondary diagnostic selected after seeing the result. It does not replace the nine-file primary oracle. Confidence remains conservative at 0.40, so the evaluation is still `needs-review` rather than a claimed complete gate pass.

## Final 13-File Audit

After completing the cross-round bilingual pairing and product-test ownership repair, a separate full audit used all 13 files touched by the Round 13 and Round 14 work. It did not rewrite the frozen nine-file comparison above.

| Evaluation | Full-oracle coverage | Focus | Confidence | Calibration |
| --- | ---: | ---: | ---: | --- |
| `evaluation_349196c29ddf9bb7` | 10/13 (0.769) | 1.000 | 0.40 | underconfident |

The route selected all four implementation and product-regression files, both machine-evidence records, and all four English/Simplified Chinese reports. It selected no route-only file. The three misses were the generated MCP distribution bundle and the two auxiliary report-lock tests. The resulting ten-file semantic core is 10/10 only as a post-observation secondary diagnostic; the 13-file oracle remains the primary result.

## Verification

The original controlled regression requires 7/8 full-oracle coverage, all seven semantic-core files, no contrast-only configuration file, and no historic Round 8 artifact. The new cross-round regression requires a 10/10 bounded fixture route, both language reports for both numbered rounds, the product regression, and no historic Round 8 artifact. The complete router suite, core suite, workspace suite, build, and research suite must remain green before this phase is considered locally stable.

## Claim Boundary

This work is local, disclosed, and post-observation. It does not execute an Agent and supports no claim about Agent correctness, Token use, tool calls, or wall time. The immutable Round 11 and Round 12 formal outcomes remain unchanged. Competition freeze remains active: no commit, push, tag, npm publish, release, or submission edit is permitted.
