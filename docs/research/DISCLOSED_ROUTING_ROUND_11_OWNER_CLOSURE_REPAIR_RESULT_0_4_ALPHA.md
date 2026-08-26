# Disclosed Round 11 Owner-Closure Repair Result (0.4 Alpha)

Status: disclosed post-observation regression. Attempt 7 passed its frozen disclosed gate.

## Claim Boundary

The formal candidate-held-out Round 11 result remains **FAILED** and immutable.
Every attempt in this report used targets whose identities and failures had already
been observed. These runs test whether generic repairs preserve a disclosed target
set; they do not establish held-out generalization and do not authorize claims
about Agent correctness, reported Token use, tool calls, or wall time.

## Final Outcome

Attempt 7 is the first Round 11 repair attempt to pass every disclosed gate:

- 8/8 targets passed and 8/8 core implementation/test surfaces were complete.
- Target-macro changed-file coverage: `1.000`.
- Target-macro route focus: `0.701` against the frozen `0.700` threshold.
- Target-macro core route focus: `0.670`.
- Minimum target coverage: `1.000`; minimum target focus: `0.500`.
- Zero overconfident, unsafe narrow, unsafe enforced-stop, metric-disagreement,
  evaluation/context-disagreement, or tracked-target-change trials.
- Maximum delivered static context estimate: `3,802` Tokens under the `6,000`
  ceiling.

## Repair Chain

| Observation | Passed | Core complete | Macro coverage | Macro focus | Core focus | Overconfident | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Frozen formal candidate | 5/8 | 5/8 | 0.802 | 0.479 | not reported | 4 | FAILED |
| Attempt 1 | 5/8 | 5/8 | 0.885 | 0.504 | 0.483 | 2 | FAILED |
| Attempt 2 | 7/8 | 7/8 | 0.938 | 0.546 | 0.525 | 0 | FAILED |
| Attempt 3 | 8/8 | 8/8 | 1.000 | 0.567 | 0.546 | 0 | FAILED |
| Attempt 4 | 8/8 | 8/8 | 1.000 | 0.661 | 0.636 | 0 | FAILED |
| Attempt 5 | 7/8 | 7/8 | 0.938 | 0.616 | 0.591 | 2 | FAILED |
| Attempt 6 | 8/8 | 8/8 | 1.000 | 0.657 | 0.632 | 0 | FAILED |
| Attempt 7 | 8/8 | 8/8 | 1.000 | 0.701 | 0.670 | 0 | **PASSED** |

Attempt 5 is intentionally preserved. A secondary `ArrayCodec` owner displaced
the selected `LoadTypes` test in pgx, proving that a green earlier attempt was not
enough. The repair now protects verification for a leading code identity before
considering a secondary owner. Attempt 6 recovered recall; Attempt 7 removed two
additional generic noise classes without weakening coverage.

## Generic Product Rules

The current repair contains no repository-name or target-name branches. It adds:

1. Owner-local test closure for selected task implementations.
2. Priority for a leading code identity such as `LoadTypes` over a secondary
   object named later in the task.
3. Priority for the module owner in an explicit dotted identifier such as
   `validate.URL`; indirect consumers remain eligible, but their duplicate tests
   do not displace the direct owner test.
4. Bounded two-owner closure for exactly two evidence-supported competing
   implementations.
5. Symbol-family ownership for generic module names such as `base.py`, with path
   scope attenuation to prevent nested same-name tests from outranking an exact
   owner test.
6. Task-owner documentation only when the implementation filename is generic or
   the task explicitly requests documentation. A complete public API route no
   longer gains an unrelated owner-named guide merely because route budget exists.

## Attempt 7 Targets

| Target | Route files | Coverage | Focus | Main observation |
| --- | ---: | ---: | ---: | --- |
| yup | 4 | 1.000 | 0.500 | Direct Lazy implementation/test plus two runtime neighbors. |
| marshmallow | 4 | 1.000 | 0.750 | Direct validator test retained; duplicate field test removed. |
| arrayvec | 8 | 1.000 | 0.500 | Complete but still the widest disclosed route. |
| node-fetch | 4 | 1.000 | 1.000 | Exact runtime, declaration, type test, and public runtime test. |
| jsonschema | 3 | 1.000 | 0.667 | Complete oracle plus one related format test. |
| go-sql-driver-mysql | 7 | 1.000 | 0.857 | Six causal files plus one supporting field module. |
| itertools | 3 | 1.000 | 0.667 | Implementation, focused test, and bounded changelog. |
| pgx | 3 | 1.000 | 0.667 | `LoadTypes` owner/test plus the causal codec implementation. |

## Evidence Integrity

- Formal Round 11 SHA-256:
  `570C2AAA0F5A593466F4EAB5161897DADE310EB211ABE1F2647586B872797720`
- Historical Disclosed Attempt 3 SHA-256:
  `939741A55D47839D970D261F3D4E91BBAF1B190272FFE336150131A64EBD3A2E`
- Disclosed Attempt 7 SHA-256:
  `065E6A331533C3A75BF65A96691C3040BB86385A7A4A2DB63DC003231DCEC7B5`
- The formal result and every disclosed attempt are create-only evidence files.
- All target repositories remained clean during Attempt 7.

Evidence files:

- [Formal Round 11 result](evidence/local-blind-routing-validation-0.4-alpha-round-11-attempt-1.json)
- [Disclosed Attempt 7](evidence/disclosed-routing-round-11-after-owner-closure-repair-attempt-7-0.4-alpha.json)

## Decision

The Round 11 disclosed regression gate now passes, but Round 11 is not fresh
evidence. Its value is engineering compatibility: the generic repair recovered
all known owner closures and crossed the frozen focus threshold without weakening
safety. Generalization must still be decided by a recursively non-overlapping,
pre-registered future round.
