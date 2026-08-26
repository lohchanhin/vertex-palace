# Local Blind Paired Routing Validation Protocol (0.4 Alpha, Round 19)

## Status and Evidence Boundary

This protocol and validator are locally hash-frozen after Round 19 selected eight whole-target, task-coherent real-history changes and before the first Vertex Palace call on any selected task. The candidate, baseline, repository roster and pool, candidate queue, coherence packets and reviews, task order, and final target manifest were frozen first.

The competition-result freeze prevents a Git commit or push, so this is an internal tamper-evident study rather than public preregistration. It evaluates static evidence routing only. It cannot support claims about Agent correctness, end-to-end reported Token savings, Agent tool-call reduction, or Agent wall-time gains.

## Research Question

On eight fresh repositories and task-coherent real-history changes, can the frozen post-Round-15 evidence-closure candidate recover complete implementation, focused verification, and bounded auxiliary evidence while keeping routes focused, confidence calibrated, mode selection safe, and delivered context below 6,000 estimated Tokens?

The fixed priority is:

1. task-type correctness;
2. implementation and focused-verification coverage;
3. changed-file coverage and route focus;
4. confidence calibration and safe mode selection;
5. delivered payload;
6. static command time.

Payload and static timing never rescue missing evidence or an unsafe stop.

## Frozen Inputs

The validation freeze binds by SHA-256:

- the Round 19 target manifest and all coherence packet hashes;
- the candidate freeze, source-tree hash, CLI, and generated MCP bundle;
- the pre-optimization baseline commit and offline-rebuilt CLI hash;
- this English protocol and its Simplified Chinese counterpart;
- the validator, validation-freeze generator, integrity test, telemetry helper, and frozen task classifier;
- the candidate queue, semantic review bundle, review materialization script, and target finalizer.

Any mismatch aborts before a selected task is routed. Product changes remain forbidden until the first create-only result is preserved.

## Paired Execution

Targets run sequentially in frozen manifest order. Even indexes run baseline then candidate; odd indexes run candidate then baseline, giving four AB and four BA targets. Conditions never run concurrently.

For each target and condition, the validator:

1. materializes the complete frozen shallow history and verifies the Git oracle;
2. creates an isolated repository at the parent of the frozen change;
3. creates a fresh `.palace` with `init`, `index`, and `status`;
4. runs two formal repetitions of `evaluate` followed by `context --auto`;
5. independently recomputes changed-file, implementation, focused-test, and auxiliary coverage from route files;
6. records confidence calibration, selected mode, evidence status, stop enforcement, selected/excluded overlap, payload, and static command time;
7. verifies deterministic route order, fresh indexes, metric agreement, and a clean tracked target worktree.

No target tests and no coding Agent run during this static gate.

## Fixed Limits

- Targets: 8, exactly 2 per language family.
- Conditions: baseline and candidate.
- Repetitions: 2 per target and condition.
- Formal observations: 16 per condition, 32 total.
- Context ceiling: 6,000 estimated Tokens.
- Route limit: 10 files.
- Maximum drawers: 4.
- Target history depth: 400 complete shallow-history commits.
- Materialization attempts: at most 3.
- Explicit index: one attempt with a 900-second ceiling.
- `evaluate` and `context`: no retries.
- Calibration tolerance: 0.15.
- Execution: sequential, never concurrent.

Static elapsed time is descriptive because operating-system and filesystem caches remain imperfect even with balanced condition order.

## Candidate Absolute Gate

The candidate passes only when all conditions hold:

1. all 8 targets and all 16 candidate repetitions complete;
2. task type matches on all 8 targets;
3. implementation and path-derived focused-test coverage are complete on all 8;
4. every preregistered auxiliary surface is complete;
5. route membership and order are deterministic across repetitions;
6. target-macro changed-file coverage is at least 0.90;
7. target-macro route focus is at least 0.70;
8. every target has coverage at least 0.50 and focus at least 0.40;
9. there are zero overconfident trials, unsafe narrow modes, and unsafe enforced stops;
10. there are zero metric disagreements and zero evaluation/context route disagreements;
11. every context payload remains at or below 6,000 estimated Tokens;
12. selected and excluded route boundaries never overlap;
13. every explicit index is fresh and Palace modifies no tracked target file.

The baseline receives the same descriptive gate. Baseline failure does not invalidate the study.

## Advancement Rule

Advancement to a separately frozen end-to-end Agent A/B protocol requires:

- a valid completed study;
- the complete candidate absolute gate;
- candidate target-macro coverage no more than 0.05 below baseline;
- candidate target-macro focus no more than 0.05 below baseline; and
- no increase in unsafe narrow modes or unsafe enforced stops.

If this gate fails, the first result remains a valid negative or mixed result. No target may be removed after observation, and no product tuning is allowed before that result is preserved. Any later repair makes all Round 19 targets disclosed regression cases.

## Evidence Preservation

The validator writes exactly one create-only formal result:

`docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-19-attempt-1.json`

Environment/setup failures, harness failures, and product-gate failures remain separate. A completed negative product result is not relabeled as an environment failure. Only an invalid study returns a failing process status.
