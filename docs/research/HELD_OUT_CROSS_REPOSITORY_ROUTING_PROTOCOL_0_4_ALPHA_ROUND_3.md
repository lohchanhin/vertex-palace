# Held-out Cross-Repository Routing Protocol (0.4 Alpha, Round 3)

## Status

Preregistered after mechanical target selection and before candidate `6060e0c` routes, evaluates, indexes, or packs any selected task. This protocol and `scripts/verify-held-out-cross-repository-routing-round-3.cjs` must be committed before the first formal observation.

## Frozen Inputs

- Product candidate: `6060e0c6aa2aea64d0145c1e55bccdc4669e4b48`
- Selector commit: `a9f5ff2e22a7cd41ed6f019f75c9759500ecce09`
- Target manifest commit: `d35ff810c79c3374ce5b37d780138def50d3c52d`
- Target manifest: `docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-3.json`
- Target manifest SHA-256: `16D62D36341E22864DED89CB7A8C2CC6C5D765C0C4F8B6AE237CFC4D5F0E1DC2`
- Palace calls on selected candidate tasks before this protocol: `0`

Product paths and the manifest are immutable. A build is allowed only when it reproduces the committed generated bundle without tracked changes.

The first foreground selector execution ended without stdout, stderr, manifest, or cleanup. The retained temporary root is consistent with an execution-host interruption but does not prove a cause. The event is preserved in `docs/research/evidence/held-out-routing-target-selection-round-3-environment-interruption.json`. Recovery used the identical committed selector, pinned pool, candidate, and create-only output path. No task was manually inspected, replaced, or routed.

## Mechanically Selected Targets

Expected task type was derived by the selector and frozen in the manifest before Palace exposure.

| Repository | Expected type | Route commit | Ground truth | Task | Changed files |
| --- | --- | --- | --- | --- | --- |
| Koa | bugfix | `4b12945e2e5dac698b6d3835e1a81415aed7ab26` | `480a4f064a4e8edb9e09be39355b3228ae4f4f9e` | `fix: response content-type value amount as one with testcase (#1899)` | `__tests__/application/response.test.js`; `lib/response.js` |
| Starlette | feature | `f617177ab955f7e79e0d863a7c28adb6200b4acc` | `7f78881448d06ac2b296fc3533abbb0148fb9402` | ``Support multiple cookie headers in `Request.cookies` (#3029)`` | `starlette/requests.py`; `tests/test_requests.py` |
| Gin | bugfix | `da1e108614ecbbadfa5736b1b297b16121d23b9b` | `d9307dbcbbe796a64d9e0ef23452da888dd7f904` | `fix(context): skip chmod on pre-existing dirs in SaveUploadedFile (#4702)` | `context.go`; `context_test.go` |
| Tower | bugfix | `251296dc54a044383dffd16d2179b443e2615672` | `df06d70dbea345facbffb5881fe8647f53bf424d` | `fix(balance): clear cached P2C ready index after a discovery removal (#874)` | `tower/src/balance/p2c/service.rs`; `tower/src/balance/p2c/test.rs` |
| Axios | bugfix | `02c2c4f891d76b15712a9edd149a2d9f7978774f` | `3d253b4f17a5107e6f274ee5b2e96e03508dceb2` | `fix: clamp negative progress values (#11039)` | `lib/helpers/progressEventReducer.js`; `tests/unit/helpers/progressEventReducer.test.js` |
| Echo | bugfix | `34f3f425100f94b500ced2e8799470e32bba877e` | `48128ab391f2ec9ea9679d59a472a97edaa08160` | `fix(static): preserve matched handler 404s` | `middleware/static.go`; `middleware/static_test.go` |
| serde_json | feature | `827a315bf2198558f0325b07bcc1e2cd973aba2f` | `cf16f75d81e28c723323bfc60a68fc02d2994fff` | `Add RawValue::from_string_unchecked` | `src/raw.rs`; `tests/test.rs` |
| Pydantic | feature | `92208bf84df18f606df8c69f7043b4cc0673e34c` | `be3e4d174d2a429a31a36ba79530f299c367590f` | ``Allow periods in unquoted `NameEmail` display names (#13206)`` | `pydantic/networks.py`; `tests/test_networks.py` |

The harness verifies every subject, expected type, parent relationship, and complete changed-file diff directly from Git before invoking Palace.

## Execution

Each repository is freshly materialized at its route commit. The frozen CLI initializes and explicitly indexes it, then performs two sequential trials. Every trial runs `evaluate` followed by `context --auto` with:

- budget: 6,000 estimated input tokens;
- route limit: 9 files;
- maximum drawers: 4;
- first evaluation after explicit indexing, followed by warm-index operations;
- no concurrent target or repetition execution.

The formal observation therefore contains eight targets and `16` sequential trials.

## Promotion Gates

The study passes only when all conditions hold:

- all eight targets complete both trials;
- every observed task type matches the manifest's mechanically frozen expected type;
- every target routes all declared implementation and focused test files;
- macro changed-file coverage is at least `0.90`;
- macro route focus and precision are each at least `0.75`;
- no target route focus or precision is below `0.50`;
- route files are deterministic across repetitions;
- calibration is never `overconfident`;
- context remains at or below 6,000 estimated tokens;
- selected and excluded boundaries do not overlap;
- status is fresh immediately after explicit indexing;
- Palace does not modify tracked repository files.

Environment/setup, harness-contract, and product/contract failures are recorded separately. Any category prevents promotion. No target may be replaced, and a failed output may not be overwritten or silently rerun under a changed candidate.

## Evidence Preservation

The first formal observation must be created exclusively at:

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3.json`

The harness refuses to overwrite an existing result. Raw evidence is committed unchanged and hashed before interpretation or product repair begins.

## Claim Boundary

Passing supports held-out static route generalization for this balanced eight-target sample only. It does not prove final Agent correctness, reported Token reduction, lower wall time, or fewer tool calls. Failing rejects promotion to Agent A/B and turns all eight tasks into disclosed development data.

## Command

Run only after this protocol and validation harness are committed:

```powershell
node scripts/verify-held-out-cross-repository-routing-round-3.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3.json
```
