# Local Blind Routing Round 10 Result (0.4 Alpha)

## Verdict

Round 10 is a valid, completed, candidate-held-out paired static-routing study.
All eight targets and all 32 formal observations completed. There were no
environment/setup failures, harness-contract failures, stale indexes, selected
versus excluded boundary overlaps, or tracked target-repository modifications.

The candidate improved retrieval coverage, route focus, confidence calibration,
and mode safety over the frozen baseline, but it **failed the preregistered
absolute gate**. It is therefore not eligible for an end-to-end Agent A/B
protocol. This result must not be presented as proof of Agent correctness,
reported Token savings, fewer Agent tool calls, or lower Agent wall time.

## Evidence Integrity

- Formal result SHA-256:
  `C5D90E362119C558744836820DC47FB5C8869EE565CCC17E619E5298F03B3CB2`
- Validation freeze SHA-256:
  `3F95975A22796FCD9BD38C10EED3AE93BB885314A7FC878F5616FBFC8F885275`
- Target manifest SHA-256:
  `2E2D8BFA6867FADDF21916F80F161BCA9BFF6F4DD589BBDF4C15B2FD34067F06`
- Candidate freeze SHA-256:
  `F1E7EFE6D15BC279970BD7E9171E930C649941F2B272FA4394F33CC0ED48F984`

The formal result is create-only and remains unchanged. All later work on these
eight tasks is disclosed regression work, not held-out confirmation.

## Aggregate Comparison

| Metric | Baseline | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Passed targets | 3/8 | 4/8 | +1 |
| Core-surface complete | 4/8 | 5/8 | +1 |
| Exact-oracle targets | 3/8 | 3/8 | 0 |
| Auxiliary complete | 0/2 | 0/2 | 0 |
| Macro changed-file coverage | 0.654 | 0.804 | +0.150 |
| Macro route focus | 0.729 | 0.810 | +0.081 |
| Minimum target coverage | 0.000 | 0.500 | +0.500 |
| Minimum target focus | 0.000 | 0.333 | +0.333 |
| Calibration mean absolute error | 0.338 | 0.177 | -0.161 |
| Overconfident trials | 8 | 0 | -8 |
| Unsafe narrow-mode trials | 6 | 0 | -6 |
| Unsafe enforced-stop trials | 2 | 0 | -2 |
| Mean context estimated Tokens | 1,931.875 | 2,815.500 | +883.625 |
| Static command time total | 52.692 s | 61.307 s | +8.615 s |

The candidate was non-inferior to the baseline on paired coverage, focus, narrow
mode safety, and enforced-stop safety. The absolute gate still failed because
macro coverage was below 0.90, one target focus was below 0.40, core and
auxiliary surfaces remained incomplete, and six trials exposed a route-metric
precision disagreement.

## Per-Target Findings

| Target | Candidate result | Main observation |
| --- | --- | --- |
| p-map | Pass | Recovered the exact implementation and focused test; coverage and focus both reached 1.0. |
| itsdangerous | Fail | Improved coverage from 0.4 to 0.6 but missed `timed.py` and `tox.ini`. |
| gorilla-websocket | Pass | Preserved full coverage but expanded from 2 to 5 files, reducing focus from 1.0 to 0.4. |
| syn | Fail | Recovered the correct test but missed the `codegen` workspace implementation; focus was 0.333. |
| uuid | Fail | Kept the direct v1 test but missed the causally affected v6 test. |
| markupsafe | Fail | Found complete core code and test evidence but omitted the changelog auxiliary surface. |
| logrus | Pass | Exact implementation/test pair remained stable. |
| slab | Pass | Exact implementation/test pair remained stable. |

## General Failure Classes

1. **Workspace and generated-code ownership.** The `syn` subject described
   generated code, but routing stayed in the root crate instead of anchoring the
   `codegen` workspace package.
2. **Bounded transitive test impact.** The `uuid` implementation was directly
   matched, but the route did not follow the v1-to-v6 behavioral dependency to a
   second focused test.
3. **Causal implementation siblings.** `itsdangerous` found the serializer and
   its test but not the related timed serializer implementation.
4. **Auxiliary evidence policy.** Changelog and verification-configuration files
   were inconsistently recovered. They should be explicitly role-scored and
   budgeted instead of competing as generic lexical files.
5. **Recall expansion without saturation.** The safety widening fixed omissions
   and eliminated unsafe narrow modes, but `gorilla-websocket` shows that causal
   expansion needs a stronger stop once implementation and focused test evidence
   are complete.
6. **Metric precision contract.** `evaluate` rounds ratios to two decimal places,
   while the frozen validator independently records three decimals with a 0.001
   agreement tolerance. Six trials therefore disagreed on repeating thirds.
   This is a measurement-contract defect, not evidence that the affected routes
   were nondeterministic; it still remains a valid formal gate failure.

## Next Research Direction

The next product work should address these failure classes generically: add
workspace/package ownership and generated-code anchors; add bounded transitive
test-impact edges; classify auxiliary evidence by role; stop expansion after
independent implementation/test evidence saturates; and align public evaluation
precision with independent measurement.

After disclosed regression verification on the eight Round 10 cases, a new
Round 11 must use a recursively non-overlapping repository pool and newly frozen
tasks. Only a fresh held-out absolute-gate pass can authorize an Agent A/B study.

