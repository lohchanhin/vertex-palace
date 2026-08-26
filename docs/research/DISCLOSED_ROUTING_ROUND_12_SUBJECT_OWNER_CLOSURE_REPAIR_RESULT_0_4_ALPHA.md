# Disclosed Round 12 Subject-Owner Closure Repair Result (0.4 Alpha)

Status: disclosed post-observation regression. Core repair is stable; the full auxiliary gate remains failed.

## Claim Boundary

The formal candidate-held-out Round 12 result remains **FAILED** and immutable.
Its candidate passed only 3/8 targets, completed 4/8 core surfaces, and had six
overconfident trials. Attempts 1-5 below were run after those failures were known.
They are not held out, do not erase the formal result, and support no claim about
Agent correctness, reported Token use, tool calls, or wall time.

## Final Disclosed Result

Attempt 5 exactly reproduced the best Attempt 4 result:

- 8/8 targets completed and passed their per-target disclosed checks.
- 8/8 core implementation/test surfaces were complete.
- Target-macro core coverage: `1.000`.
- Target-macro changed-file coverage: `0.958`.
- Target-macro route focus: `0.771`; core route focus: `0.729`.
- Minimum target coverage: `0.667`; minimum target focus: `0.500`.
- Zero overconfident, unsafe narrow, unsafe enforced-stop, metric-disagreement,
  evaluation/context-disagreement, or tracked-target-change trials.
- Maximum delivered static context estimate: `5,937` Tokens under the `6,000`
  ceiling.

The full gate remains **FAILED** only because bounded auxiliary coverage is `1/2`.
Blinker's owner documentation is recovered; Bat's `CHANGELOG.md` is not.

## Repair Progression

| Attempt | Passed | Core complete | Auxiliary | Macro coverage | Core coverage | Macro focus | Overconfident | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 5/8 | 5/8 | 0/2 | 0.750 | 0.813 | 0.615 | 0 | FAILED |
| 2 | 7/8 | 8/8 | 0/2 | 0.917 | 1.000 | 0.690 | 0 | FAILED |
| 3 | 8/8 | 8/8 | 0/2 | 0.917 | 1.000 | 0.717 | 0 | FAILED |
| 4 | 8/8 | 8/8 | 1/2 | 0.958 | 1.000 | 0.771 | 0 | FAILED |
| 5 | 8/8 | 8/8 | 1/2 | 0.958 | 1.000 | 0.771 | 0 | FAILED |

## Attempt 5 Targets

| Target | Route files | Changed coverage | Core coverage | Focus | Main observation |
| --- | ---: | ---: | ---: | ---: | --- |
| redux | 4 | 1.000 | 1.000 | 0.500 | `createStore` owner test recovered; two contract/runtime supports remain. |
| blinker | 3 | 1.000 | 1.000 | 1.000 | Exact `base.py`, `test_signals.py`, and owner documentation. |
| sqlx | 4 | 1.000 | 1.000 | 0.500 | Two evidence-supported implementations each retain their owner test. |
| bat | 2 | 0.667 | 1.000 | 1.000 | Exact core pair; changelog remains absent. |
| pino | 4 | 1.000 | 1.000 | 0.500 | Redaction owner/test recovered with two runtime supports. |
| packaging | 2 | 1.000 | 1.000 | 1.000 | Exact implementation/test pair. |
| afero | 2 | 1.000 | 1.000 | 1.000 | Exact implementation/test pair. |
| notify | 3 | 1.000 | 1.000 | 0.667 | Exact oracle plus one package runtime support. |

## Bat Auxiliary Predictability Boundary

At the frozen Bat route commit `af1f53d9a977154216d01435991fe33631b74713`,
the indexed route contains a direct test/implementation relation between
`tests/integration_tests.rs` and `src/printer.rs`, but no relation from
`CHANGELOG.md` to either file.

The reachable Git history contains:

- 595 commits touching `CHANGELOG.md`.
- 225 commits touching `src/printer.rs`.
- 223 commits touching `tests/integration_tests.rs`.
- 33 commits touching both changelog and printer (`14.67%` of printer commits).
- 65 commits touching both changelog and integration tests (`29.15%` of test commits).
- 18 commits touching all three files.

This does not prove that a changelog is never useful. It shows that this frozen
task supplies no sufficiently discriminative signal for adding it automatically.
Forcing a changelog into every bugfix would make this disclosed gate green by
policy while predictably reducing focus elsewhere. The missing auxiliary remains
a documented prediction boundary instead.

Machine-readable audit:
[Bat auxiliary predictability](evidence/disclosed-round-12-bat-auxiliary-predictability-audit-0.4-alpha.json).

## Cross-Round Regression

The same product state passed the Round 11 disclosed gate in Attempt 7:
8/8 core complete, coverage `1.000`, macro focus `0.701`, and zero safety or
overconfidence failures. This is compatibility evidence only; both rounds are
disclosed against the current candidate.

## Evidence Integrity

- Formal Round 12 SHA-256:
  `4A7D6DBB68FBD6C1AEA3CD3159A092E5C2E8D6931187533F827A55BA6B1529D3`
- Disclosed Attempt 5 SHA-256:
  `C5D39DE53662FBB7CC76B13CA991A9ACB6AB70C0DABE2229F0CE25C8D94C3F37`
- Formal and disclosed evidence files use create-only output paths.
- All eight target worktrees remained clean in Attempt 5.

Evidence files:

- [Formal Round 12 result](evidence/local-blind-routing-validation-0.4-alpha-round-12-attempt-2.json)
- [Disclosed Attempt 5](evidence/disclosed-routing-round-12-after-subject-owner-closure-repair-attempt-5-0.4-alpha.json)

## Decision

The generic subject-owner repair is ready for another fresh static-routing round,
not for an Agent efficiency claim. The next pre-registered round should keep
core and auxiliary gates separate: core routing should be judged on causally
predictable implementation/test evidence, while changelog or documentation
auxiliaries should be required only when the frozen task or repository graph
contains an observable signal.
