# Held-out Cross-repository Routing Result (0.4 Alpha, Round 7)

## Verdict

**Failed.** The frozen candidate did not meet the preregistered Round 7 static
routing gates.

Raw evidence:
`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-7.json`

Evidence SHA-256:
`C53C9186853F1661158212604804261C8394781454A7C7B7DF15811D4E42D7B9`

## Aggregate Result

| Metric | Result | Gate |
| --- | ---: | ---: |
| Passed targets | 2 / 8 | 8 / 8 |
| Completed trials | 16 / 16 | 16 / 16 |
| Deterministic targets | 8 / 8 | 8 / 8 |
| Task-type matched targets | 6 / 8 | 8 / 8 |
| Core-surface complete targets | 3 / 8 | 8 / 8 |
| Auxiliary-surface complete targets | 0 / 2 | 2 / 2 |
| Exact-oracle targets | 2 / 8 | descriptive |
| Macro changed-file coverage | 0.557 | >= 0.90 |
| Macro route focus | 0.480 | >= 0.75 |
| Macro route precision | 0.481 | >= 0.75 |
| Minimum target focus | 0.000 | >= 0.50 |
| Minimum target precision | 0.000 | >= 0.50 |
| Overconfident trials | 4 | 0 |
| Maximum context payload | 3,453 tokens | <= 6,000 |

There were no environment, setup, or harness-contract failures. Every target
completed both trials, and every route was identical across repetitions. The
failure is therefore classified as product or routing-contract behavior, not an
environment artifact.

## Target Results

| Target | Family | Status | First-trial coverage | Focus | Main issue |
| --- | --- | --- | ---: | ---: | --- |
| execa | JavaScript/TypeScript | failed | 0.00 | 0.00 | wrong semantic anchor and `Fixes` classified as unknown |
| jinja | Python | failed | 0.33 | 0.20 | test found; implementation and changelog missed |
| go-multierror | Go | passed | 1.00 | 1.00 | exact implementation/test route |
| thiserror | Rust | failed | 0.50 | 0.50 | test found; implementation missed and `Avoid` classified as feature |
| node-glob | JavaScript/TypeScript | passed | 1.00 | 1.00 | exact implementation/test route |
| httpcore | Python | failed | 0.80 | 0.44 | all core files found; changelog missed and five extras added |
| httprouter | Go | failed | 0.50 | 0.50 | implementation found; wrong test counterpart selected |
| mio | Rust | failed | 0.33 | 0.20 | platform internals selected instead of TCP stream implementation/test |

The two passing targets were also the only exact-oracle routes. Determinism did
not rescue the failed routes: the candidate repeated the same wrong or incomplete
route twice.

## What the Result Establishes

1. The Round 4 disclosed regression success did not generalize to this untouched
   Round 7 sample.
2. Product task classification is inconsistent with the frozen research
   classifier: `Fixes ...` became `unknown`, and `Avoid ...` became `feature`
   instead of `bugfix`.
3. Lexical relevance can dominate the actual change surface. Execa routed to
   generic escape/argument files, while Mio routed to selector internals.
4. Path-derived test pairing is not reliable enough. Httprouter selected
   `router_test.go` instead of the direct `tree_test.go` counterpart.
5. Indirect implementation paths remain weak. Jinja and Thiserror found focused
   tests but missed the implementation modules those tests exercise.
6. Bounded documentation/configuration support is absent in this sample: both
   changelog oracle files were missed.
7. Confidence remains unsafe in some zero or low-coverage routes: four trials
   were overconfident.

## What the Result Does Not Establish

- It does not measure Agent implementation correctness.
- It does not execute target repository tests.
- It does not show Token, tool-call, or wall-time savings.
- The two repetitions are a determinism check, not independent samples.
- The repositories are candidate-held-out, not guaranteed model-unseen.

## Evidence-supported Repair Direction

The Round 7 tasks are now disclosed. Any repair uses a separately named
disclosed regression and cannot change this held-out result.

The next product work should proceed in this order:

1. Align product task classification with tested base and inflected behavioral
   prefixes, including `Fixes`, `Avoid`, and `Prevent` families.
2. Strengthen direct implementation/test counterpart pairing before adding
   generic neighboring tests.
3. Require a stronger task-concept anchor and competing-anchor margin before
   high confidence; zero-coverage lexical routes must not remain at 0.75 or 0.86.
4. Add bounded causal expansion from a focused test or macro surface to the
   implementation it exercises, without restoring broad repository scanning.
5. Model release-note/configuration surfaces explicitly and measure the focus
   cost rather than injecting every document into every route.
6. Re-run all eight Round 7 tasks only as a disclosed regression, preserve the
   original evidence hash, and report both recall gains and extra-file cost.
