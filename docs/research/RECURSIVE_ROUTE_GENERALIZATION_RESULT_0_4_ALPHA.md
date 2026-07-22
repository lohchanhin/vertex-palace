# Recursive Route Generalization Regression Result (0.4 Alpha)

## Result

**Failed.** Product candidate `716a6c4e2abb6432d59a17db14a940e90918fe2b` passed the three pinned external repositories and six of seven candidate-audit targets, but failed the Simplified Chinese recursive artifact-family target in both repetitions.

The candidate is **not promoted to held-out testing**. This result is a seen-target static routing regression and does not establish Agent token or time savings.

## Frozen evidence

- Product commit: `716a6c4e2abb6432d59a17db14a940e90918fe2b`
- Preregistered harness commit: `ef4fb01c0ecc1352d72a49466a777d6f0c691acc`
- Raw evidence: `docs/research/evidence/recursive-route-generalization-regression-0.4-alpha.json`
- SHA-256: `965656B1A335419F6EF023187D90D61A303CFE702CD84B3103C12704F9DE6165`
- Environment: Windows x64, Node `v24.13.1`, npm `11.8.0`, Git `2.53.0.windows.1`
- Formal execution completed all 20 preregistered trials. No target was retried or removed.

## External repository preservation

Zod, Requests, and p-limit all passed both repetitions:

| Metric | Result |
| --- | ---: |
| Passed repositories | 3 / 3 |
| Completed trials | 6 / 6 |
| Macro changed-file coverage | 1.00 |
| Macro route focus | 0.89 |
| Macro accepted-route precision | 1.00 |
| Overconfident trials | 0 |
| Maximum context payload | 2,277 estimated tokens |

This preserves the earlier seen-target result. It does not add new evidence about unseen repositories.

## Candidate audit

All 14 candidate-audit trials completed, every route was deterministic across its two repetitions, the tracked worktree remained clean, and explicit indexing produced `stale: false`.

| Target | Status | Coverage | Focus | Accepted precision | Confidence | Route files | Context tokens |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original artifact family, English | Passed | 1.00 | 0.86 | 1.00 | 0.75 | 7 | 4,828 |
| Original artifact family, Simplified Chinese | Passed | 1.00 | 0.86 | 1.00 | 0.75 | 7 | 4,796 |
| Recursive artifact family, English | Passed | 1.00 | 0.86 | 1.00 | 0.83 | 7 | 5,481 |
| Recursive artifact family, Simplified Chinese | **Failed** | **0.00** | **0.00** | **0.143** | **0.77** | 7 | 3,313 |
| Compound product route | Passed | 1.00 | 1.00 | 1.00 | 0.86 | 7 | 3,492 |
| Release-vocabulary product route | Passed | 1.00 | 1.00 | 1.00 | 0.84 | 7 | 4,629 |
| Missing-family confidence control | Passed | 0.00 expected | 0.00 expected | 1.00 | 0.15 | 7 | 3,349 |

The aggregate candidate-audit values are 6/7 passed targets, 14/14 completed trials, 0.714 macro coverage, 0.654 macro focus, 0.878 macro accepted precision, and two overconfident trials. The aggregate is depressed by the same failed Chinese target repeated twice; the repetitions are evidence of deterministic failure, not independent target diversity.

## Failure details

For the Simplified Chinese recursive task, both trials selected the complete older `CROSS_REPOSITORY_ROUTE_PRECISION_*` family plus `tsconfig.base.json`. They selected none of the six requested `ROUTE_PRECISION_AFTER_SELF_AUDIT_*` files.

Observed consequences were identical in both repetitions:

- changed-file coverage: `0.00`;
- route focus: `0.00`;
- accepted-route precision: `0.143` because only `tsconfig.base.json` was inside the frozen accepted boundary;
- confidence: `0.77`;
- calibration: overconfident, error `0.77`.

The English task containing the same `post-self-audit` identity selected the correct recursive family. The older artifact family also routed correctly in both English and Simplified Chinese. Therefore, this is not a general Chinese parsing failure and not an environment failure. The narrower observed defect is the combination of Simplified Chinese sentence structure with the embedded recursive family identity.

A working hypothesis is that the artifact-family affinity path does not preserve the embedded `post-self-audit` identity as strongly in the Chinese task analysis, allowing the generic cross-repository family to win. This is an inference to test, not a confirmed root cause.

## Negative control

The nonexistent Cobalt Harbor family intentionally had zero target-file coverage. Its route confidence was capped at `0.15` in both repetitions and calibration remained well calibrated. This gate passed and shows that the new missing-family cap works for the frozen English negative control.

It does not excuse the Chinese failure: that target named an artifact family which did exist, so confidence `0.77` with zero coverage was unsafe.

## Decision

Do not promote candidate `716a6c4` to held-out testing and do not rerun or overwrite this study.

The next development candidate must:

1. Reproduce the exact Simplified Chinese recursive task in a focused unit regression.
2. Inspect task entities and artifact identity tokens to confirm where `post-self-audit` is lost or underweighted.
3. Preserve compound family identities embedded inside Chinese prose without adding language-specific filename exceptions.
4. Apply the low-confidence behavior when a requested bilingual family identity is unresolved.
5. Retain all external, English, product-route, freshness, deterministic-route, and negative-control gates.
6. Freeze a new product commit and preregister a new follow-up study before observing its formal result.

Only after that follow-up passes should a genuinely unseen repository and task be selected for held-out validation.
