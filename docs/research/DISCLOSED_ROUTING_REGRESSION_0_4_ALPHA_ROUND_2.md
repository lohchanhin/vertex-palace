# Disclosed Routing Regression Result (0.4 Alpha, Round 2)

## Result

**Passed as a seen development regression, not as held-out evidence.** Product candidate `6060e0c6aa2aea64d0145c1e55bccdc4669e4b48` routed the exact Git-diff oracle on all six disclosed repositories. All `12/12` sequential trials completed with macro changed-file coverage, route focus, and route precision of `1.00`.

This result proves that the known Round 2 failures were corrected under the frozen static protocol. It does not prove generalization, final Agent correctness, Token savings, or wall-time improvement. Express, HTTPX, urfave/cli, Clap, Commander, and pytest are now development data and must not be reused as held-out evidence.

## Evidence Chain

No raw observation was overwritten. The progression is preserved as four create-only records:

| Stage | Candidate | Evidence class | Passed targets | Macro coverage | Macro focus | Macro precision | Overconfident trials |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Original Round 2 study | `0ef19a7` | preregistered held-out | 0/6 | 0.667 | 0.183 | 0.185 | 4 |
| First disclosed repair | `aed6ce6` | seen development | 3/6 | 0.805 | 0.533 | 0.533 | 4 |
| Real-index repair | `83d7da5` | seen development | 4/6 | 0.862 | 0.917 | 0.917 | 2 |
| Duplicate-module repair | `6060e0c` | seen development | 6/6 | 1.000 | 1.000 | 1.000 | 0 |

The intermediate `4/6` result is important. Express, Commander, and pytest were repaired, but HTTPX selected the wrong same-named test module and Clap lost a second implementation file. The final mechanisms fixed those regressions without removing the earlier failures from the record.

## Frozen Artifacts

| Artifact | SHA-256 |
| --- | --- |
| `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-2.json` | `F6F31375C3C300F32C25063AFC493DD536CDC1A96748199C557772A5275DE438` |
| `docs/research/evidence/disclosed-routing-regression-0.4-alpha-round-2.json` | `726AAF4B1942E73E85B130685489961D4BBD4F2239CDE36C505CE3A23D4B4D22` |
| `docs/research/evidence/disclosed-routing-regression-0.4-alpha-round-2-after-real-index-repair.json` | `3FBD22B751498A1A1D50AB286982F8083FA786EBFA20DDC9E0341BC7A4BB70BE` |
| `docs/research/evidence/disclosed-routing-regression-0.4-alpha-round-2-after-duplicate-module-repair.json` | `22E08D3D98998058FB2530B88508C9427AB71112D8E8328FE7722EE780770EC6` |

- Final product commit: `6060e0c6aa2aea64d0145c1e55bccdc4669e4b48`
- Final validation harness commit: `e8d06c83e6eb548d91e8e1af7bf7f4da8ce6b816`
- Final raw evidence commit: `165630a`
- Evidence class: `seen-development-regression`
- `heldOutAgainstCandidate`: `false`

The harness used fresh pinned clones, verified the unedited commit subject, parent relationship, changed-file diff oracle, fresh index, and clean tracked worktree, then ran two sequential repetitions per target.

## Final Aggregate

| Targets | Passed | Completed trials | Core-complete targets | Macro coverage | Macro focus | Macro precision | Overconfident trials | Max context | Setup/harness failures |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 6 | 12/12 | 6/6 | 1.00 | 1.00 | 1.00 | 0 | 5,485 | 0 |

Routes were deterministic across repetitions. Every context remained below the 6,000-token ceiling, every repository was fresh after explicit indexing, Palace changed no tracked repository files, and selected and excluded context boundaries did not overlap.

## Exact Final Routes

| Repository | Exact route | Confidence | Calibration |
| --- | --- | ---: | --- |
| Express | `lib/request.js`; `test/req.acceptsCharsets.js` | 0.40 | underconfident |
| HTTPX | `httpx/_auth.py`; `tests/test_auth.py` | 0.71 | underconfident |
| urfave/cli | `completion.go`; `completion_test.go` | 0.56 | underconfident |
| Clap | `clap_complete/src/engine/complete.rs`; `clap_complete/src/engine/custom.rs`; `clap_complete/tests/testsuite/engine.rs` | 0.81 | underconfident |
| Commander | `lib/command.js`; `tests/command.executableSubcommand.mock.test.js`; `tests/command.executableSubcommand.search.test.js` | 0.71 | underconfident |
| pytest | `src/_pytest/main.py`; `testing/test_conftest.py` | 0.68 | underconfident |

All six routes had coverage, focus, and precision of `1.00`. The conservative scores are safer than the earlier zero-coverage overconfidence, but they still require calibration on untouched observations.

## General Mechanisms Added

1. JavaScript and TypeScript file summaries index literal test and suite titles, including wrapped test calls.
2. Lexical normalization maps deduplication variants to one task concept without injecting memory or pitfall intent.
3. Morphological words such as `re-collection` are not misclassified as named code entities.
4. File-level evidence groups physical symbols only when they share primary task or entity evidence.
5. Implementation and test evidence are role-aware: primary actions rank implementations, while stated outcomes help select tests.
6. Additional tests must provide independent task or entity evidence; route limit remains a ceiling rather than a quota.
7. Explicit task concepts, not analyzer-expanded hints, determine whether a related implementation covers most of the task.
8. `refresh token` no longer injects index freshness, and positional `index` no longer injects `stale` or `fresh`.
9. Duplicate mirrored test modules are disambiguated structurally only when multiple same-module candidates compete, preserving stronger semantic tests such as Click's `test_utils.py`.
10. Sibling implementations may be retained when the selected test and both implementations share the same explicit compound code identity, such as `ValueCompleter`.
11. Confidence is capped when direct identity, relation evidence, or anchor margin is weak.

No production rule contains a repository name, commit hash, or target-specific path.

## Remaining Limitation

Development self-evaluation still exposes weak broad-task recall. One eight-file repair route matched `5/8` changed files and missed the parser, parser test, and generated MCP bundle. A later four-file follow-up matched `2/4` and missed the router test and generated bundle. These diagnostics were not formal held-out gates, but they show that exact focused routing does not yet imply complete multi-surface routing for compound product work.

Palace therefore remains advisory. Current code, tests, Git diff, build output, and runtime evidence must continue to authorize scope expansion.

## Interpretation Limits

- The final six repositories were inspected during repair and cannot measure generalization.
- Two repetitions establish deterministic behavior for this observation, not population reliability.
- The Git diff is a reproducible oracle, but an unedited commit subject may not describe every changed file equally well.
- Static route size and context payload do not measure final Agent correctness, reported Tokens, wall time, or tool calls.
- The 5,485-token maximum only proves compliance with the context ceiling.
- No Agent Token-saving, speed, or release claim is authorized by this result.

## Promotion Decision

The candidate passes the Round 2 disclosed-regression gate but does not advance directly to Agent A/B testing. The next required gate is a mechanically selected and preregistered third repository pool that remains untouched until the candidate, task list, oracle, and harness are frozen.

Only after that pool passes the same coverage, focus, precision, determinism, calibration, cleanliness, and context-boundary gates should the project run sequential Control, Adaptive, and Full Palace Agent experiments.
