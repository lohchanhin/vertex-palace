# Local Blind Routing Target Selection Protocol (0.4 Alpha, Round 19)

## Status

The ordered 48-repository reachability roster is locally frozen before any
Round 19 HEAD query. It recursively excludes 194 identities attempted through
Round 18, reuses only 28 never-queried Round 18 entries, and adds 20 fresh
locally exclusion-checked entries. No Round 19 history, task, diff, oracle, or
Palace result has been inspected.

This is a tamper-evident local protocol, not public preregistration. Competition
materials remain frozen: no commit, push, tag, npm publication, or submitted-
material edit is allowed.

## Reachability Roster

Rounds 17 and 18 proved that aborting an entire study for one definitively
missing legacy URL is unnecessarily brittle. Round 19 separates infrastructure
reachability from product-quality selection:

- 48 frozen URLs, 12 per language family, in binding interleaved order;
- query every URL only with `git ls-remote <url> HEAD`;
- record every reachable HEAD and every definitively missing URL;
- mechanically select the first eight reachable repositories per family;
- never substitute or reorder after seeing a result;
- abort on transient network exhaustion or fewer than eight reachable entries
  in any family; and
- inspect no history or task content until the canonical 32-repository pool is
  written create-only.

URL reachability cannot enter any Vertex Palace performance claim.

## Candidate Selection

After candidate source, CLI, generated MCP, selectors, protocols, integrity
tests, and comparison baseline are frozen by SHA-256:

1. inspect at most 300 non-merge commits per repository;
2. retain at most five mechanically eligible candidates, newest first;
3. require one parent, a 20-to-180-character behavioral subject, 2-8 modified
   existing files, at least one implementation and one focused test, at most two
   auxiliary files, and 2-400 changed lines;
4. materialize complete unified-zero diffs and hunk-addressed review packets;
5. classify every hunk as task-aligned, unrelated, or uncertain;
6. reject the whole target for any unrelated or uncertain hunk;
7. forbid partial oracle pruning; and
8. accept the newest coherent candidate while obeying repository and family
   stop boundaries.

Two targets per JavaScript/TypeScript, Python, Go, and Rust family are required,
for eight total. Palace calls on candidate tasks stay at zero until semantic
review is frozen. Generated output requires its owning generator in the same
oracle, with at most one generated-artifact target.

## Review Limitation

One developer-delegated reviewer uses Codex assistance plus machine completeness
validation. There is no independent second reviewer or inter-rater agreement.
Ambiguity is rejected. Machine checks prove completeness and ordering, not
semantic truth.

## Absolute Static Gate

The frozen candidate must achieve all of the following:

- 8/8 deterministic completed targets and task-type matches;
- 8/8 complete implementation and focused-verification surfaces;
- every frozen execution-required auxiliary surface complete;
- macro changed-file coverage >= 0.90 and macro route focus >= 0.70;
- per-target coverage >= 0.50 and focus >= 0.40;
- zero overconfidence, unsafe narrow modes, or unsafe enforced stops;
- zero context/evaluation route or metric disagreement;
- every context payload <= 6,000 estimated Tokens; and
- zero tracked target-worktree changes.

Only auxiliary files frozen as necessary to execute or verify the task count as
required. Relative improvement over public 0.3.0 cannot override absolute-gate
failure.

## Advancement

Only a fresh Round 19 absolute pass may authorize a separately frozen v5 Agent
A/B study with new issue identities and trial IDs. Failure remains immutable and
drives repository-agnostic product repair. This static study cannot establish
Agent correctness, Token savings, fewer tool calls, or lower wall time.
