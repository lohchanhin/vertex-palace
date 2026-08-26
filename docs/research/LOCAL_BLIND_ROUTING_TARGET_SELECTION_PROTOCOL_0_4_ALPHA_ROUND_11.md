# Local Blind Routing Target Selection Protocol (0.4 Alpha, Round 11)

## Status

**Selection protocol complete; not yet executed.** A URL-and-HEAD-only Round 11 repository pool exists, but no repository history, candidate queue, task, diff, coherence review, target manifest, or Palace result has been inspected or generated. Execution is authorized only by a matching create-only candidate-freeze manifest.

The candidate must be frozen before any Round 11 history or task is inspected. While the competition-result freeze remains active, the candidate and protocol may be bound only by a create-only local SHA-256 freeze. This is not public preregistration.

## Why Round 11 changes selection

Round 10 mechanically treated every file in one single-parent commit as one task oracle. Post-hoc hunk review showed that the `itsdangerous` commit subject described a SHA-512 fallback while the same commit also changed independent `SignatureExpired` control flow and pytest traceback formatting.

Round 11 therefore distinguishes **commit atomicity** from **task semantic coherence**. One commit is not assumed to be one task.

## Research question

On fresh repositories and task-coherent real-history changes, can the frozen candidate recover complete implementation, focused verification, and bounded auxiliary evidence while keeping routes focused, confidence calibrated, mode selection safe, and delivered context under 6,000 estimated tokens?

The priority remains:

1. task-type correctness;
2. implementation and verification coverage;
3. changed-file coverage and route focus;
4. confidence calibration and safe mode selection;
5. delivered payload;
6. static command time.

Payload reduction is not a benefit when required evidence is missing.

## Independence sequence

The order is binding:

1. Finish product changes and all regression verification.
2. Freeze a fresh URL-and-HEAD-only repository pool that excludes every repository observed in prior rounds, without fetching commit history.
3. Freeze the candidate source tree, CLI bundle, generated MCP bundle, this protocol, its Chinese counterpart, repository pool, selectors, classifiers, coherence library, and tests by SHA-256.
4. Mechanically materialize an ordered candidate queue without invoking Palace.
5. Generate a create-only hunk-addressed coherence packet for each mechanical candidate.
6. Review required candidates in the frozen stopping order, covering every file and hunk in each reviewed candidate without seeing any Palace route, pack, confidence, or mode output.
7. Validate the review mechanically. Any unrelated or uncertain hunk rejects the entire target.
8. Select the newest accepted candidate per repository, then the first two accepted repositories per language family in frozen pool order. Do not review older candidates after an acceptance or later repositories after the family quota is filled.
9. Freeze the final target manifest and every coherence packet/review hash.
10. Only then run baseline and candidate static validation.

Product code cannot change between steps 2 and 10. If it changes, Round 11 must restart with a new pool.

## Mechanical candidate queue

The selector may inspect at most 300 non-merge commits per repository and retain at most five mechanically eligible candidates in newest-first order. Mechanical eligibility requires:

1. exactly one available parent;
2. an unedited 20-to-180-character behavioral subject classified by the frozen task classifier;
3. 2 to 8 modified existing files, with no additions, deletions, or renames;
4. at least one primary-language implementation file and one focused verification file;
5. no more than two documentation or configuration files;
6. 2 to 400 changed lines;
7. every oracle file exists in both parent and selected commit; and
8. the complete unified-zero diff is available locally and hashable.

The queue is evidence, not a target manifest. A mechanically eligible candidate can still fail semantic review. Review proceeds in a frozen bounded order: repositories follow pool order within each language family; candidates follow newest-first rank within a repository; review stops for that repository at the first acceptance; and review stops for that family after two repositories are accepted. Every candidate before a stop must be reviewed, while candidates after a stop must remain explicitly unreviewed. This stopping rule is fixed before any task is observed and cannot be changed after seeing review or Palace results.

## Task-diff coherence review

The frozen commit subject is the task. Every changed hunk receives one decision:

- `task-aligned`: directly implements, verifies, documents, or configures the stated task;
- `unrelated`: changes an independently meaningful behavior or operational concern not stated by the task; or
- `uncertain`: the relationship cannot be established confidently from the task, surrounding source, and diff.

Rules:

1. Every file and every hunk in each candidate reached by the frozen stopping rule must be reviewed exactly once.
2. A file is `task-aligned` only when every hunk in that file is task-aligned.
3. One `unrelated` or `uncertain` hunk rejects the entire target.
4. Partial oracle pruning is forbidden. Files cannot be removed to rescue a target.
5. Changelogs are aligned only when they describe the frozen task.
6. Configuration is aligned only when it is required to execute, verify, or ship the frozen task. Generic formatting, traceback, timeout, or CI cleanup is unrelated unless the task explicitly requests it.
7. Refactors mixed with an independent behavior change are rejected unless both are explicitly stated in the subject.
8. Generated output is eligible only when its owning generator source is also in the oracle and both sides are task-aligned. At most one selected target may use this exception.
9. The reviewer records a specific reason of at least 12 characters for every file and hunk.
10. Reviews for older candidates after the first acceptance, or later repositories after the language-family quota is filled, are forbidden.
11. Palace calls on candidate tasks before review finalization must equal zero.

The machine-enforced schema is implemented in `scripts/lib/task-diff-coherence.cjs`. It verifies packet hashes, complete hunk coverage, whole-target decisions, timing attestations, and the no-Palace condition.

## Reviewer limitation

The local study currently uses one developer-delegated semantic reviewer executed with Codex assistance plus machine completeness validation. This reviewer is not independent from product development. The study does not have two independent human reviewers and cannot report inter-rater agreement. Ambiguity is handled conservatively by rejection. These limitations must remain in the result report.

## Repository and language balance

- Eight selected targets.
- Exactly two each from JavaScript/TypeScript, Python, Go, and Rust.
- Four frozen primary/fallback repositories per family.
- All prior observed repositories recursively excluded.
- Frozen interleaved repository order.
- Rejected candidates and repositories remain in the audit trail with reasons.

## Static validation gate

Baseline and candidate receive identical route commits, tasks, budgets, route limits, and two deterministic repetitions. The absolute candidate gate requires:

- 8/8 completed targets;
- 8/8 deterministic routes;
- 8/8 task-type matches;
- 8/8 complete implementation and verification surfaces;
- all preregistered auxiliary surfaces complete;
- target-macro changed-file coverage at least 0.90;
- target-macro route focus at least 0.70;
- every target coverage at least 0.50;
- every target focus at least 0.40;
- zero overconfident trials against the core oracle;
- zero unsafe narrow modes;
- zero unsafe enforced stops;
- zero metric disagreements;
- zero evaluation/context route disagreements;
- no context payload above 6,000 estimated tokens; and
- no tracked target worktree changes.

No target tests execute during the static routing gate.

## Advancement rule

Only a valid, fresh, held-out Round 11 absolute pass can authorize a separately frozen end-to-end Agent A/B protocol. The disclosed Round 10 repairs and post-hoc sensitivity pass are supporting diagnostic evidence only.
