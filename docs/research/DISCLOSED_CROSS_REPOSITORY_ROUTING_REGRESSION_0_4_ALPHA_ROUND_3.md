# Disclosed Cross-Repository Routing Regression (0.4 Alpha, Round 3)

## Result

**Passed as a disclosed development regression, not as held-out evidence.**
Product candidate `efd53274e42fb8123745f2b8bb09a24e4fa384b7` routed the
exact Git-diff oracle for all eight disclosed repositories. All `16/16`
sequential trials passed, all eight route sets were deterministic, and macro
changed-file coverage, route focus, and route precision were `1.00`.

This result shows that the known Round 3 routing failures were repaired under
the recorded static protocol. It does not prove generalization, Agent
correctness, Token savings, lower wall time, or fewer tool calls. The original
Round 3 held-out study remains failed because this candidate was developed
after all eight tasks and oracles had been observed.

## Evidence Chain

No prior result was overwritten. The original held-out observations, the
incomplete first regression execution, and the successful rerun are separate
create-only artifacts.

| Stage | Candidate | Evidence class | Passed targets | Completed trials | Macro coverage | Macro focus | Macro precision | Overconfident trials | Route files |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Original Round 3 combined observation | `6060e0c` | preregistered held-out | 4/8 | 16/16 | 0.750 | 0.538 | 0.538 | 6 | 28 |
| Disclosed regression attempt 1 | `efd5327` | disclosed development | 7/8 | 14/16 | 1.000* | 1.000* | 1.000* | 0* | 14* |
| Complete disclosed regression | `efd5327` | disclosed development | 8/8 | 16/16 | 1.000 | 1.000 | 1.000 | 0 | 16 |

`*` Attempt 1 metrics cover only the seven completed targets. Pydantic did not
enter a route trial because its fresh `palace index` process exceeded the
180-second harness timeout. The old harness labeled that interruption
`product-or-protocol-failed`; stack location and a later successful fresh run
show that it was an indexing timeout, not a route assertion failure. The raw
artifact is retained without relabeling.

The route-file reduction from 28 to 16 describes the static selected boundary.
It must not be interpreted as an Agent file-read, Token, or time reduction.

## Frozen Artifacts

| Artifact | SHA-256 |
| --- | --- |
| `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3.json` | `7C1C0731008979D1DD3085EAEC86A43F277E3BFE588C86D43D5E11AFA5BD7EDF` |
| `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3-environment-recovery.json` | `E400C7C8AF72B10A18FAA51AED643EEEBC6F7A6DBF033C821C822A2E50719499` |
| `docs/research/evidence/disclosed-cross-repository-routing-0.4-alpha-round-3-regression-attempt-1-timeout.json` | `04A1AE84756717E2B4DD8139D349A93C8C67B43DAF0CCEC0014912E0E4A4DF5D` |
| `docs/research/evidence/disclosed-cross-repository-routing-0.4-alpha-round-3-regression.json` | `609F2664939B1CBDF30C9A0751A6219C8ED6BD9AC8081C095996BE9CC3016903` |
| `scripts/verify-disclosed-routing-round-3.cjs` | `B8B7245307C6906E0015E822528CF12E00913AE47ECBBC099CE7F53184E070B5` |

- Product candidate: `efd53274e42fb8123745f2b8bb09a24e4fa384b7`
- Evidence class: `disclosed-development-regression`
- Held out against this candidate: `false`
- CLI SHA-256 recorded by the successful run:
  `E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0`

The harness used a fresh clone per repository, checked out each fixed route
commit, recomputed the changed-file oracle from the fixed ground-truth commit,
indexed explicitly, ran two sequential evaluations, checked exact route
membership, and verified a clean tracked worktree. It allowed retries only for
`EAGAIN`, `ENOMEM`, and `ETIMEDOUT`, recording every attempt. The successful
complete run used no retry.

## Final Aggregate

| Targets | Passed | Trials | Task-type matches | Deterministic targets | Oracle files | Route files | Macro coverage | Macro focus | Macro precision | Max context |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 8 | 16/16 | 16/16 | 8/8 | 16 | 16 | 1.00 | 1.00 | 1.00 | 4,844 |

Fourteen trials were conservatively classified as underconfident and two as
well-calibrated. No trial was overconfident. The maximum context value only
shows compliance with the 6,000-token protocol ceiling.

## Target Comparison

| Target | Before coverage / focus | After coverage / focus | Final task type | Final exact route |
| --- | ---: | ---: | --- | --- |
| Koa | 0.00 / 0.00 | 1.00 / 1.00 | bugfix | `lib/response.js`; `__tests__/application/response.test.js` |
| Starlette | 0.50 / 0.33 | 1.00 / 1.00 | feature | `starlette/requests.py`; `tests/test_requests.py` |
| Gin | 1.00 / 1.00 | 1.00 / 1.00 | bugfix | `context.go`; `context_test.go` |
| Tower | 0.50 / 0.25 | 1.00 / 1.00 | bugfix | `tower/src/balance/p2c/service.rs`; `tower/src/balance/p2c/test.rs` |
| Axios | 1.00 / 1.00 | 1.00 / 1.00 | bugfix | `lib/helpers/progressEventReducer.js`; `tests/unit/helpers/progressEventReducer.test.js` |
| Echo | 1.00 / 1.00 | 1.00 / 1.00 | bugfix | `middleware/static.go`; `middleware/static_test.go` |
| serde_json | 1.00 / 0.50 | 1.00 / 1.00 | feature | `src/raw.rs`; `tests/test.rs` |
| Pydantic | 1.00 / 0.22 | 1.00 / 1.00 | feature | `pydantic/networks.py`; `tests/test_networks.py` |

Confidence remained conservative: Koa `0.31`, Starlette `0.77`, Gin `0.75`,
Tower `0.85`, Axios `0.84`, Echo `0.61`, serde_json `0.69`, and Pydantic
`0.73`. The two trials per target returned the same route, confidence, and
calibration status.

## General Mechanisms Added

1. Bounded imperative feature verbs such as `Allow` classify a task as a
   feature without becoming strong file identities.
2. Explicit code identities, including dotted receivers such as
   `Request.cookies`, are retained as routing evidence.
3. Documentation files cannot masquerade as implementation candidates merely
   because their parser emits code-like symbols.
4. Receiver, outcome, test-title, and path evidence distinguish request-side
   from response-side behavior.
5. Colocated module tests and mirrored `__tests__` paths can outrank broad
   integration tests when they match the selected implementation.
6. Version scope is aligned across implementation and test selection. An
   explicit v1 task may select v1 files; an unversioned task prefers the
   current module.
7. Evidence-sufficient stopping applies to feature and strong unknown tasks;
   `routeLimit` is a ceiling rather than a quota.
8. Confidence is capped when implementation-test relationships are absent or
   ambiguous.

No production rule contains a repository name, target commit, or target-only
path.

## Indexing Warning

The first regression execution stopped while freshly indexing Pydantic after
the process exceeded 180 seconds. In the complete rerun, the same fresh index
took `127.940` seconds and both route trials then passed. A separate diagnostic
evaluation on an already indexed checkout took `8.778` seconds.

This separates route correctness from an operational limitation: large Python
repository indexing is still slow and sensitive to machine load. The rerun is
valid for correctness, but it does not erase the timeout or authorize a speed
claim. Index profiling and incremental-index validation remain required.

## Remaining Limitation

A post-change Vertex Palace self-evaluation over the five actual product files
matched three files: changed-file coverage and focus were both `0.60`.
`analyze-task.ts` and the generated plugin bundle were omitted. That diagnostic
was broad disclosed development work, not a formal target, but it shows that
exact focused repository routes do not yet guarantee complete recall for
compound, generated-artifact product changes.

The completed research stage exposed the same limitation more strongly.
Route `route_d5fcbc3583b09f8a` matched `2/7` actual files, with changed-file
coverage `0.29`, route focus `0.22`, confidence `0.59`, and an overconfident
calibration. It preferred six older Round 2/3 harnesses plus the current
harness, the incomplete evidence file, and an unrelated telemetry test. It
missed the successful evidence, both current reports, their integrity test, and
`package.json`.

This recursive self-audit is recorded rather than tuned immediately. Optimizing
repeatedly against each newly written report would turn the repository's own
artifact names into development answers and would not establish
generalization.

Palace therefore remains advisory. Current code, tests, Git diff, build output,
and runtime evidence continue to outrank the route.

## Promotion Decision

The candidate passes the Round 3 disclosed-regression gate. It does not advance
directly to Agent A/B and it does not retroactively pass Round 3.

The next gate must mechanically select and preregister a fourth repository pool
before any candidate task is routed or inspected. Candidate commit, task list,
Git oracle, harness, retry policy, and promotion thresholds must be frozen
first. Only a passing untouched static-routing result may authorize sequential
Control, Adaptive, and Full Palace Agent experiments.
