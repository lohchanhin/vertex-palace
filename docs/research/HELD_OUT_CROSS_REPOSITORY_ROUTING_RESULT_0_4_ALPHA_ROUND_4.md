# Held-out Cross-Repository Routing Result (0.4 Alpha, Round 4)

## Decision

**Failed. Do not advance candidate `efd5327` to Agent A/B.**

The first preregistered observation completed all eight repositories and all
`16/16` sequential trials. Only two targets passed their per-target gates.
Macro changed-file coverage was `0.521`; macro route focus and precision were
both `0.375`. Six trials were overconfident.

There were no materialization, index, harness, or other environment failures.
All eight route sets were deterministic. The result is therefore a product
routing failure, not an incomplete or environment-censored study.

## Frozen Evidence

| Artifact | Commit / SHA-256 |
| --- | --- |
| Product candidate | `efd53274e42fb8123745f2b8bb09a24e4fa384b7` |
| Selector | `96af578295484831e4a14511baf0e88cb69cc081` |
| Target manifest | `7ccf0c7d668f4a9790186ba4659a76fd4a30813d` |
| Validation harness | `8b8badf3c7e30aa123174a9ebba1ab027705b184` |
| Raw evidence commit | `02dff13605e00a822fe87caf58d171af8807bab0` |
| Manifest SHA-256 | `D6A1DDCDA3BD704D1F809279229153F72B4CF6162F1C1231C40D36F18626F5C0` |
| Harness SHA-256 | `9C768BA266F9421FEF1C9275C7BBB4AB8ED1AE3424D1B333049652A4D17AD5D2` |
| Raw evidence SHA-256 | `7B8E3833A71D60645DF134D8B87ADF49EAA5557EE59A6AB6D64A537C8A3BB5D3` |

- Evidence class: `preregistered-candidate-held-out-static-routing`
- Palace calls on selected tasks before validation: `0`
- Product rebuild before measurement: `false`
- Candidate CLI SHA-256:
  `E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0`

The repository pool, order, fallback behavior, commit-selection rule, manifest,
candidate, thresholds, retry policy, and validation harness were committed
before the first Palace call on a selected task.

## Aggregate Result

| Metric | Result | Gate |
| --- | ---: | ---: |
| Targets passed | 2/8 | 8/8 |
| Completed trials | 16/16 | 16/16 |
| Task-type matched targets | 8/8 | 8/8 |
| Core-surface complete targets | 3/8 | 8/8 |
| Exact-oracle targets | 1/8 | reported only |
| Macro changed-file coverage | 0.521 | >= 0.900 |
| Macro route focus | 0.375 | >= 0.750 |
| Macro route precision | 0.375 | >= 0.750 |
| Minimum target focus / precision | 0.000 / 0.000 | >= 0.500 / 0.500 |
| Overconfident trials | 6 | 0 |
| Deterministic targets | 8/8 | 8/8 |
| Oracle files / first-route files | 24 / 34 | reported only |
| Maximum context | 5,891 | <= 6,000 |
| Environment / harness failures | 0 / 0 | 0 / 0 |

The candidate passed task classification, completion, determinism, cleanliness,
and context-ceiling checks. It failed every route-quality promotion gate.

## Target Results

Values are identical across each target's two repetitions.

| Target | Result | Coverage | Focus | Precision | Confidence | Calibration | Route files | Main observation |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Undici | passed | 1.00 | 0.60 | 0.60 | 0.40 | underconfident | 5 | Found all three oracle files plus two related cache files. |
| aiohttp | failed | 1.00 | 0.33 | 0.333 | 0.72 | underconfident | 6 | Found the exact pair but added four parser, cookie, and auth files. |
| validator | failed | 0.00 | 0.00 | 0.000 | 0.40 | overconfident | 2 | Chose root translations and Russian tests instead of the English module pair. |
| tracing | failed | 0.00 | 0.00 | 0.000 | 0.84 | overconfident | 2 | Chose the `tracing` crate rather than the `tracing-attributes` workspace crate. |
| MSW | failed | 0.50 | 0.40 | 0.400 | 0.40 | well-calibrated | 5 | Found two cookie implementation files but missed `RequestHandler` and the request mock. |
| Uvicorn | passed | 1.00 | 1.00 | 1.000 | 0.49 | underconfident | 2 | The only exact implementation/test route. |
| GORM | failed | 0.00 | 0.00 | 0.000 | 0.40 | overconfident | 9 | Anchored on clauses and workflows; missed all rows-close implementation and test files. |
| Reqwest | failed | 0.67 | 0.67 | 0.667 | 0.40 | underconfident | 3 | Found `connect.rs` and `tests/client.rs`, but replaced `tls.rs` with `async_impl/client.rs`. |

## What Generalized

1. Task classification transferred to all eight unobserved tasks, including
   conventional and natural imperative subjects.
2. Routes were deterministic in order and membership across all repetitions.
3. Uvicorn's local implementation/test typo repair produced an exact route.
4. Undici's wider cache change retained every oracle file while staying above
   the preregistered focus threshold.
5. Every context remained below the 6,000-token ceiling.
6. Palace changed no tracked target file.

These are useful component results, but they do not offset the failed
promotion gates.

## Failure Mechanisms

### Locale And Directory Scope

`English translations` did not bind strongly enough to `translations/en/`.
Validator selected a root translation file and `translations/ru/ru_test.go`.
The router needs bounded locale and path-segment identity, not repository-name
rules.

### Workspace Package Identity

Tracing contains related `tracing` and `tracing-attributes` crates. The task's
`instrument field names` concept belongs to the attribute macro crate, but the
route anchored on the public tracing crate. Workspace package boundaries,
imports, macro ownership, and test location need stronger joint evidence.

### Multi-file Causal Boundaries

MSW, GORM, and Reqwest each required multiple implementation files. The router
found a plausible local anchor but did not recover the complete causal change
boundary:

- MSW missed request-handler usage and a request-side mock.
- GORM missed all callback and finisher files and instead filled nine slots
  with clause tests and two `.github` workflows.
- Reqwest missed the explicit TLS implementation sibling.

File similarity alone is not enough. Import, call, workspace, test, and
same-identity relations must determine whether an implementation sibling is
required.

### Evidence-sufficient Stopping

aiohttp already contained the exact implementation/test pair, but four weaker
files remained in the route. The stopping rule still fails when a highly
specific function identity coexists with generic parser and cookie concepts.

### Path Noise

GORM selected `.github/workflows/invalid_question.yml` and
`missing_playground.yml` for a source bugfix. Non-product operational metadata
must not enter a focused code route without explicit task evidence.

### Confidence Calibration

Validator, tracing, and GORM returned zero oracle coverage in both repetitions,
yet confidence was `0.40`, `0.84`, and `0.40`. Missing locale, workspace, and
implementation/test relationship evidence must lower confidence before a route
is presented as sufficient.

## Oracle Limitation

The oracle is the complete modified-file Git diff, and implementation/test
roles are path-derived. Undici's `test/cache-interceptor/utils.js` and MSW's
`request-cookies.mocks.ts` may be test support rather than independent
assertion files. The study did not execute target tests.

This limitation can make complete changed-file recall stricter than the minimum
files an Agent would need. It does not explain validator, tracing, or GORM,
which missed all oracle files, and it does not justify changing the frozen
result.

## Product Direction

The eight Round 4 tasks are now disclosed development data. A successor should
use repository-agnostic mechanisms only:

1. model locale aliases and meaningful path segments as bounded scope evidence;
2. distinguish workspace packages and crate/module ownership before selecting
   same-named roots;
3. expand implementation siblings through imports, calls, shared identities,
   and matched tests rather than broad lexical similarity;
4. exclude `.github` and other operational metadata from focused code routes
   unless explicitly requested;
5. stop after a strong implementation/test boundary when weaker candidates add
   no independent task evidence;
6. cap confidence when locale, workspace, or multi-file relationships remain
   unresolved;
7. preserve every previously passing Round 2 and Round 3 regression while
   adding these eight failures as disclosed fixtures.

After repair, the candidate must pass disclosed regression only. Another
mechanically selected untouched pool is required before Agent A/B. Reusing
Round 4 as a held-out gate would be invalid.

## Claim Boundary

Round 4 is candidate-held-out static routing evidence. It is not model-unseen
evidence, did not run target tests, and does not measure final Agent
correctness, reported Tokens, tool calls, or wall time.

No performance, release, npm, or Agent A/B claim is authorized by this result.
