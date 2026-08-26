# Local Blind Routing Target Selection Protocol (0.4 Alpha, Round 16)

## Status

The 16-repository URL-and-HEAD-only repository pool is locally frozen. Target
selection has not started and is authorized only by a matching create-only
candidate-freeze manifest. No Round 16 repository history, candidate task,
diff, oracle, or Palace result was inspected before the pool freeze.

This is a tamper-evident local protocol, not public preregistration. The
competition freeze still forbids commit, push, tag, npm publication, and edits
to submitted materials.

## Why Round 16 Exists

The completed real-repository v4 Agent study rejected a general benefit claim
for Vertex Palace 0.3.0: Adaptive achieved strict success in 3/16 arms and
Control in 11/16. Later static rounds exposed generic routing failures and
Round 13-15 repaired research-family composition, evidence closure, and
confidence calibration, but those repairs were observed on known or synthetic
tasks.

Round 16 is a fresh static confirmation gate for the local 0.4 candidate. It
must pass before any v5 Agent A/B study is designed or executed.

## Research Question

On fresh, task-coherent real-history changes, can the frozen 0.4 candidate
recover the required implementation and focused verification evidence without
irrelevant route expansion, unsafe stopping, or unjustified confidence?

The priority is binding:

1. task-type correctness;
2. implementation and focused-verification completeness;
3. changed-file coverage and route focus;
4. confidence calibration and safe advisory mode behavior;
5. bounded delivered context;
6. static command time.

Payload reduction cannot compensate for missing required evidence.

## Independence Boundary

The Round 16 plan recursively excludes all 161 repositories in the Round 12
static-routing chain and separately excludes Open WebUI, which was observed by
the v4 Agent study but was not in that chain. The pre-pool exclusion count is
therefore 162.

Before the pool freeze, the only allowed network operation is:

```text
git ls-remote <repository-url> HEAD
```

No clone, fetch, history walk, subject read, diff read, task construction,
semantic review, oracle construction, or Palace call on a candidate task is
allowed before the URL-and-HEAD pool exists.

## Repository Balance

- 16 repositories in binding interleaved order.
- Four repositories each for JavaScript/TypeScript, Python, Go, and Rust.
- Two accepted targets per language family; later repositories are fallbacks.
- Eight selected targets in total.
- Every rejection remains in the audit trail.

Repository popularity is not an outcome. Repository names were selected only
after checking the prior exclusion set; no Round 16 task content was used.

## Candidate Selection

After candidate source, CLI, generated MCP, selectors, protocols, integrity
tests, and the comparison baseline are frozen by SHA-256:

1. inspect at most 300 non-merge commits per repository;
2. retain at most five mechanically eligible candidates, newest first;
3. require one parent, a 20-to-180-character behavioral subject, 2-8 modified
   existing files, at least one implementation file and one focused test, no
   more than two auxiliary files, and 2-400 changed lines;
4. materialize a complete unified-zero diff and hunk-addressed review packet;
5. classify every hunk as task-aligned, unrelated, or uncertain;
6. reject the whole target when any hunk is unrelated or uncertain;
7. forbid partial oracle pruning;
8. stop at the newest accepted candidate and then at the family quota.

One unrelated or uncertain hunk rejects the whole target. Partial oracle
pruning is forbidden. Palace calls on candidate tasks must remain zero until
review finalization. Review stops for a repository at its first acceptance and
for a language family after two accepted repositories.

Generated output is eligible only when its owning generator is in the same
oracle, with at most one generated-artifact target in the study.

## Reviewer Limitation

The study uses one developer-delegated semantic reviewer with Codex assistance
plus machine completeness validation. The reviewer is not independent from
product development, and no second independent human reviewer or inter-rater
agreement is available. Ambiguity must be rejected conservatively. Machine
validation proves packet completeness and ordering, not semantic truth.

## Frozen Static Gate

The absolute candidate gate will require:

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

Only a valid fresh Round 16 absolute pass may authorize a separately frozen v5
Agent A/B protocol with new issue identities and trial IDs. Failure must remain
immutable and must lead to repository-agnostic product work derived from the
failure classes. Round 13-15 post-observation results cannot substitute for
fresh confirmation.

No result from this static study can establish Agent correctness, Token
savings, fewer tool calls, or lower wall time.
