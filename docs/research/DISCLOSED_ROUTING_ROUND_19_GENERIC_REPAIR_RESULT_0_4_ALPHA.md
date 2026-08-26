# Disclosed Round 19 Generic Repair Result (0.4 Alpha)

Status: three completed post-observation static replays. The generic repair
improved core routing substantially, but the full disclosed gate remains
**FAILED**.

## Claim Boundary

The formal Round 19 candidate result remains failed and immutable. Its SHA-256
is `84A37CFE029977CF22594A66DA2F9769F4703AE641FD43647C76AA8469EB383B`.

These replays reused all eight already observed tasks after product development.
They are not held out, did not run target tests or an Agent, and cannot establish
Agent correctness, Token savings, tool-call reduction, or wall-time improvement.
A fresh frozen repository round is required for new generalization evidence.

## Generic Repairs

1. Bounded lexical morphology maps unambiguous forms such as `cloning -> clone`
   without broad stemming that corrupts words such as `missing` or `parsing`.
2. Relative CommonJS package-root imports resolve through the package's declared
   entry point, so `require('..')` links a root test to its implementation.
3. A package-boundary implementation can close to one unambiguous conventional
   root integration test without widening every package entry into the seed set.
4. Long fallback-parser symbols preserve compound literals from their full body.
   This made a late `neon-vfpv4` literal visible as `neon vfpv4` evidence.
5. Route-specific concept normalization maps `parser` and `parsing` to `parse`
   without broadening the shared lexical stemmer.
6. Diagnostic feature tasks can stop at a causal implementation closure only
   when an exact identity test, two task-named implementation modules, a causal
   relation, and the requested diagnostic behavior are all present.

## Replay Progression

| Metric | Formal candidate | Attempt 1 | Attempt 2 | Attempt 3 |
| --- | ---: | ---: | ---: | ---: |
| Completed targets | 8/8 | 8/8 | 8/8 | 8/8 |
| Deterministic targets | 8/8 | 8/8 | 8/8 | 8/8 |
| Core implementation/test complete | 4/8 | 7/8 | 7/8 | 7/8 |
| Target-macro changed-file coverage | 0.667 | 0.896 | 0.896 | 0.896 |
| Target-macro route focus | 0.484 | 0.724 | 0.708 | 0.771 |
| Minimum target coverage | 0.000 | 0.500 | 0.500 | 0.500 |
| Total route files | 30 | 29 | 27 | 25 |
| Overconfident trials | 2 | 2 | 2 | 2 |

Attempt 1 established the generic package, lexical, verification, and
long-symbol repairs. Attempt 2 reduced the `semver` route from eight files to
four, but a broad task-named-module preference regressed `cc-rs` from two files
to four. Attempt 3 narrowed that preference to diagnostic feature tasks: it kept
the four-file `semver` route and restored the exact two-file `cc-rs` route.

The final replay crossed the `0.70` macro-focus threshold. It still missed the
`0.90` changed-file threshold by `0.004`, and two trials remained overconfident.
Those failures must not be hidden by rounding or unsupported file injection.

## Final Target Map

| Target | Formal coverage/focus | Attempt 3 coverage/focus | Main result |
| --- | ---: | ---: | --- |
| `cors` | 0.333 / 0.500 | 0.667 / 1.000 | Exact core pair; unrequested `HISTORY.md` remains absent. |
| `hoek` | 0.000 / 0.000 | 1.000 / 0.667 | Clone implementation and focused test recovered; package boundary remains support. |
| `jaraco-path` | 1.000 / 0.250 | 1.000 / 0.250 | Broad task text still causes repository-config support fan-out. |
| `iniconfig` | 1.000 / 1.000 | 1.000 / 1.000 | Exact route retained. |
| `pretty` | 1.000 / 1.000 | 1.000 / 1.000 | Exact route retained. |
| `groupcache` | 0.500 / 0.500 | 0.500 / 0.500 | Generic comment task does not identify the nested owner statically. |
| `semver` | 1.000 / 0.375 | 1.000 / 0.750 | Exact parser, error, public contract, and Version test closure recovered. |
| `cc-rs` | 0.500 / 0.250 | 1.000 / 1.000 | Exact `src/lib.rs` plus `tests/test.rs` route retained. |

## Remaining Boundaries

- `groupcache` is not evidence for a repository-specific hardcode. The task says
  only that function comments should follow Effective Go and does not identify
  `consistenthash`; selecting that future diff from the parent state is
  underdetermined.
- `cors` is not evidence for adding every changelog to every bugfix. The task
  identifies runtime behavior, but not release-note bookkeeping. Core confidence
  and full-diff confidence need separate contracts.
- `jaraco-path` shows the next tractable product problem: after core closure,
  repository configuration and weak transitive support should move to Deferred
  when they contribute no new intent or causal evidence.
- The static metrics assess route overlap and focus only. They do not show that a
  routed Agent produces a correct patch faster or with fewer Tokens.

## Verification

- Core test suite: `15` files, `233/233` tests passed.
- Focused routing regressions: `5/5` passed.
- Workspace build, bundled MCP build, and packaged CLI build passed.
- Final disclosed replay: `8/8` targets and `16/16` trials completed; all routes
  were deterministic, target worktrees remained clean, and independently
  recomputed metrics agreed with product output.
- Historical Round 19 evidence remains immutable and separately hash-locked.

Machine-readable evidence:

- [`attempt-1`](evidence/disclosed-routing-round-19-after-generic-repair-attempt-1-0.4-alpha.json), SHA-256 `580018913112BAD1D251E99DBCBFE4A953B2ED33E990783D5F653747BA53D6B2`
- [`attempt-2`](evidence/disclosed-routing-round-19-after-generic-repair-attempt-2-0.4-alpha.json), SHA-256 `4568BDDEF6AC0B83EF2E06E8845CA4F03FFB38C243884B8FA571CA9BBADC41CE`
- [`attempt-3`](evidence/disclosed-routing-round-19-after-generic-repair-attempt-3-0.4-alpha.json), SHA-256 `395E7A76EF10CF96DA04C46D028FDF0260E138AACA0D34A24D58A2EEF749CB08`

No commit, push, tag, GitHub Release, npm publish, Devpost edit, or video edit was
performed while the competition freeze remained active.
