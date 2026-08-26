# Local Blind Routing Target Selection Protocol (0.4 Alpha, Round 18)

## Status and Lineage

The Round 18 repository plan is locally frozen before any Round 18 HEAD query.
It follows the preserved Round 17 invalid-URL failure, which occurred before
history or product exposure and therefore produced no Vertex Palace result.

The plan recursively excludes 190 repository identities: all 178 observed
through Round 16 plus the 12 Round 17 HEAD-query attempts. It reuses only the 20
Round 17 repositories that were never queried and adds 12 fresh repositories
before any network operation. This is a local tamper-evident protocol, not
public preregistration. Competition materials remain frozen: no commit, push,
tag, npm publication, or submitted-material edit is allowed.

## Fixed Design

- 32 repositories in binding interleaved order.
- Eight each for JavaScript/TypeScript, Python, Go, and Rust.
- Two accepted targets per family and eight targets in total.
- Remaining repositories are fallbacks; a family stops after two acceptances.
- Every rejection and every infrastructure failure remains in the audit trail.
- Palace calls on candidate tasks remain zero until semantic review is frozen.

The larger fallback capacity responds only to Round 16 mechanical infeasibility.
It does not lower the final quota or any product gate.

## Pre-Pool Boundary

Before the canonical pool exists, the only permitted network command is:

```text
git ls-remote <repository-url> HEAD
```

No clone, fetch, history inspection, subject or diff read, task construction,
semantic review, oracle construction, or candidate Palace call is permitted.
The freezer writes canonical outputs create-only and, on failure, must instead
write a create-only failure record containing the completed attempts and exact
diagnostic. It may not replace a failed repository inside this frozen round.

## Candidate Selection

After source, CLI, generated MCP, selectors, protocols, integrity tests, and the
comparison baseline are frozen by SHA-256:

1. inspect at most 300 non-merge commits per repository;
2. retain at most five mechanically eligible candidates, newest first;
3. require one parent, a 20-to-180-character behavioral subject, 2-8 modified
   existing files, at least one implementation file and one focused test, no
   more than two auxiliary files, and 2-400 changed lines;
4. materialize the complete unified-zero diff and hunk-addressed review packet;
5. classify every hunk as task-aligned, unrelated, or uncertain;
6. reject the whole target if any hunk is unrelated or uncertain;
7. forbid partial oracle pruning; and
8. accept the newest coherent candidate, respecting repository and family stop
   boundaries.

Generated output is eligible only with its owning generator in the same oracle,
and at most one generated-artifact target is allowed.

## Review Limitation

One developer-delegated reviewer uses Codex assistance plus machine completeness
validation. There is no independent second reviewer or inter-rater agreement.
Ambiguity must be rejected. Machine checks establish packet completeness and
ordering, not semantic truth.

## Absolute Static Gate

The frozen candidate must achieve all of the following:

- 8/8 completed deterministic targets;
- 8/8 task-type matches;
- 8/8 complete implementation and focused-verification surfaces;
- all frozen execution-required auxiliary surfaces complete;
- macro changed-file coverage >= 0.90;
- macro route focus >= 0.70;
- per-target coverage >= 0.50 and focus >= 0.40;
- zero overconfident trials;
- zero unsafe narrow modes or enforced stops;
- zero context/evaluation route or metric disagreement;
- every context payload <= 6,000 estimated Tokens; and
- zero tracked target-worktree changes.

Only auxiliary files frozen as necessary to execute or verify a task count as
required. Historical-diff recall cannot force generic documentation into a
product route. Relative improvement over public 0.3.0 cannot override failure
of this absolute gate.

## Advancement Rule

Only a valid fresh Round 18 absolute pass may authorize a separately frozen v5
Agent A/B study using new issues and trial IDs. A failure remains immutable and
must drive repository-agnostic product repair. This static study cannot establish
Agent correctness, Token savings, fewer tool calls, or lower wall time.
