# Vertex Palace Codex Session Usage Audit

Date: 2026-08-09

Status: aggregate report publishable; private raw audit remains local and excluded from Git

Primary question: does Vertex Palace help Codex read less, read the right evidence, and preserve useful project experience across real repository work?

## Executive conclusion

Vertex Palace is widely used on this computer and its CLI is operationally dependable. It is not yet dependable as a mandatory bounded-context controller.

The historical record shows two very different reliability levels:

- **Operational reliability is high.** The audit found 4,775 Palace call envelopes. Of these, 87.60% were classified as hard successes and 96.19% either completed successfully or returned a usable mixed result.
- **Retrieval reliability is low and task-dependent.** In 345 real-project evaluation events with both route confidence and retrospective changed-file coverage, median confidence was 0.68 while median coverage was only 7%. Median absolute calibration error was 0.40.

The strongest supported product value is therefore:

1. an auditable repository map;
2. scoped delivery of project decisions, tenant boundaries, and deployment pitfalls;
3. a structured starting hypothesis for investigation;
4. guardrails against repeating known mistakes.

The evidence does **not** currently support a general claim that Vertex Palace saves end-to-end Tokens, reduces wall time, or improves Codex correctness. Version 0.3.0 performed substantially worse than Control in the strongest completed real-repository Agent experiment. The local 0.4 work is moving toward an advisory and evidence-aware design, but it has not yet passed a fresh held-out end-to-end Agent study.

## Evidence and method

### Local Codex history

The reproducible audit scanned:

- 281 Codex rollout JSONL files;
- 165 unique conversation sessions;
- 31 archived sessions;
- both `%USERPROFILE%\.codex\sessions` and `%USERPROFILE%\.codex\archived_sessions`;
- zero JSON parse errors.

System, developer, plugin-list, `AGENTS.md`, and turn-context injections were excluded from usage detection. Multiple rollout files belonging to the same session were merged, and duplicate call IDs were removed.

Artifacts:

- Private raw session audit: retained locally at `docs/research/evidence/codex-palace-usage-audit.json` and intentionally excluded from Git
- [Derived usage summary](evidence/codex-palace-usage-summary.json)
- [Audit collector](../../scripts/research/audit-codex-palace-usage.cjs)
- [Summary generator](../../scripts/research/summarize-codex-palace-usage-audit.cjs)

The raw audit is local evidence, not a publication artifact. Its snippets are token/password/IP-redacted, but it still contains conversation titles, local paths, session IDs, and task summaries. It remains excluded from Git. The public aggregate removes session IDs, titles, paths, task summaries, transcript snippets, and all per-session rows; it retains only counts and distribution statistics.

### Controlled studies

The local observational record was cross-checked against the frozen studies in [`lohchanhin/benchmarks-demo`](https://github.com/lohchanhin/benchmarks-demo/tree/ac9367c20b5b158f5b3bfdc4eff808b809437a59):

- Adaptive v2.2 synthetic four-arm study;
- Control-first v3 exploratory study;
- Real-repository V4 blinded and outcome-locked Agent study;
- 0.4 alpha disclosed and held-out static routing studies.

The evidence hierarchy used here is:

1. frozen real-repository Agent outcomes;
2. frozen held-out routing outcomes;
3. synthetic controlled outcomes;
4. retrospective session telemetry;
5. qualitative user and Agent feedback.

This prevents a high volume of successful CLI calls from overriding a smaller but stronger correctness experiment.

## Observed adoption

The first observed Palace call occurred on 2026-07-08. Among 68 locally archived Codex sessions with activity from that point onward, 66 contained actual Palace calls, an observed usage rate of 97.06%.

| Session group | Sessions | Palace call envelopes |
| --- | ---: | ---: |
| Real project work | 34 | 4,097 |
| Vertex Palace self-development | 1 | 515 |
| Nightly CI automation | 31 | 163 |
| Total | 66 | 4,775 |

This establishes broad observed use, not universal installation. It does not prove that every repository, future session, or another user's machine is configured.

## Operational reliability

### Transport outcome

| Outcome | Calls | Share |
| --- | ---: | ---: |
| Succeeded | 4,183 | 87.60% |
| Mixed but completed | 410 | 8.59% |
| Failed | 121 | 2.53% |
| Unknown from retained output | 61 | 1.28% |

All 4,775 observed calls used the CLI transport. No historical call used a `palace_*` MCP tool. CLI fallback is working; MCP discovery and reload behavior remain an integration gap.

### Operation volume

| Operation | All calls | Real-project calls |
| --- | ---: | ---: |
| `memory` | 1,163 | 999 |
| `evaluate` | 833 | 708 |
| `context` | 751 | 606 |
| `status` | 729 | 652 |
| `route` | 587 | 524 |
| `pack` | 360 | 323 |
| `index` | 323 | 268 |
| `init` | 29 | 17 |

This volume shows sustained use, but it also exposes workflow overhead. Historical sessions repeatedly performed status, index, route, pack, evaluate, and memory operations. The one-call `context --auto` path is the right direction, but the older ritual remains visible in the total record.

## Retrieval reliability

### Evidence sufficiency and mode selection

In real-project work there were 606 `context` calls. Among the 528 calls that reported a recognized evidence status:

- 434 were `insufficient`;
- 94 were `sufficient`;
- 82.20% of known statuses were therefore insufficient.

Among 548 calls with a recognized mode:

| Mode | Calls | Share of recognized modes |
| --- | ---: | ---: |
| `full-palace` | 290 | 52.92% |
| `guarded-memory-palace` | 255 | 46.53% |
| `bypass` | 2 | 0.36% |
| `route-lite` | 1 | 0.18% |

Full or guarded mode represented 99.45% of recognized selections. The system is therefore not yet behaving like a broadly adaptive router in real work. It usually cannot establish enough evidence to narrow safely.

The median reported context size was 3,245 estimated Tokens. The median memory count was 3. A small Palace payload is useful, but it is not an end-to-end Token measurement.

### Retrospective route quality

There were 708 real-project `evaluate` calls. Changed-file coverage was recoverable for 345 events and route focus for 332 events.

| Metric | Mean | Median | Zero | Below 50% | At least 80% | Exactly 100% |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Changed-file coverage | 24.97% | 7% | 169 | 256 | 37 | 33 |
| Route focus | 18.98% | 10% | 156 | 274 | 13 | 8 |

Important interpretations:

- 49.0% of measured coverage events were exactly zero.
- 74.2% had changed-file coverage below 50%.
- Only 10.7% reached at least 80% changed-file coverage.
- Route focus was below 50% in 82.5% of measured events.

Repeated evaluations inside a long conversation are not independent trials, so a session-window view was also calculated. Twenty-seven real-project conversation windows had at least one measurable evaluation. The median of their median changed-file coverage was 4%; 13 windows had a median of zero, and none had a median of at least 80%.

These metrics do not say that every omitted changed file had to be known before coding. They do show that the route usually failed to anticipate the eventual change surface and was not a reliable stopping boundary.

### Confidence calibration

For 345 real-project evaluation events with paired values:

| Measure | Mean | Median |
| --- | ---: | ---: |
| Route confidence | 0.609 | 0.68 |
| Changed-file coverage | 24.97% | 7% |
| Absolute calibration error | 0.442 | 0.40 |

Route relevance, evidence completeness, memory trust, and authorization to stop were represented too closely by one confidence concept. A route can contain plausible files and still omit the implementation, caller, test, configuration, frontend, generated artifact, or historical decision needed to finish correctly.

Only 36 of 708 real-project evaluation envelopes were explicitly labeled `strong`; 277 were `needs-review`, 47 were `unverified`, and 348 could not be classified from retained older or truncated output.

### Current-task self-check

After this audit was written, `palace evaluate` was run against the exact audit task and its five changed research files. Evaluation `evaluation_8c1af9099b05e7ff`:

- classified the task as `refactor`;
- routed to ten product implementation files;
- missed both research scripts, both evidence JSON files, and this report;
- produced 0% changed-file coverage and 0% route focus;
- retained route confidence 0.68 and was labeled `overconfident`.

This is not an independent benchmark trial, but it is a direct current-worktree reproduction of the meta/research routing weakness described by the historical data.

## Controlled-study timeline

### Study 1: Adaptive v2.2

The synthetic v2.2 study completed 16 trials and 64 arms. Every arm passed its visible tests and hidden oracle.

What it established:

- Adaptive produced a reliably smaller Palace-owned payload than Full Palace.
- Static route recall was 1.0 for the fixture ground truth.
- Stale-memory guardrail language was delivered consistently.

What it did not establish:

- Against Control, reported Tokens had a median difference of +30,147 with an interval crossing zero.
- Wall time had a median difference of +10.919 seconds with an interval crossing zero.
- Tool calls increased by +4.5 with a 95% interval of +2.5 to +6.5.
- Adaptive omitted both seeded useful-memory notices in all four useful-memory trials.

Conclusion: Palace output became smaller, but end-to-end Codex efficiency did not improve.

### Study 2: Control-first v3

The v3 exploratory study completed 16 trials across four task profiles.

Useful result:

- In the decision-memory profile, Adaptive succeeded 4/4 while Control succeeded 1/4. This is the clearest evidence that a correctly scoped owner decision can prevent a mistake.

Limits and negative result:

- Small-local and cross-stack success were tied at 4/4.
- Only one decision-memory pair was mutually successful, so its efficiency comparison is not reliable.
- In stale-memory tasks, Adaptive added a median 36,954 reported Tokens, 4.5 calls, and 22.6 seconds; all intervals were above zero.

Conclusion: relevant project memory can be valuable, while indiscriminate or guarded memory can still add measurable overhead.

### Study 3: Real-repository V4

This is the strongest completed end-to-end evidence. It used four public real issues, four paired repetitions per issue, 32 Agent arms, fresh workspaces, frozen hashes, blinded assignment, and an outcome-locked evaluator-private oracle.

| Outcome | Adaptive 0.3.0 | Control |
| --- | ---: | ---: |
| Strict success | 3/16 (18.75%) | 11/16 (68.75%) |
| Oracle correctness | 5/16 (31.25%) | 12/16 (75.00%) |
| Exact changed-file scope | 10/16 (62.50%) | 15/16 (93.75%) |
| Wall time per strict success | 40.59 min | 10.31 min |
| Reported Tokens per strict success | at least 7.30M | 2.73M |

The strict-success difference was -50 percentage points, with eight Control-only successes, zero Adaptive-only successes, and exact McNemar `p=0.0078125`.

The clearest mechanism failure was cross-stack work: Adaptive succeeded 0/4 and Control 4/4. Adaptive reported fewer Tokens because it stopped with incomplete evidence, not because it solved the task more efficiently.

Conclusion: 0.3.0 must not be marketed as generally faster, cheaper, or more correct than ordinary Codex.

### Study 4: 0.4 alpha routing research

The current 0.4 work is addressing the V4 mechanism, but the results are not yet a release proof.

- Round 7 held-out static routing passed 2/8 targets, with macro coverage 0.557, focus 0.480, and precision 0.481. All 16 observations completed and all eight targets were deterministic, so this was a repeatable product-routing failure rather than an environment failure.
- A Round 8 hard confidence cap left all eight ordered routes unchanged, passed 3/8, and worsened calibration MAE from 0.284 to 0.465. Confidence scoring alone cannot repair missing evidence.
- A self-audit candidate passed its seen-target gate but then retrieved 3/13 files for the whole stage, 3/7 for the product repair, and 1/6 for the new artifact family. Immediate recursive generalization failed.

Conclusion: advisory safety is directionally correct, but route membership and evidence closure still need improvement before fresh Agent A/B testing.

## Qualitative field evidence

Two detailed large-project evaluations reported meaningful value:

- 83/100 overall, with the highest scores for reduced repeated reading, historical decisions and pitfalls, and tenant isolation;
- 7.5/10 overall, with 9/10 for deployment pitfall prevention and 9/10 for client isolation.

The concrete positive cases were not generic speed gains. They were prevention cases:

- avoiding unsafe deployment procedures;
- preserving a shared-main tenant feature-flag decision;
- recalling client directory, PM2 process, port, tests, and prior incidents.

The same evaluations reported recurring weaknesses:

- backend-only or keyword-led routes omitted frontend and indirect dependencies;
- task types fell to `unknown` or were misclassified;
- confidence remained high on visibly off-target routes;
- stale indexes and old symbol positions weakened recommendations;
- context packs could be long, irrelevant, or truncated;
- historical sessions did not expose MCP tools;
- Palace could not replace Git diff, tests, browser checks, deployment checks, or health checks.

This feedback agrees with both the session telemetry and the controlled studies: **the current value is history and safety context, not proven general acceleration.**

## Reliability scorecard

These are engineering judgments anchored to the evidence above, not statistical estimates.

| Dimension | Score | Reason |
| --- | ---: | --- |
| Observed adoption | 9/10 | 66 of 68 active local sessions used Palace after first observed adoption. |
| CLI operational continuity | 8.5/10 | 96.19% completed or mixed-result call envelopes; CLI fallback worked. |
| MCP/plugin integration | 4/10 | Historical usage was 100% CLI; no MCP calls were observed. |
| Route completeness | 3/10 | Real-project median coverage was 7%; 49.0% of measured events were zero. |
| Route focus | 3/10 | Median focus was 10%; 82.5% of measured events were below 50%. |
| Confidence and stop safety | 3/10 | Median confidence 0.68 versus median coverage 7%; V4 showed harmful early stopping. |
| Memory and pitfall utility | 6.5/10 | Strong specific prevention cases, but useful-memory omission and stale-memory overhead remain. |
| End-to-end efficiency evidence | 3/10 | Payload shrank, but general Token/time savings were not established; V4 cost per success was worse. |
| Auditability | 8.5/10 | Routes, packs, memory, evaluation, and frozen benchmark evidence are inspectable. |

Role-based readiness is more honest than one blended score:

- **Optional advisory map and project-history layer: 7/10.** Useful now when Codex may expand beyond it and still validates with code, diff, and tests.
- **Mandatory default bounded-context controller: 3/10.** Not safe yet; V4 and retrospective coverage both show that incomplete routes can reduce correctness.

## Systemic root cause

The core problem is not a missing keyword rule. It is that the product optimizes a ranked list of plausible files before proving that the task's evidence loop is closed.

A dependable context router must answer four different questions:

1. **Relevance:** are these files plausibly related?
2. **Completeness:** are all required evidence roles represented?
3. **Trust:** are memories current, scoped, sourced, and non-conflicting?
4. **Authorization:** is it safe for the Agent to stop expanding?

Vertex Palace historically compressed these questions into route confidence and a mode. That creates a stable failure pattern: a plausible lexical route receives a confident bounded pack, the Agent changes its investigation behavior, and omitted evidence is never discovered.

The original core should therefore be restated as:

> Help an Agent reach the smallest **evidence-complete** context for a task, preserve only trustworthy project experience, and never trade correctness for a smaller prompt.

## Optimization direction

### P0: make routing advisory and evidence-complete

1. A route ranks where to start; it must not prohibit normal repository expansion.
2. Decompose each task into required evidence roles such as implementation, caller, test, configuration, frontend/backend counterpart, generated artifact, documentation/release surface, and owner decision.
3. Return explicit `covered`, `missing`, `conflicting`, and `not-applicable` roles.
4. Permit `bypass` or `route-lite` only when required-role closure is sufficient. Otherwise select advisory full context and expose what remains unresolved.
5. After the first failing test or proposed diff, compare new evidence and actual changed files with the route, then widen once in a controlled way.

### P0: separate confidence from authorization

Expose four independent values:

- route relevance confidence;
- evidence completeness;
- memory trust;
- narrow-context authorization.

Displayed confidence may remain graded. Authorization should be conservative and rule-based until enough held-out data exists to calibrate it.

### P1: make memory typed and selective

1. Store decisions, pitfalls, environment facts, and successful routes as different claim types.
2. Require provenance, tenant/client scope, timestamp, related files/symbols, and freshness state.
3. Treat current code and tests as higher authority than memory.
4. Detect contradictions and expired assumptions before packing memory.
5. Include memory only when it has causal relevance to the task. Do not fill a quota of three merely because three items exist.
6. Preserve the Entrance Pitfall Board for high-severity recurring mistakes, but filter it by tenant, task type, recency, and relevance.

### P1: improve causal routing rather than adding case patches

Prioritize general edges and role completion:

- implementation to direct test;
- public API to implementation;
- route to controller to service to data model;
- backend contract to frontend consumer;
- source to generated or bundled artifact;
- configuration to runtime/deployment surface;
- changed symbol to callers and owner decisions.

Task classification should support meta, evaluation, retrospective, release, deployment, documentation, and security work. Compound tenant/product names must remain entities instead of being split into generic keywords.

### P1: remove ritual overhead

1. Keep `palace context --auto` as the normal single call.
2. Fold status, freshness, incremental indexing, route, memory filtering, and bounded packing into that call.
3. Use a true near-zero payload bypass for explicit one-file work with no relevant memory or cross-stack risk.
4. Do not run `evaluate` repeatedly unless the route, changed-file set, or evidence state changed.

### P2: redesign evaluation around successful work

1. Stop calling repository-text-minus-pack an end-to-end Token saving.
2. Report success-gated Tokens, uncached input, tool calls, wall time, retries, and cost per strict success.
3. Measure required-role coverage, changed-file coverage, route focus, forbidden-file changes, and unjustified stopping.
4. Maintain separate profiles for small-local, cross-stack, decision-memory, stale-memory, deployment/tenant, and meta/research tasks.
5. Keep held-out repositories and issue IDs untouched until the candidate is frozen. Once disclosed, use them only as regression tests.
6. Run fresh Agent A/B tests only after static retrieval gates pass.

### P2: close integration and freshness gaps

1. Add a fresh-session MCP smoke test and a documented CLI fallback check.
2. Report capability names at startup so an Agent can distinguish plugin reload issues from product absence.
3. Keep incremental indexes fresh after changed files and commits without forcing full rebuilds.
4. Keep `.palace` local and excluded from application Git unless a user explicitly exports sanitized research evidence.

## Next release gates

Do not publish a general efficiency claim until all of these gates pass:

### Static retrieval gate

- fresh held-out macro changed-file coverage at least 0.90;
- macro route focus and precision at least 0.75;
- no overconfident zero-coverage route;
- required implementation and direct-test roles complete;
- cross-stack tasks include every required stack boundary;
- deterministic output without deterministic wrong routes.

### Memory gate

- 100% delivery of required decision memories in the frozen fidelity fixture;
- zero adoption of stale or contradictory memory;
- explicit reason for every relevant memory exclusion;
- tenant/client isolation validated.

### End-to-end Agent gate

- strict-success non-inferiority to Control on fresh real issues;
- no profile with a repeat of the V4 cross-stack 0/4 versus 4/4 failure;
- Tokens, calls, and wall time reported per strict success;
- efficiency claims made only when success is not degraded and the paired interval supports the claim;
- enough repositories and issues to avoid treating repeated runs as independent breadth.

### Integration gate

- MCP tools visible and callable in a fresh Codex session;
- CLI fallback succeeds when MCP is absent;
- old-session reload limitation is clearly disclosed;
- index freshness and memory provenance are visible in every context response.

## Final decision

Vertex Palace should continue, but its product identity should change from “a smaller context pack that the Agent follows” to “an evidence-completeness and trusted project-memory layer that advises the Agent.”

That direction returns to the original reason for building it: large projects should not force an Agent to reread everything, but the tool must reduce reading **without hiding the evidence needed to be right**.
