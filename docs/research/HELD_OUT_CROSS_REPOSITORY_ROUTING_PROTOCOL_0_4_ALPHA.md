# Held-out Cross-Repository Routing Protocol (0.4 Alpha)

## Status

Preregistered after mechanical target selection and before the frozen candidate routes any selected task. This protocol and its harness must be committed before the first formal observation.

## Frozen Inputs

- Product candidate: `0b6a0fd92f43a74c983663cd32f937087e3ec923`
- Target manifest commit: `b91dbd14a69f92fa84fa9f4175b1c3c33bd6d342`
- Target manifest SHA-256: `5B071471BCF1B049B9BF1A2C70F536F138557A83AC6BCCDAA9AB9A82906A84C6`
- Selector commit: `2be2dc11673fbdf23112a420048af3a2a27914fb`
- Palace calls during target selection: `0`

Product paths and the target manifest are immutable for this study.

## Mechanically Selected Targets

| Repository | Route commit | Ground truth | Task | Changed files |
| --- | --- | --- | --- | --- |
| Fastify | `ab9b96eb2f93373949c253933eddb46f6772bbf4` | `6682c4f9a76cbb60c372ba5cad9dd2fc6e2fdb51` | `fix: normalize method in findRoute (#6838)` | `lib/route.js`; `test/find-route.test.js` |
| Click | `e0d1678ebc10cc663f2bc1973e0399b31415f8db` | `d15f3c23a177e80c324e1ee9681c9449c31ac965` | `fix: Skip flaky pager test on macOS with free-threaded Python 3.14t` | `src/click/_compat.py`; `tests/test_utils.py` |
| Cobra | `f2878bab8c96afd6e36968af96343b35dbb82a82` | `746ef07158728502482cea9f880a6f4b21ef29a9` | `fix: prevent completions from mutating os.Args via append side effect (#2356)` | `completions.go`; `completions_test.go` |
| Marked | `a37983f188d697fe98d350554dc95c49eaac6edd` | `11adb697eeee2b0fa6da3a38d5146626347592dc` | `fix: fix cli not reading stdin (#3967)` | `bin/main.js`; `test/unit/bin.test.js` |

The harness verifies each commit subject, parent relationship, and complete changed-file diff directly from Git before invoking Palace.

## Execution

Each repository is checked out at its route commit. The frozen CLI initializes and explicitly indexes it, then runs two sequential trials. Each trial performs `evaluate` followed by `context --auto` using:

- budget: 6,000 estimated input tokens;
- route limit: 9 files;
- maximum drawers: 4;
- no concurrent trials;
- first evaluation after explicit indexing, followed by warm-index operations.

## Promotion Gates

All four targets must pass every gate in both repetitions:

- task type is `bugfix`;
- changed-file coverage equals `1.00`;
- route focus is at least `0.75`;
- route precision against the complete Git diff is at least `0.75`;
- route files are deterministic across repetitions;
- calibration is never `overconfident`;
- context remains at or below 6,000 estimated tokens;
- selected and excluded boundaries do not overlap;
- status is fresh immediately after explicit indexing;
- Palace does not modify tracked repository files.

A setup or network failure is recorded as `environment-or-setup`, not as a product result, but it still prevents the overall study from passing until a separately preregistered rerun policy exists. A routing or contract failure is recorded as `product-or-contract`. No target may be replaced after observation.

## Evidence Preservation

The first formal observation must be created at:

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha.json`

The harness uses exclusive creation and refuses to overwrite an existing result. Raw evidence is committed unchanged and hashed before any result report is written.

## Claim Boundary

This is the first static routing observation on repositories and tasks not used to develop candidate `0b6a0fd`. Passing would support held-out static route generalization only. It would not establish Agent correctness, token savings, or wall-time improvement.

## Command

Run only after this protocol and `scripts/verify-held-out-cross-repository-routing.cjs` are committed:

```powershell
node scripts/verify-held-out-cross-repository-routing.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha.json
```

