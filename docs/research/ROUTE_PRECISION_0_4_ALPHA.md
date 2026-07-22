# Route Precision 0.4 Alpha

Status: exploratory product evidence, not an Agent performance benchmark.

## Question

Can the general multi-surface planner stop treating `routeLimit` as a fill target, preserve complete changed-file recall, and remove redundant historical or generic siblings from a real repository route?

## Frozen Oracle

The before and after evaluations used the same task, repository, route limit, budget, and seven changed files. The oracle spans implementation, a focused regression test, bilingual research records, machine-readable evidence, and the generated MCP bundle.

Task:

> Improve multi-surface routing and release-verification artifact intent; add role-aware implementation and focused regression tests, bilingual research records, record machine-readable evidence, and rebuild the generated MCP bundle.

Base commit: `fec16398324a261b7ca500a78e27f5f98d6318bc`

## Result

| Metric | Before | Candidate | Acceptance |
| --- | ---: | ---: | ---: |
| Changed-file recall | 7/7 | 7/7 | At least 7/7 for this frozen oracle |
| Changed-file coverage | 1.00 | 1.00 | At least 0.90 |
| Route files | 12 | 9 | At most 9 |
| Route focus | 0.58 | 0.78 | At least 0.75 |
| Route confidence | 0.35 | 0.75 | Dynamic, not fixed at 0.35 |
| Static context pack | 3,756 tokens | 2,631 tokens | Descriptive only |

The candidate meets the frozen route-quality gate. It removes the old 0.3 report, old 0.3 evidence, `route-scorer.ts`, and `analyze-task.ts`; two relation-backed support files remain outside the seven-file oracle.

## Implementation

- Multi-surface planning now allocates requested role representatives before considering supplemental context.
- `routeLimit` remains a hard maximum but is no longer used as a target to fill.
- At most two supplemental files may be admitted, and only when graph relation evidence supports them.
- Implementation concepts are derived from the task text and file basename, preventing a shared `router/` directory from collapsing every router module into one concept.
- Route-planning intent favors the planner while explicit scoring intent can still favor the scorer.
- JSON files inside a research evidence directory count as evidence unless their names explicitly identify trial, run, trace, transcript, or raw output.
- Broad-task confidence now responds to requested-surface coverage and planned-role concentration instead of using a constant `0.35` cap.

## Confidence Boundary

The candidate confidence is `0.75`, while this oracle observed complete changed-file coverage. The evaluator therefore still labels it underconfident. That is intentionally retained rather than tuning a single sample until it becomes green. Confidence calibration must be estimated across repositories and task profiles before changing the formula again.

## Adversarial Self-Audit

The first evaluation of this stage's own seven changed files exposed a second failure after the frozen oracle had already passed. For the explicit planner-plus-scorer task, the route initially covered 4/7 files, had focus `0.44`, and was overconfident at `0.77`. A second regression fixture preserved that failure before the implementation was changed.

After separating planning and scoring roles, keeping JSON evidence out of narrative document pairing, and preferring the leading task subject when choosing an evidence family, the same self-audit reached 7/7 files, 9 route files, focus `0.78`, and no warnings. The final self-audit is `evaluation_3e0b7d341232e2dc`.

## Verification

- TypeScript lint passed.
- Full build passed and regenerated `plugins/vertex-palace/mcp/server.cjs`.
- 111 tests passed: 107 core, 2 CLI, and 2 MCP.
- MCP smoke passed with 10 registered tools.
- Clean-tarball release-candidate verification passed.
- Baseline evaluation: `evaluation_b8125773b31dd3ae`.
- Final frozen-oracle evaluation: `evaluation_0843e4b45c7858ab`.

## Claim Boundary

This result demonstrates a more focused static route for one frozen real-repository oracle. It does not demonstrate lower end-to-end Agent tokens, lower wall time, or higher task success. Those claims require randomized Control, Adaptive, and Full Palace trials on multiple repositories.

## Next

1. Repeat the frozen-oracle method on repositories with different languages and layouts.
2. Measure false exclusions and not only changed-file recall.
3. Calibrate confidence on held-out routes rather than this development sample.
4. Run sequential randomized Agent trials after the static route gates generalize.
