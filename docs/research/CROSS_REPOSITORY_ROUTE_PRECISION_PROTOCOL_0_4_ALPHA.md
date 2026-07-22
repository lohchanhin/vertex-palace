# Cross-Repository Route Precision Protocol 0.4 Alpha

Status: preregistered replication protocol. No candidate result had been observed when these gates were written.

## Question

Does the role-first 0.4 Alpha routing candidate preserve complete target-file recall and a bounded route outside the Vertex Palace repository?

## Candidate Freeze

- Product commit: `b6ff88fc126800a799973447f5ce6b37b925a6a3`.
- Candidate source, package, build configuration, and generated MCP paths are checked against that commit before and after build.
- CLI: the locally built `dist/palace.cjs` from the frozen product files.
- The protocol and harness may have a later commit; they cannot change the frozen product files.

## Repository Set

This is a replication set, not held-out validation. All three targets were used by earlier Vertex Palace studies. Reusing them provides a strict regression check across languages and repository sizes, but cannot estimate performance on unseen repositories.

| Repository | Route commit | Oracle | Accepted route boundary |
| --- | --- | --- | --- |
| Zod | `912f0f51b0ced654d0069741e7160834dca742ee` | Core v4 schema plus focused discriminated-union test | Exactly those two files |
| Requests | `f361ead047be5cb873174218582f7d8b9fcd9f49` | Sessions implementation plus focused request tests | Exactly those two files |
| p-limit | `c944e4a4363ff41a7202d5dec346cc174c3ecf49` | Real diff to `ccb80b2721a6a4a27ce5ad7721fe939162a35b31` | Declaration, type test, and package manifest only |

The repository, commit, task, changed files, and accepted boundary are frozen in `scripts/verify-route-precision-cross-repositories.cjs`.

## Execution

- Clone each pinned repository into a new OS temporary directory.
- Run two sequential evaluation repetitions: cold index, then warm index.
- Run adaptive `palace context` with the same task after each evaluation. Because evaluation performs indexing first, both context calls use the refreshed warm index; the report labels these states separately.
- Budget: 6,000 estimated input tokens.
- Route limit: 9 files.
- Maximum loaded drawers: 4.
- Do not modify tracked target-repository files.

## Gates

Every repository must satisfy every gate:

1. Changed-file coverage is exactly `1.00` in both repetitions.
2. Every routed file is inside the frozen accepted boundary.
3. The two repetitions return the same route-file set.
4. No trial is labeled overconfident against observed changed-file coverage.
5. Adaptive context stays at or below 6,000 estimated tokens.
6. Selected and excluded boundaries do not overlap.
7. The tracked target worktree remains clean.
8. For p-limit, the live Git diff must still equal the frozen real-history oracle.

Failures remain part of the record. A failing repository cannot be removed or replaced after the first run.
The harness records command, parse, and partial-trial failures in the JSON evidence instead of discarding the whole run.
The evidence path is required and uses create-only writes. A retry must use a new path, so the first observation cannot be overwritten.

## Claims Allowed

A pass supports only cross-repository static routing compatibility on this previously seen replication set. Timing fields are diagnostic because cold and warm phases are asymmetric. The study does not establish held-out generalization, lower Agent Token usage, lower wall time, or higher task success.

## Next Gate

After this replication, select and preregister at least one repository and real-history task that have not appeared in Vertex Palace implementation, tests, or research evidence. Only then begin held-out static validation and later randomized Agent trials.
