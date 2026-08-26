# Local Blind Routing Target Selection Protocol (0.4 Alpha, Round 17)

## Status

The 32-repository URL plan is locally frozen before any Round 17 HEAD query.
The repository pool, target selection, and static validation have not started.
They are authorized only by matching create-only freeze manifests and integrity
tests. No Round 17 history, commit subject, diff, task, semantic review, oracle,
or Palace result has been inspected.

This is a tamper-evident local protocol, not public preregistration. The
competition freeze still forbids commit, push, tag, npm publication, and edits
to submitted materials.

## Why Round 17 Exists

Round 16 stopped before semantic review because its frozen four-repository
fallback quota produced mechanically eligible candidates in only one of four
Rust repositories. That result is preserved and cannot be rewritten. It says
nothing about product quality, but it proves that the target-selection protocol
was too brittle to fill the fixed two-target-per-family quota.

Round 17 changes only the pre-exposure fallback capacity: eight repositories
per language family instead of four. The final sample remains eight targets,
two per family, and every product-quality gate remains unchanged. The larger
pool was fixed before any Round 17 HEAD query or task content was seen.

The completed real-repository v4 Agent study remains the product baseline:
Adaptive achieved strict success in 3/16 arms and Control in 11/16. Round 17 is
a fresh static confirmation gate for the local 0.4 candidate, not evidence of
Agent correctness or efficiency by itself.

## Research Question

On fresh, task-coherent real-history changes, can the frozen 0.4 candidate
recover the required implementation and focused verification evidence without
irrelevant route expansion, unsafe stopping, or unjustified confidence?

The priority is binding:

1. task-type correctness;
2. implementation and focused-verification completeness;
3. changed-file coverage and route focus;
4. confidence calibration and safe advisory behavior;
5. bounded delivered context;
6. static command time.

Payload reduction cannot compensate for missing required evidence.

## Independence Boundary

The plan recursively excludes all 178 repositories observed through Round 16.
Before the repository pool is frozen, the only allowed network operation is:

```text
git ls-remote <repository-url> HEAD
```

No clone, fetch, history walk, subject read, diff read, task construction,
semantic review, oracle construction, or Palace call on a candidate task is
allowed before the URL-and-HEAD pool exists.

## Repository Balance

- 32 repositories in binding interleaved order.
- Eight repositories each for JavaScript/TypeScript, Python, Go, and Rust.
- Two accepted targets per family; later repositories are fallbacks.
- Eight selected targets in total.
- Every attempted repository and rejection remains in the audit trail.
- The selection stops for a family as soon as its two-target quota is filled.

Repository popularity is not an outcome. Names were selected only after the
recursive exclusion check; no Round 17 task content was used.

## Candidate Selection

After candidate source, CLI, generated MCP, selectors, protocols, integrity
tests, and comparison baseline are frozen by SHA-256:

1. inspect at most 300 non-merge commits per repository;
2. retain at most five mechanically eligible candidates, newest first;
3. require one parent, a 20-to-180-character behavioral subject, 2-8 modified
   existing files, at least one implementation file and one focused test, no
   more than two auxiliary files, and 2-400 changed lines;
4. materialize a complete unified-zero diff and hunk-addressed review packet;
5. classify every hunk as task-aligned, unrelated, or uncertain;
6. reject the whole target when any hunk is unrelated or uncertain;
7. forbid partial oracle pruning;
8. accept the newest coherent candidate per repository; and
9. stop at the repository acceptance and family quota boundaries.

Palace calls on candidate tasks must remain zero until semantic review is
finalized. Generated output is eligible only when its owning generator is in
the same oracle, with at most one generated-artifact target in the study.

## Reviewer Limitation

The study uses one developer-delegated semantic reviewer with Codex assistance
plus machine completeness validation. The reviewer is not independent from
product development, and no second human reviewer or inter-rater agreement is
available. Ambiguity must be rejected conservatively. Machine validation proves
packet completeness and ordering, not semantic truth.

## Frozen Static Gate

The absolute candidate gate requires:

- 8/8 completed and deterministic targets;
- 8/8 task-type matches;
- 8/8 complete implementation and focused-verification surfaces;
- all preregistered execution-required auxiliary surfaces complete;
- macro changed-file coverage at least 0.90;
- macro route focus at least 0.70;
- every target coverage at least 0.50 and focus at least 0.40;
- zero overconfident trials;
- zero unsafe narrow modes and unsafe enforced stops;
- zero context/evaluation route disagreement and metric disagreement;
- no context payload above 6,000 estimated Tokens; and
- no tracked target-worktree changes.

Auxiliary documentation or changelog files count only when the frozen semantic
review marks them necessary to execute or verify the task. Historical-diff
recall cannot force generic documentation into a product route.

The public 0.3.0 product is a descriptive baseline. Relative improvement over
that baseline cannot override failure of the absolute gate.

## Advancement Rule

Only a valid fresh Round 17 absolute pass may authorize a separately frozen v5
Agent A/B protocol with new issue identities and trial IDs. Failure must remain
immutable and lead to repository-agnostic product work derived from the failure
classes. Round 13-15 post-observation repairs and the Round 16 selection failure
cannot substitute for fresh confirmation.

This static study cannot establish Agent correctness, Token savings, fewer tool
calls, or lower wall time.
