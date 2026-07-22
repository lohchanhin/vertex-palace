# Artifact-Intent Bilingual Follow-up Result (0.4 Alpha)

## Result

**Passed.** Candidate `0b6a0fd92f43a74c983663cd32f937087e3ec923` passed every preregistered gate and may advance to held-out routing validation.

This result does not establish end-to-end Agent correctness, token savings, or speed improvements. It is a seen-target static routing regression and candidate self-audit.

## Frozen Evidence

- Protocol and harness commit: `9537ccc84ba678183024aa5a90dde96427231b52`
- Raw evidence commit: `f05069e64f1f002eddf5bda095b543cc0a772951`
- Evidence: `docs/research/evidence/artifact-intent-bilingual-followup-0.4-alpha.json`
- SHA-256: `4FE1A2C5BF9FCF5E0F2A70E993104099782BC61A30A02A373E8833892350ECB8`
- Formal run count: one create-only observation

## Aggregate Results

| Set | Targets | Completed trials | Passed targets | Coverage | Focus | Accepted precision | Overconfident | Max context |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| External seen repositories | 3 | 6/6 | 3/3 | 1.00 | 0.89 | 1.00 | 0 | 2,277 |
| Candidate audit, all targets | 9 | 18/18 | 9/9 | 0.778 | 0.716 | 1.00 | 0 | 5,481 |
| Candidate positive targets only | 7 | 14/14 | 7/7 | 1.00 | 0.92 | 1.00 | 0 | 5,481 |

The all-target candidate coverage and focus include two negative controls whose preregistered correct result is zero changed-file coverage. Their zero values therefore lower the raw macro averages without indicating a miss.

## Candidate Targets

| Target | Coverage | Focus | Confidence | Files | Context | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Original family, English | 1.00 | 0.86 | 0.75 | 7 | 4,828 | Pass |
| Original family, Simplified Chinese | 1.00 | 0.86 | 0.75 | 7 | 4,796 | Pass |
| Recursive family, English | 1.00 | 0.86 | 0.83 | 7 | 5,481 | Pass |
| Recursive family, Simplified Chinese | 1.00 | 0.86 | 0.79 | 7 | 3,781 | Pass |
| Compound product repair | 1.00 | 1.00 | 0.86 | 7 | 3,492 | Pass |
| Release-vocabulary product repair | 1.00 | 1.00 | 0.84 | 7 | 4,618 | Pass |
| Current named-artifact product repair | 1.00 | 1.00 | 0.75 | 4 | 2,857 | Pass |
| Missing family, English | 0.00 expected | 0.00 expected | 0.15 | 7 | 3,349 | Pass |
| Missing family, Simplified Chinese | 0.00 expected | 0.00 expected | 0.15 | 7 | 4,804 | Pass |

All routes were identical across their two sequential repetitions. Candidate status was fresh immediately after explicit indexing, selected and excluded boundaries did not overlap, and no tracked product file changed during validation.

## What Changed From the Failed Regression

The preceding candidate selected the older cross-repository artifact family for the exact Simplified Chinese post-self-audit task. It produced zero changed-file coverage, zero focus, and confidence 0.77.

The frozen follow-up candidate produced:

- Changed-file coverage: `0.00 -> 1.00`
- Route focus: `0.00 -> 0.86`
- Confidence: `0.77 -> 0.79`, now supported by complete observed coverage
- Selected family: old cross-repository family -> exact post-self-audit family

The repair orders explicit technical identities from the task ahead of semantically derived scope aliases. It also separates language mentions from documentation intent, favors the focused router regression for routing repairs, and stops multi-surface bugfix expansion after requested roles are satisfied.

## Interpretation

The follow-up supports four narrow conclusions:

1. The exact bilingual failure is repaired deterministically.
2. English and older artifact-family routes did not regress.
3. Product-repair routes retained complete, focused implementation, test, and generated-bundle coverage.
4. Missing English and Simplified Chinese families no longer receive unsupported high confidence.

## Limitations

- All routing targets were previously observed; this is not held-out evidence.
- The external repository set is unchanged from earlier replication work.
- The experiment measures static route and context behavior, not Agent task completion.
- Artifact-family routes still use seven files, including one accepted configuration file.
- The largest candidate context was 5,481 estimated tokens, below but relatively close to the 6,000-token ceiling.

## Decision

Promote `0b6a0fd92f43a74c983663cd32f937087e3ec923` to a new, preregistered held-out cross-repository routing study. Do not publish 0.4 or claim performance improvement from this result alone.

