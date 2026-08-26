# Disclosed Round 11 Focus Repair Result (0.4 Alpha)

## Claim boundary

The frozen, candidate-held-out Round 11 result remains **FAILED** and immutable.
The prior owner-closure repair also remains a failed disclosed regression with a
macro route focus of 0.567. This focus repair was implemented only after those
eight targets and their route-only files had been inspected.

The new result is therefore **post-observation regression evidence, not held-out
generalization evidence**. It measures static route coverage, focus,
determinism, calibration, context bounds, and target-worktree cleanliness. It
does not establish Agent correctness, Token savings, fewer Agent tool calls, or
lower Agent wall time. Those claims still require a fresh, recursively
non-overlapping Round 12 followed by a separately preregistered Agent study.

## Result

The disclosed focus-repair gate **PASSED** without lowering any threshold:

- 8/8 targets completed and passed.
- 8/8 repeated routes were deterministic.
- 8/8 task classifications matched the frozen oracle.
- 8/8 targets retained complete implementation and test coverage.
- Macro changed-file coverage remained 1.000.
- Macro route focus increased from 0.567 to 0.701.
- Macro core-route focus increased from 0.546 to 0.670.
- Minimum target coverage remained 1.000; minimum target focus was 0.500.
- Maximum adaptive context was 3,802 estimated tokens under the unchanged
  6,000-token ceiling.
- Overconfident, unsafe-narrow, unsafe-enforced-stop, metric-disagreement,
  evaluate/context-disagreement, execution-error, and target-worktree-change
  counts were all zero.

The 0.701 result clears the preregistered 0.70 focus threshold by a narrow
margin. It must not be treated as robust external confirmation.

## Generic product changes

No repository name, target name, or frozen oracle path is hard-coded into the
router. The repair adds generic evidence rules for:

1. Counting a runtime implementation and its type declaration as one runtime
   API owner, while retaining the type test and public integration test.
2. Giving ordinary runtime tests a bounded evidence budget instead of retaining
   every lexically or relationally adjacent test.
3. Preserving explicitly plural regressions, distinct mock/search and
   utility/integration facets, versioned downstream effects, and causal siblings
   jointly exercised by the focused test.
4. Adding verification configuration only when the task explicitly requests a
   runner/config file or names that file.
5. Removing unrequested package/license metadata and weak single-token lexical
   candidates only after at least two stronger implementation anchors exist.
6. Leaving release routing outside these narrow implementation-task pruning
   rules because release work is intentionally multi-surface.

## Target comparison

| Target | Focus before | Focus after | Files before | Files after | Core coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| yup | 0.400 | 0.500 | 5 | 4 | 1.000 |
| marshmallow | 0.500 | 0.750 | 6 | 4 | 1.000 |
| arrayvec | 0.400 | 0.500 | 10 | 8 | 1.000 |
| node-fetch | 0.800 | 1.000 | 5 | 4 | 1.000 |
| jsonschema | 0.667 | 0.667 | 3 | 3 | 1.000 |
| go-sql-driver/mysql | 0.600 | 0.857 | 10 | 7 | 1.000 |
| itertools | 0.500 | 0.667 | 4 | 3 | 1.000 |
| pgx | 0.667 | 0.667 | 3 | 3 | 1.000 |

The repair removed duplicated runtime tests, unrequested verification config,
unrelated package/license metadata, and low-information test neighbors. It kept
all frozen implementation, test, and auxiliary files, including the marshmallow
changelog and the causal implementation siblings required by mysql and pgx.

## Engineering verification

- Router regressions: 93/93 passed.
- Core suite: 14 files and 212/212 tests passed.
- CLI and MCP suites: 2/2 and 2/2 tests passed.
- Research suite: 140/140 regular tests and 2/2 preserved Round 11 freeze
  tests passed.
- Full workspace TypeScript check passed.
- Full workspace and generated package/plugin bundles built successfully.
- MCP smoke passed for all 10 registered tools.
- The disclosed verifier cloned every fixed repository commit into a fresh
  temporary directory, rebuilt its Palace, and ran two sequential
  evaluate/context repetitions.
- All target repositories remained clean and every context payload remained
  below the frozen ceiling.

## Evidence integrity

- Target manifest SHA-256:
  `3174A480FE83E2B0D140262306C3ACADCA5C6BA0190165B1335C4AC3ED442ECE`
- Formal Round 11 SHA-256:
  `570C2AAA0F5A593466F4EAB5161897DADE310EB211ABE1F2647586B872797720`
- Owner-closure Attempt 3 SHA-256:
  `939741A55D47839D970D261F3D4E91BBAF1B190272FFE336150131A64EBD3A2E`
- Focus-repair verifier SHA-256:
  `1495AA3D515D6C591AC70972A980F1AE07F3A2D473A67B8F6301CD9EB72BC65B`
- Focus-repair Attempt 1 SHA-256:
  `6CC3EC6285324694B967FCCF49C57E263C20784B5DD6C2489512E92E6928F193`

Evidence files:

- [Frozen Round 11 result](evidence/local-blind-routing-validation-0.4-alpha-round-11-attempt-1.json)
- [Owner-closure Attempt 3](evidence/disclosed-routing-round-11-after-owner-closure-repair-attempt-3-0.4-alpha.json)
- [Focus-repair Attempt 1](evidence/disclosed-routing-round-11-after-focus-repair-attempt-1-0.4-alpha.json)

## Next research direction

The product repair is strong enough to justify freezing a new candidate, but
not to claim generalization. Round 12 must select new repositories and tasks
without reusing any Round 1-11 repository, issue, task wording, ground-truth
commit, or disclosed failure. Its selection, candidate hashes, thresholds, and
stop rules must be frozen before target outcomes are inspected.

Only if that fresh round passes should Vertex Palace proceed to a preregistered
Agent A/B study of correctness, delivered context, Agent tool calls, reported
tokens, and wall time.
