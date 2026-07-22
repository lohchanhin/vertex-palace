# Recursive Route Generalization Regression Protocol (0.4 Alpha)

## Research question

Does product candidate `716a6c4e2abb6432d59a17db14a940e90918fe2b` preserve the original external repository routes, distinguish an older research artifact family from its recursive successor, cover compound product repairs exactly, and reduce confidence when the named artifact family does not exist?

This is a preregistered **seen-target static routing regression**. It is not held-out evidence and is not an end-to-end Agent performance benchmark. It cannot support claims about Agent token savings or execution speed.

## Frozen implementation

- Product commit: `716a6c4e2abb6432d59a17db14a940e90918fe2b`
- Harness: `scripts/verify-recursive-route-generalization.cjs`
- Evidence destination: `docs/research/evidence/recursive-route-generalization-regression-0.4-alpha.json`
- The validation harness commit is the commit containing this protocol and is recorded automatically in the evidence.
- Product paths are compared byte-for-byte against the frozen product commit before and after the build.
- The evidence file is opened with create-only semantics. A second run cannot overwrite the first formal observation.

## Frozen targets

The external regression retains the same pinned Zod, Requests, and p-limit repositories, tasks, commits, changed-file oracles, and accepted route boundaries used in the earlier replication.

The candidate self-audit freezes seven additional targets before the formal run:

1. Original cross-repository artifact family, English.
2. Original cross-repository artifact family, Simplified Chinese.
3. Recursive post-self-audit artifact family, English.
4. Recursive post-self-audit artifact family, Simplified Chinese.
5. Seven-file generated-artifact freshness and compound routing repair.
6. Seven-file release-vocabulary action-classification repair.
7. A nonexistent Cobalt Harbor artifact family as a negative confidence control.

All task strings, changed files, accepted files, and thresholds are literal constants in the harness committed before execution.

## Fixed execution

- Two repetitions per target.
- Route limit: 9.
- Context budget: 6,000 estimated tokens.
- Maximum loaded drawers: 4.
- External repositories are fetched at pinned commits into isolated temporary directories.
- The candidate audit uses a detached clone of the frozen product commit.
- The built CLI is copied into the candidate clone as its declared ignored generated artifact.
- The candidate clone is explicitly initialized and indexed before its first target.
- Runs are sequential; no target is executed concurrently.

## Pass gates

- Every route is deterministic across both repetitions.
- Zod, Requests, and p-limit retain 1.00 changed-file coverage and 1.00 accepted-route precision.
- Both old-family and recursive-family language variants retain 1.00 changed-file coverage, route focus at least 0.85, no more than seven files, and 1.00 accepted-route precision.
- Both product repairs retain 1.00 changed-file coverage, 1.00 route focus, no more than seven files, and 1.00 accepted-route precision.
- The missing-family negative control retains 0.00 changed-file coverage and confidence no higher than 0.15; this is the expected safe behavior because its target files do not exist.
- No completed route is overconfident against observed coverage.
- Every adaptive context payload stays within 6,000 estimated tokens.
- Selected and excluded execution boundaries never overlap.
- Palace does not modify tracked files in any target repository.
- Candidate status is `stale: false` immediately after explicit indexing.

Any failed command, incomplete repetition, threshold miss, boundary violation, dirty tracked worktree, or non-deterministic route fails the study. Environment failures remain failures in the raw evidence and are not silently removed.

## Reporting rule

The first JSON observation will be preserved unchanged and hashed. English and Simplified Chinese result reports will distinguish:

- product validation from Agent performance;
- seen-target regression from held-out generalization;
- expected negative-control failure from erroneous high confidence;
- product failures from environment failures.

No favorable subset will replace the complete preregistered result.
