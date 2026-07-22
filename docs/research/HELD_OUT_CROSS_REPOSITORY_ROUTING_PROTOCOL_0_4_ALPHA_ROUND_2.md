# Held-out Cross-Repository Routing Protocol (0.4 Alpha, Round 2)

## Status

Preregistered after mechanical target selection and before candidate `0ef19a7` routes any selected task. This protocol and `scripts/verify-held-out-cross-repository-routing-round-2.cjs` must be committed before the first formal observation.

## Frozen Inputs

- Product candidate: `0ef19a7bbef1901d813b81389405f87482db47c5`
- Selector commit: `0f3a8bc13c9de670cc4f3caf880f3bfb6b744bc2`
- Target manifest commit: `4dfdf420fe56d397946e6f7920528697f1cd9629`
- Target manifest: `docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-2.json`
- Target manifest SHA-256: `694BF80DDB45A381F19FCA993674A71EA5BA78EB963258E3A2675C416D3B09A8`
- Palace calls on selected candidate tasks before this protocol: `0`

Product paths and the manifest are immutable. A build is allowed only when it reproduces the committed generated bundle without tracked changes.

## Preregistration Clarification

The selection protocol correctly allowed behavioral `fix`, `feat`, and `add` subjects, but its validation summary incorrectly stated that every selected task must remain `bugfix`. The selected manifest therefore contains both fix and feature subjects.

This clarification is frozen before any Palace call on a selected task. No repository or task is removed, replaced, or inspected with Palace. Expected task type is derived mechanically from the unedited subject prefix:

- `fix:` -> `bugfix`
- `feat(...):` or `Add ...` -> `feature`
- any unknown or mismatched classification fails the study

## Mechanically Selected Targets

| Repository | Expected type | Route commit | Ground truth | Task | Changed files |
| --- | --- | --- | --- | --- | --- |
| Express | bugfix | `3e81873b52e107898ed7ba45874959fb0546df3f` | `6cd404eb28ff861180f435b3015f8d0c8c0b44d4` | `fix: enhance req.acceptsCharsets method (#6088)` | `lib/request.js`; `test/req.acceptsCharsets.js` |
| HTTPX | feature | `c3585a5ccfa57bec653f3846b8625a27d11dcd5e` | `88e84314378b31336027363af862619c519a4a3a` | `Add cookies to the retried request when performing digest authentication. (#2846)` | `httpx/_auth.py`; `tests/test_auth.py` |
| urfave/cli | bugfix | `f980ca84bf6559aa0571b213534b4d3b8d37f5d2` | `0045bbdaa06af2eba6c1a5d38907665fb2e839e3` | `fix: keep completion subcommand order deterministic in help output` | `completion.go`; `completion_test.go` |
| Clap | feature | `1565a3cbb411dedc410154fca0de7ec445fcdb08` | `ac0d148f7e21068fd1f544230456f30c95311f78` | `feat(complete): Index-aware ValueCompleter` | `clap_complete/src/engine/complete.rs`; `clap_complete/src/engine/custom.rs`; `clap_complete/tests/testsuite/engine.rs` |
| Commander | feature | `02c603ebedaec334ba9edc7c3c2e48484e2aeaf8` | `a8ef5cf3e1975380974ab5c4f92c26fb2c5e3209` | `Add informative message for missing executable on Windows (#2291)` | `lib/command.js`; two executable-subcommand tests |
| pytest | bugfix | `eb79044cea1c2c7b6e58ebcce17c55da871fef6c` | `fc8f56bd211128db4dd33b1a9ad42f50d9c8a3f8` | `fix: deduplicate Directory nodes on re-collection to preserve fixture identity (#14635)` | `src/_pytest/main.py`; `testing/test_conftest.py` |

The harness verifies each subject, parent relationship, and complete changed-file diff directly from Git before invoking Palace.

## Execution

Each repository is freshly materialized at its route commit. The frozen CLI initializes and explicitly indexes it, then performs two sequential trials. Every trial runs `evaluate` followed by `context --auto` with:

- budget: 6,000 estimated input tokens;
- route limit: 9 files;
- maximum drawers: 4;
- first evaluation after explicit indexing, followed by warm-index operations;
- no concurrent trials.

## Promotion Gates

The study passes only when all conditions hold:

- all six targets complete both trials;
- every task type matches the mechanical prefix mapping;
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

Environment/setup, harness-contract, and product/contract failures are recorded separately. Any category prevents the formal study from passing because no rerun or target-replacement policy was preregistered.

## Evidence Preservation

The first formal observation must be created exclusively at:

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-2.json`

The harness refuses to overwrite an existing result. Raw evidence is committed unchanged and hashed before interpretation is written.

## Claim Boundary

Passing supports held-out static route generalization for this six-target sample only. It does not prove final Agent correctness, reported Token reduction, lower wall time, or fewer tool calls. Failing rejects promotion to Agent A/B and turns all six tasks into disclosed development data.

## Command

Run only after this protocol and validation harness are committed:

```powershell
node scripts/verify-held-out-cross-repository-routing-round-2.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-2.json
```
