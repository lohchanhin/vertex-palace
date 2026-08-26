# Local Blind Paired Routing Validation Protocol (0.4 Alpha, Round 9)

## Status and Evidence Boundary

This protocol and its validator are locally hash-frozen after mechanical target
selection but before the first Vertex Palace call on any selected Round 9 task.
The product candidate, baseline, repository pool, target-selection rules, task
order, and selected manifest were already frozen. The validator is generic and
was written without opening task subjects or changed-file oracles.

The competition result freeze prevents a Git commit or push, so this is an
internal tamper-evident blind study, not public preregistration. It may decide
whether development advances to a new Agent experiment. It cannot establish
external generalization on its own.

## Preserved Validation Preflight Attempt 1

The first validation invocation stopped before target materialization and
before any selected task reached Palace. Node on Windows returned `EINVAL` when
the harness launched `pnpm.cmd` directly while rebuilding the baseline. The
create-only invalid result is preserved at
`docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-9.json`
with SHA-256
`C5A643FB53D85417B58F076BCD663E7459BB32935D22E4D5EEC5C94BD895FF68`.

Attempt 2 changes only the Windows pnpm launcher to the already established
`cmd.exe /d /s /c` wrapper. The product, target manifest, tasks, oracles,
condition order, metrics, thresholds, retry rules, and output preservation rules
are unchanged. The amended validator and protocol are hash-frozen again before
the retry. The formal attempt-2 result uses a distinct create-only path.

## Research Question

On eight mechanically selected real-repository tasks not used to tune the local
candidate, does the candidate improve evidence retrieval over the pre-change
baseline without trading correctness for a smaller payload?

This study evaluates static routing only. It does not ask an Agent to implement
the task and cannot support claims about Agent correctness, end-to-end reported
Tokens, Agent tool calls, or Agent wall time.

## Frozen Inputs

- Target manifest SHA-256:
  `D51E517842A98E143B88CAA7507C36C928B89EE1BA5666F5B02D474F2154E50C`
- Candidate freeze SHA-256:
  `A5136AACC91239A56062E7F84C28E7AA1A27FA7C6468E821D401EE6D10AF19EA`
- Candidate CLI SHA-256:
  `C1A473947B8A3E76BA059996F4ED03DFF802F6F7290934546E05449CFA16C557`
- Baseline commit:
  `67c0a2ce8754cece3773d5fd16b89dae4e3af0c1`
- Offline-rebuilt baseline CLI SHA-256:
  `52A1876B00AF4AAA884A6C7EA47AC2E701E88C34FC8FEE65DD1B32BB6513B8AE`

Every validation artifact and support helper is bound in a separate local
validation freeze. Any mismatch aborts before a selected task is routed.

## Paired Execution

Targets run sequentially in selected-manifest order. Even target indexes run
baseline then candidate; odd indexes run candidate then baseline, giving four
AB and four BA targets. Conditions never run concurrently.

For each target and condition, the validator:

1. materializes the complete frozen shallow history and verifies the Git oracle;
2. creates an isolated condition repository at the parent commit;
3. deletes no shared state and creates a fresh `.palace` by running `init`,
   `index`, and `status`;
4. runs two formal repetitions of `evaluate` followed by `context --auto`;
5. independently recomputes changed-file, implementation, test, and auxiliary
   coverage from the route files;
6. records confidence calibration, mode, evidence status, stop enforcement,
   selected/excluded overlap, payload bytes and estimated Tokens, and static
   command time;
7. verifies deterministic route membership/order and a clean tracked target
   worktree.

The baseline CLI is rebuilt offline once from its frozen commit and hash-checked.
The candidate runs from the locally frozen CLI. The same budget and route limits
apply to both.

## Fixed Limits

- Targets: 8, exactly 2 per language family.
- Conditions: baseline and candidate.
- Repetitions: 2 per target and condition.
- Formal static observations: 16 per condition, 32 total.
- Context ceiling: 6,000 estimated Tokens.
- Route limit: 10 files.
- Maximum drawers: 4.
- Target fetch depth: 400 complete shallow-history commits.
- Target materialization attempts: at most 3.
- Explicit index: one attempt with a 900-second ceiling.
- `evaluate` and `context`: no retries.
- Calibration tolerance: 0.15.
- Execution: sequential, never concurrent.

Static CLI calls are fixed by protocol and are not Agent tool-call evidence.
Static elapsed time is descriptive because filesystem and operating-system
caches remain imperfect even with balanced condition order.

## Candidate Absolute Gate

The candidate passes only when all conditions hold:

1. all 8 targets and 16 candidate repetitions complete;
2. task type matches on all 8 targets;
3. implementation and path-derived focused-test coverage is complete on all 8;
4. bounded auxiliary coverage is complete whenever an auxiliary oracle exists;
5. routes are deterministic across repetitions;
6. target-macro changed-file coverage is at least 0.90;
7. target-macro route focus is at least 0.70;
8. every target has coverage at least 0.50 and focus at least 0.40;
9. no overconfident trial, unsafe narrow mode, or enforced stop with incomplete
   oracle coverage is observed;
10. every payload stays within 6,000 estimated Tokens;
11. selected and excluded boundaries never overlap;
12. every explicit index is fresh and Palace modifies no tracked target file.

The baseline receives the same descriptive gate. Baseline failure does not
invalidate the study.

## Paired Advancement Rule

Advancement to an end-to-end Agent protocol requires:

- a valid study;
- the complete candidate absolute gate;
- candidate target-macro coverage no more than 0.05 below baseline;
- candidate target-macro focus no more than 0.05 below baseline; and
- no increase in unsafe narrow modes or enforced incomplete stops.

Payload and static timing never rescue a correctness or evidence-gate failure.
If this gate fails, the result remains a valid negative or mixed product result.
No product tuning is allowed on these tasks before the create-only result is
preserved; any later repair makes all Round 9 tasks disclosed regression cases.

## Evidence Preservation

Preflight attempt 1 already wrote and preserves this immutable invalid result:

`docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-9.json`

The amended validator writes exactly one distinct create-only formal result:

`docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-9-attempt-2.json`

Environment/setup failures, harness failures, and product-gate failures remain
separate. A negative product result is `completed`, not relabeled as an
environment failure. Only an invalid study returns a failing process status.
