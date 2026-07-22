# Held-out Cross-Repository Routing Result (0.4 Alpha, Round 2)

## Result

**Failed.** Frozen candidate `0ef19a7bbef1901d813b81389405f87482db47c5` passed none of the six mechanically selected targets. It must not advance to the Control versus Adaptive Agent study.

All `12/12` preregistered trials completed. There were no environment, repository setup, manifest, or harness-contract failures. The result is therefore a product-routing and classification failure under the frozen protocol.

These six repositories and tasks are now disclosed development data. They cannot be reused as held-out evidence for a tuned successor.

## Frozen Evidence

- Product candidate: `0ef19a7bbef1901d813b81389405f87482db47c5`
- Selector and selection protocol commit: `0f3a8bc13c9de670cc4f3caf880f3bfb6b744bc2`
- Target manifest commit: `4dfdf420fe56d397946e6f7920528697f1cd9629`
- Manifest SHA-256: `694BF80DDB45A381F19FCA993674A71EA5BA78EB963258E3A2675C416D3B09A8`
- Validation protocol and harness commit: `eb529b416d05560003dff480d30b81e8293eab73`
- Raw evidence commit: `237a173bfd474e31a35f5beac5d829c69d82f995`
- Raw evidence: `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-2.json`
- Raw evidence SHA-256: `F6F31375C3C300F32C25063AFC493DD536CDC1A96748199C557772A5275DE438`
- Evidence class: `preregistered-held-out-static-routing`
- Formal run count: one create-only observation

The validation protocol recorded the task-type clarification before any selected task was routed. No target was removed, replaced, or rewritten.

## Aggregate

| Targets | Passed | Completed trials | Core-complete targets | Macro coverage | Macro focus | Macro precision | Overconfident trials | Max context | Setup/harness failures |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 0 | 12/12 | 4/6 | 0.667 | 0.183 | 0.185 | 4 | 3,784 | 0 |

Every route was deterministic across both repetitions. Every repository was fresh after explicit indexing, remained clean in tracked Git state, stayed below the 6,000-token context ceiling, and had no selected/excluded boundary overlap.

## Target Results

| Repository | Core coverage | Changed-file coverage | Focus | Precision | Confidence | Route files | Main failure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Express | 1.00 | 1.00 | 0.22 | 0.222 | 0.78 | 9 | Correct pair plus seven siblings |
| HTTPX | 1.00 | 1.00 | 0.22 | 0.222 | 0.74 | 9 | Correct pair plus seven auth/client siblings |
| urfave/cli | 0.00 | 0.00 | 0.00 | 0.000 | 0.68 | 2 | Wrong focused pair: `help.go` and `help_test.go`; overconfident |
| Clap | 1.00 | 1.00 | 0.33 | 0.333 | 0.74 | 9 | Correct three files plus six siblings; task type `unknown` |
| Commander | 1.00 | 1.00 | 0.33 | 0.333 | 0.72 | 9 | Correct three files plus six siblings |
| pytest | 0.00 | 0.00 | 0.00 | 0.000 | 0.76 | 9 | Missed both core files; overconfident |

## What The Routes Did

### Express

Palace found both `lib/request.js` and `test/req.acceptsCharsets.js`. It then filled the remaining route slots with other request acceptance tests and unrelated request/response tests. Core recall was correct, but the route limit still behaved like a quota for this task.

### HTTPX

Palace found `httpx/_auth.py` and `tests/test_auth.py`, then added seven broad auth, client, API, and property files. The task was observable enough to identify the exact pair, yet no general evidence-sufficiency stop fired after that pair was found.

### urfave/cli

The task asked for deterministic completion-subcommand order in help output. Palace stopped early at `help.go` and `help_test.go`, missing `completion.go` and `completion_test.go`. This is the inverse of the route-quota problem: early stopping worked mechanically, but the selected anchor was wrong. The phrase `help output` outweighed the more specific completion-subcommand concept. Confidence `0.68` at zero coverage was overconfident in both trials.

### Clap

Palace found all three changed files: two completion-engine implementations and the engine testsuite. It still filled nine slots with other completion, builder, and multiple-value files. Separately, `feat(complete): Index-aware ValueCompleter` was classified as `unknown`, showing that scoped Conventional Commit syntax is not handled consistently.

### Commander

Palace found `lib/command.js` and both executable-subcommand tests, then added typings, an example, and four unrelated command tests. Multi-file recall was complete, but focus and precision remained `0.33`.

### pytest

Palace routed toward hooks, JUnit, generic fixtures, Python collection, monkeypatch, doctest, and reports. It missed both `src/_pytest/main.py` and `testing/test_conftest.py`. The task's specific Directory re-collection and fixture-identity relationship was diluted into broad fixture and collection concepts. Confidence `0.76` at zero coverage was overconfident in both trials.

## Main Findings

1. **Known-pair repair did not generalize to a general stop rule.** Four targets achieved complete core recall, but every one still filled all nine route slots.
2. **Route limit remains a quota outside the narrow bounded-bugfix path.** The previous repair improved four seen cases but did not cover feature tasks or broader bugfix evidence patterns.
3. **Early stopping needs anchor validation.** urfave/cli returned only two files, but they were the wrong implementation-test pair.
4. **Specific task concepts can lose to broad presentation concepts.** `completion subcommand` lost to `help output`; `Directory re-collection` and `fixture identity` dissolved into generic pytest fixture files.
5. **Confidence is not tied strongly enough to direct identity or anchor margin.** Zero-coverage routes still received `0.68` and `0.76`.
6. **Scoped Conventional Commit syntax is incomplete.** `feat(complete):` became `unknown` instead of `feature`.
7. **The validation environment was sound.** All trials completed, indexes were fresh, tracked worktrees stayed clean, telemetry normalized correctly, and context remained bounded.

The second pool has a higher macro coverage than the first held-out pool (`0.667` versus `0.50`), but the tasks and repositories differ. This is not a controlled before/after comparison and must not be described as measured improvement.

## Interpretation Limits

- Six targets remain a small sample, even though they cover JavaScript/TypeScript, Python, Go, and Rust.
- The oracle is the complete Git diff associated with an unedited commit subject; task observability varies.
- Static route failure rejects promotion but does not directly measure final Agent task correctness.
- Route payload and context size do not establish Agent Token savings, speed, or tool-call reduction.
- Timing in the evidence is diagnostic only.

## Promotion Decision

Candidate `0ef19a7` is rejected for Agent A/B. The next development candidate should address general mechanisms without target-specific repository names or paths:

1. apply evidence-sufficiency stopping to feature and general multi-surface routes, not only focused bugfixes;
2. validate a focused pair against specific task concepts and competing-anchor score margins before early stop;
3. make completion, collection, directory, fixture-identity, and scoped-symbol relations preserve compound intent instead of broad individual words;
4. recognize scoped Conventional Commit forms such as `feat(scope):` and `fix(scope):`;
5. calibrate confidence from direct implementation/test identity, relation evidence, requested-surface coverage, and anchor ambiguity;
6. keep zero-direct-evidence routes below the sufficiency threshold;
7. add all six disclosed tasks as development regressions, then require a third untouched, preregistered pool before Agent A/B.

No performance or release claim is authorized by this result.
