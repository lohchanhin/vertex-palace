# Cross-Repository Route Precision Result 0.4 Alpha

Status: passed all preregistered replication gates on the first recorded run.

## Frozen Evidence

- Product candidate: `b6ff88fc126800a799973447f5ce6b37b925a6a3`.
- Preregistered protocol and harness: `119f9bd8e899a040fcebe9237aba97bf3288166e`.
- First-observation evidence commit: `b9194e317590b799e3f826a1a0138735297d97a3`.
- Evidence: `docs/research/evidence/cross-repository-route-precision-0.4-alpha.json`.
- Evidence SHA-256: `3DEBDFCAC40D6532954D79C7F33EE947C80B63EA7C2AD1815CF3E6604D19A85C`.

The harness used create-only evidence writes. The protocol, repository set, tasks, commits, Oracle files, accepted boundaries, budget, and gates were committed before this result was observed.

## Result

| Repository | Route files | Coverage | Route focus | Accepted-boundary precision | Confidence | Calibration | Max context tokens |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| Zod | 2 | 1.00 | 1.00 | 1.00 | 0.87 | well-calibrated | 2,277 |
| Requests | 2 | 1.00 | 1.00 | 1.00 | 0.72 | underconfident | 1,958 |
| p-limit | 3 | 1.00 | 0.67 | 1.00 | 0.55 | underconfident | 2,159 |
| **Macro / maximum** | - | **1.00** | **0.89** | **1.00** | - | **0 overconfident trials** | **2,277** |

All three repositories passed, and all six preregistered trials completed. The cold and warm evaluations returned identical route-file sets for every repository. No selected path overlapped an excluded boundary, no target repository tracked file was modified, and every context payload remained below the 6,000-token ceiling.

The p-limit route contains both changed files plus the preregistered `package.json` type-test manifest. That makes changed-file focus `2 / 3 = 0.67`, while accepted-boundary precision remains `3 / 3 = 1.00`.

## Oracle Isolation

The changed-file Oracle did not participate in route planning. `evaluateRoute` creates or resolves the route first; it normalizes and compares `changedFiles` only afterward to calculate coverage, focus, and calibration. The separate adaptive context calls received only the task and frozen budget controls.

## Post-Result Self-Audit

This audit was not part of the preregistered replication result and does not alter it. It tested whether Palace could route the six artifacts created by this study itself: the harness, bilingual protocol, JSON evidence, and bilingual result.

| Task wording | Evaluation | Coverage | Route focus | Confidence | Calibration |
| --- | --- | ---: | ---: | ---: | --- |
| Chinese | `evaluation_aed0f811252f98e3` | 0.00 | 0.00 | 0.81 | overconfident |
| Equivalent English | `evaluation_52f0a0280b0cd1c1` | 0.00 | 0.00 | 0.72 | overconfident |
| English after explicit reindex | `evaluation_104e35f60fed62a0` | 0.00 | 0.00 | 0.72 | overconfident |

The index contained all six paths, but routing selected generic router code and older research documents from isolated keyword matches. The failure is therefore not limited to Chinese parsing or a missing-file index.

The audit also found that `palace status` remained `stale: true` immediately after `palace index`. The current indexer appends declared generated artifacts after its ordinary scan, while status compares the stored hashes with only an ordinary scan. An ignored generated output such as `dist/palace.cjs` therefore creates a permanent count mismatch and repeated indexing in a self-hosting repository.

These failures do not invalidate the three-repository pass: those tasks, repositories, and gates remain frozen in the first-observation evidence. They do block promotion of this exact candidate to held-out testing.

## What This Supports

The role-first 0.4 Alpha candidate preserved complete target-file recall across TypeScript, Python, and JavaScript/type-declaration repositories in this replication set. It also reduced the route to the exact accepted boundary, remained deterministic across cold and warm evaluation, and avoided overconfident predictions.

This is meaningful evidence that the focused routing change did not only work inside the Vertex Palace repository. It clears the preregistered cross-repository regression gate.

## What This Does Not Support

- These repositories appeared in earlier Vertex Palace studies, so this is replication, not held-out generalization.
- Three repositories and two deterministic repetitions do not estimate broad ecosystem performance.
- The study did not ask an Agent to edit code, run target tests, or solve the tasks.
- There is no Control arm, so elapsed time and payload size cannot establish lower Agent time or Token usage.
- The context calls followed evaluation and therefore used refreshed warm indexes. Timing fields are diagnostic only.
- Requests and p-limit confidence remained conservative. More unseen observations are required before changing calibration.

## Decision

Keep the frozen candidate and first-observation evidence unchanged. Develop a new candidate that fixes generated-artifact freshness parity and compound artifact-family selection, using the failed self-audit as disclosed development data. The new candidate must retain the original Zod, Requests, and p-limit gates and pass the six-file self-audit before promotion.

After that regression, preregister a real-history task from a repository absent from Vertex Palace implementation, tests, protocols, and prior evidence. Run held-out static validation once, preserve the first result, and only then begin randomized Control, Adaptive, and Full Palace Agent trials.
