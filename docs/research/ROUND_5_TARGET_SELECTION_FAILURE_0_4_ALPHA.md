# Round 5 Target Selection Failure (0.4 Alpha)

## Result

Round 5 did not produce a valid held-out validation set. The frozen selector
selected seven of the required eight targets and satisfied only three of the
four language quotas:

| Language family | Required | Selected |
| --- | ---: | ---: |
| JavaScript/TypeScript | 2 | 2 |
| Python | 2 | 1 |
| Go | 2 | 2 |
| Rust | 2 | 2 |

The create-only manifest therefore records `status: selection-failed` and
`languageDiversitySatisfied: false`. No selected task was passed to Vertex
Palace.

Raw manifest:
`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-5.json`

Manifest SHA-256:
`73B12E699DA29F86F7AF31D6483549D15F94AE1353B14F566053AE8D7B7633D6`

## This Was Not an Environment Failure

Every inspected repository materialized successfully on its first attempt.
There were no clone, checkout, timeout, or missing-object failures. The failed
gate came from the preregistered sampling rules:

- `django`: all 300 inspected commits were rejected as
  `non-behavioral-or-ambiguous-subject`.
- `trio`: selected after 130 inspected commits.
- `anyio`: no eligible commit; 283 of 300 commits were rejected at the subject
  classifier, with the remaining commits rejected by other frozen rules.

The Rust primary `tokio` also had all 300 subjects rejected, but the frozen
fallback `tower-http` supplied the second Rust target. Python exhausted its
fallback and remained one target short.

## Interpretation

This is a target-selection protocol failure, not a Vertex Palace routing
failure and not evidence for or against product performance. The product
candidate remained frozen at
`f61207688badbe07818470a42441a3a966a8bdf0`, and selection invoked Palace zero
times.

The evidence shows that the subject classifier was too narrow for repositories
that use inflected imperative verbs such as `Fixed` or `Added`. The original
rule recognized only base forms such as `Fix` and `Add`. This can reject an
otherwise useful real-history population before file and test eligibility are
examined.

## Claim Boundary

- The seven selected tasks do not become a passing Round 5 result.
- The failed manifest will not be overwritten or supplemented manually.
- No repository will be substituted after seeing its history.
- Round 5 targets are now disclosed research observations and will be excluded
  from the next untouched pool.
- No Token, time, accuracy, or routing-quality claim follows from this result.

## Next Protocol

A separately committed round will:

1. Exclude the complete 53-repository boundary: the 41 repositories already
   excluded by Round 5 plus all 12 Round 5 pool repositories.
2. Freeze a new balanced pool before reading any new repository history.
3. Extend the mechanical subject classifier with common inflected forms such
   as `Added`, `Fixed`, `Implemented`, and `Resolved` before selection.
4. Keep the same source-only diff, focused-test, file-count, changed-line,
   create-only output, and zero-Palace selection constraints.
5. Preserve another failed manifest rather than changing rules or repositories
   after selection begins.
