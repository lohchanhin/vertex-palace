# Round 13 Research Lifecycle Routing Repair Result 0.4 Alpha

Status: post-observation development self-audit. This is not independent held-out evidence.

## Question

Can a code-changing task that also requests regression verification, machine evidence, and bilingual reports remain focused on the current numbered research families instead of falling back to an older generic routing study?

The exact self-audit task was held constant before and after the repair. Both evaluations used a route limit of 10, a 6,000-token budget, four drawers, and the same 15 actual changed files.

## Baseline Failure

Evaluation `evaluation_247934ce4e376b45` routed through old Round 7 and Round 8 calibration artifacts. It matched only `route-planner.ts` from the 15-file actual-change oracle.

| Metric | Baseline |
| --- | ---: |
| Matched changed files | 1 / 15 |
| Changed-file coverage | 0.067 |
| Route focus | 0.10 |
| Route confidence | 0.40 |
| Calibration | overconfident |

The failure had four causes: numbered phases lost their number, a competition freeze was mistaken for a protocol/configuration artifact, explicit evidence/report outputs were suppressed as routing vocabulary, and a multi-surface bugfix still used the narrow bugfix surface path.

## Repair

- Preserve numbered artifact identities such as `Round 13`, `round-13`, and `round13`.
- Map the bounded Chinese phrase `主体归属闭环` to the existing subject/owner/closure concepts.
- Recognize `继续优化` and equivalent continuations as explicit code-change intent.
- Separate artifact output requests from implementation phrases such as `machine-readable evidence routing`.
- Treat competition freeze constraints as guardrails, not configuration requests.
- Use a bounded artifact-lifecycle selector for multi-surface bugfixes while leaving established feature/refactor behavior unchanged.
- Prefer product implementation and direct product tests before research tooling.
- Balance evidence and bilingual reports across every explicitly named phase and prefer the latest attempt within each family.

## Same-Task Result

Evaluation `evaluation_41e998c519d15686` selected the Round 12 attempt 5 evidence, Round 11 attempt 7 evidence, four corresponding bilingual reports, `route-planner.ts`, `router.test.ts`, and the two direct verifier scripts.

| Metric | Baseline | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Matched changed files | 1 / 15 | 8 / 15 | +7 |
| Changed-file coverage | 0.067 | 0.533 | +0.466 |
| Route focus | 0.10 | 0.80 | +0.70 |
| Route confidence | 0.40 | 0.40 | unchanged |
| Calibration | overconfident | well-calibrated | repaired |

The candidate still reports `needs-review` against the full actual-change oracle. That is intentional: seven misses remain visible rather than being removed after observing the route.

## Two Oracles

The primary diagnostic remains all 15 actual changed files. It includes generated MCP output, a suite runner, report-lock and lineage tests, a superseded attempt, and an auxiliary Bat audit. The candidate matches 8/15.

A secondary semantic core was defined only after observation to explain the result. It contains the eight final product, report, and evidence files, all of which are routed. This 8/8 result is descriptive only and cannot be used as held-out evidence. The two verifier scripts are relevant route support outside that core.

## Controlled Regression

The new bilingual fixture creates a current subject-owner-closure family, a historic Round 8 family, and a competing same-round local-blind family. It requires product implementation, a direct product test, one verifier, final machine evidence, and paired English/Simplified Chinese reports. The fixture reaches full changed-file coverage with route focus at least 0.875 and excludes configuration noise and both competing families.

## Claim Boundary

This result proves a local static routing repair for one observed task plus a controlled regression fixture. It does not prove Agent correctness, token savings, fewer tool calls, or lower wall time. Formal Round 11 and Round 12 outcomes remain immutable. All work remains local while the OpenAI Build Week submission freeze is active.

Machine evidence: `docs/research/evidence/research-lifecycle-routing-repair-self-audit-0.4-alpha.json`.
