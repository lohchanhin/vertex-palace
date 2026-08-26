# Compositional Routing Three-Level Repair Result (0.4 Alpha)

## Status

This local candidate repaired three concrete routing defects found during the latest disclosed repository replay. The final 13-file replay selected exactly all 13 target files with no route-only files.

This is a post-observation self-audit. It does not replace a fresh held-out validation and does not change the immutable Round 19 result.

## Three levels

### Level 1: correctness

`status` was incorrectly normalized to `statu`, so an explicit storage-status implementation could be omitted. The lexical normalizer now preserves `status`, maps `statuses` to `status`, and has a regression test.

### Level 2: compositional recall and focus

Loose proximity matching treated historical `disclosed` research tests as explicitly requested regressions. This consumed slots needed by the lexical test and current verifier. Routing concepts could also allocate more than one implementation slot to the same router concern.

The repair now:

- gives concepts named before `regressions`, `tests`, or `specs` stronger evidence;
- derives direct-test quotas from those explicit concepts when present;
- stops direct-test filling before the reserved verifier slot;
- deduplicates implementation concern families while preserving separately requested planner and scorer work;
- prefers the exact current verifier over historical test artifacts.

### Level 3: compatibility and hygiene

The first repair collapsed `release-routing.test.ts` into the same concept as `router.test.ts`. Explicit compound test-module names are now retained as distinct identities. Temporary diagnostic hooks were removed before verification.

## Measured progression

| Replay stage | Matched | Coverage | Focus |
| --- | ---: | ---: | ---: |
| Initial fully specified replay | 7/13 | 0.538 | 0.538 |
| First compositional repair | 10/13 | 0.769 | 0.769 |
| Three-level repair | 13/13 | 1.000 | 1.000 |

Final evaluation: `evaluation_ba1298508358a555`, route `route_ef67d062c299c495`.

## Verification

- Focused regressions: passed.
- Core: 15 test files, 234/234 tests passed.
- Full workspace and generated CLI/MCP build: passed.
- Final real-repository replay: 13/13 changed files, zero misses, zero route-only files.

## Limits

- The replay is disclosed and post-observation, not held out.
- A separate self-evaluation using an abstract summary of this repair matched only 3/8 local change files (`coverage 0.375`, `focus 0.5`). It omitted lexical files and the newly named report family, so route quality remains sensitive to task specificity.
- Confidence remains conservative at `0.4`, producing an underconfident calibration result despite complete observed coverage.
- The reported repository-to-pack reduction is payload accounting. It is not evidence of lower end-to-end agent tokens or wall time.
- Public competition artifacts remain frozen. No commit, push, tag, release, npm publish, Devpost edit, or video edit was performed.
