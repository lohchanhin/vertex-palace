# Local Blind Routing Round 19 Queue Stability Result (0.4 Alpha)

## Result

Attempt 1 inspected 31/32 repositories and stopped with a local Git inspection
error on `memchr`. Attempt 2 used the identical frozen source, pool, selector,
order, and rules and completed 32/32 repositories with 99 mechanical candidates.
Candidate-task Palace calls remained 0 in both attempts.

The `memchr` command was independently repeated against the same pinned history
and returned exit code 0 with the same commit message. Attempt 2 scanned 279
`memchr` commits and found zero eligible candidates. The first failure is thus
classified as a non-reproducible transient local Git inspection failure, not a
candidate-selection or product result.

## Determinism Check

For the 31 repositories inspected in both attempts, the following all matched:

- candidate IDs and newest-first ranks;
- route and ground-truth commits;
- changed files, implementation/test surfaces, and complete diff hunks;
- rejection counts; and
- scanned commit counts.

There were zero semantic mismatches. Both attempts produced the same total of 99
candidates because `memchr` contributed none.

## Disclosed Limitation

The coherence packet hash includes the queue run's `generatedAt` timestamp.
Equivalent packet content therefore has a different `packetSha256` across runs.
Round 19 binds attempt 2's exact bytes and hashes for review, so target identity
and order remain fixed; however, byte-for-byte rerun reproducibility is weaker
than intended. This harness defect must be repaired after the first Round 19
result is preserved, without rewriting this evidence.
