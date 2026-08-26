# Local Blind Routing Target Selection Protocol (0.4 Alpha, Round 12)

## Status

**Selection protocol and URL-and-HEAD-only repository pool are locally frozen; target selection has not started.** No Round 12 repository history, candidate task, diff, coherence review, oracle, or Palace result was inspected before the pool was written. Execution is authorized only by a matching create-only candidate-freeze manifest.

The competition-result freeze still forbids commits and pushes. Candidate identity and protocol therefore use local SHA-256 binding. This is tamper-evident local preregistration, not public preregistration.

## Why Round 12 Exists

Round 11 found better changed-file recall but failed the absolute gate. Three generic repairs were then evaluated only on disclosed Round 11 targets: ownership closure, public API contract closure, and evidence-budget pruning. The final disclosed focus repair reached complete core coverage on all eight known targets and macro focus 0.701, but those targets had already influenced development.

Round 12 is the first fresh confirmation attempt for that post-Round-11 candidate. Every repository observed in the complete Round 1-11 exclusion chain is recursively excluded.

## Research Question

On fresh repositories and task-coherent real-history changes, can the frozen post-Round-11 focus-repair candidate recover complete implementation, focused verification, and bounded auxiliary evidence while keeping routes focused, confidence calibrated, mode selection safe, and delivered context under 6,000 estimated Tokens?

The fixed priority is:

1. task-type correctness;
2. implementation and verification coverage;
3. changed-file coverage and route focus;
4. confidence calibration and safe mode selection;
5. delivered payload;
6. static command time.

Payload reduction cannot compensate for missing required evidence.

## Independence Sequence

The order is binding:

1. Finish product changes and regression verification.
2. Freeze a URL-and-HEAD-only pool that recursively excludes all 145 repositories observed before Round 12, without fetching history.
3. Freeze candidate source, CLI, generated MCP, protocols, pool, selectors, coherence machinery, and integrity tests by SHA-256.
4. Mechanically materialize an ordered candidate queue without invoking Palace.
5. Generate create-only hunk-addressed coherence packets.
6. Review candidates in frozen stopping order without seeing Palace route, pack, confidence, or mode output.
7. Reject a complete target when any hunk is unrelated or uncertain.
8. Select the newest accepted candidate per repository and the first two accepted repositories per language family.
9. Freeze the target manifest, reviews, validation protocol, validator, and all hashes.
10. Only then run baseline and candidate static validation.

Product source cannot change between steps 2 and 10. If it changes, Round 12 must restart with a new pool and attempt identifier.

## Mechanical Candidate Queue

At most 300 non-merge commits may be inspected per repository and at most five mechanically eligible candidates retained, newest first. Eligibility requires:

1. exactly one available parent;
2. an unedited 20-to-180-character behavioral subject classified by the frozen classifier;
3. 2 to 8 modified existing files, with no additions, deletions, or renames;
4. at least one primary-language implementation file and one focused verification file;
5. no more than two documentation or configuration files;
6. 2 to 400 changed lines;
7. every oracle file exists in both parent and selected commit; and
8. a complete hashable unified-zero diff.

Repositories follow frozen interleaved order. Candidates follow newest-first rank. Review stops for a repository at its first acceptance and for a language family after two accepted repositories. Later candidates and repositories must remain explicitly unreviewed.

## Task-Diff Coherence Review

The frozen commit subject is the task. Every changed hunk is classified exactly once as `task-aligned`, `unrelated`, or `uncertain`.

1. Every file and hunk reached by the stopping rule must be reviewed.
2. A file is aligned only when all its hunks are aligned.
3. One unrelated or uncertain hunk rejects the whole target.
4. Partial oracle pruning is forbidden.
5. Documentation and configuration count only when required by the stated task.
6. Generated output is eligible only with its owning generator in the oracle; at most one selected target may use this exception.
7. Every file and hunk requires a specific reason of at least 12 characters.
8. Palace calls on candidate tasks must remain zero until review finalization.

The machine schema in `scripts/lib/task-diff-coherence.cjs` validates hashes, hunk completeness, whole-target decisions, timing attestations, and the no-Palace condition.

## Reviewer Limitation

The study uses one developer-delegated semantic reviewer with Codex assistance plus machine completeness validation. The reviewer is not independent from product development; no second independent human reviewer or inter-rater agreement is available. Ambiguity is rejected conservatively, and this limitation must remain in the result report.

## Repository Balance

- Eight selected targets.
- Exactly two each from JavaScript/TypeScript, Python, Go, and Rust.
- Four primary/fallback repositories per family.
- All 145 prior observed repositories recursively excluded.
- Frozen interleaved repository order.
- Rejections remain in the audit trail.

## Static Validation Gate

Baseline and candidate receive identical tasks, commits, limits, and two deterministic repetitions. The candidate gate requires:

- 8/8 completed and deterministic targets;
- 8/8 task-type matches;
- 8/8 complete implementation and focused-verification surfaces;
- all preregistered auxiliary surfaces complete;
- macro changed-file coverage at least 0.90;
- macro route focus at least 0.70;
- every target coverage at least 0.50 and focus at least 0.40;
- zero overconfident trials, unsafe narrow modes, unsafe enforced stops, metric disagreements, and evaluation/context route disagreements;
- no context payload above 6,000 estimated Tokens; and
- no tracked target-worktree changes.

No target tests or coding Agent execute during the static gate.

## Advancement Rule

Only a valid fresh Round 12 absolute pass may authorize a separately frozen end-to-end Agent A/B study. Disclosed Round 11 repairs remain diagnostic evidence and cannot substitute for this confirmation.
