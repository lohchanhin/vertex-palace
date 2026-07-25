# Round 6 Target Selection Failure (0.4 Alpha)

## Result

Round 6 did not produce a valid held-out validation set. The frozen selector
again selected seven of the required eight targets:

| Language family | Required | Selected |
| --- | ---: | ---: |
| JavaScript/TypeScript | 2 | 2 |
| Python | 2 | 1 |
| Go | 2 | 2 |
| Rust | 2 | 2 |

The create-only manifest records `status: selection-failed` and
`languageDiversitySatisfied: false`. Vertex Palace received none of the
selected tasks.

Raw manifest:
`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-6.json`

Manifest SHA-256:
`C02BAB99B8148C861EFA01D37EECA01C024340B10EA321A6A3A6DCB41B146726`

## Environment Classification

This was not an environment failure. Every inspected repository materialized
successfully on its first attempt. There were no clone, checkout, timeout, or
missing-object failures.

The frozen `inflected-behavioral-subject-v1` classifier improved sampling
outside Python: both JavaScript/TypeScript, Go, and Rust targets were supplied
by their first two repositories. Python exhausted all three repositories:

- `werkzeug`: no eligible target among 300 commits. Rejections included 264
  ambiguous subjects, 18 excluded-path diffs, 13 file-count violations, and
  three commits without both implementation and focused tests.
- `black`: no eligible target among 300 commits. Rejections included 190
  ambiguous subjects, 45 excluded-path diffs, 42 file-count violations, 21
  non-modified-file diffs, and two non-source-extension diffs.
- `attrs`: selected after 36 commits.

## Interpretation

This remains a target-selection protocol failure, not a Vertex Palace routing
result. The product candidate stayed frozen at
`f61207688badbe07818470a42441a3a966a8bdf0`, and Palace calls during selection
remained zero.

The inflected classifier addressed part of the Round 5 sampling problem, but
the remaining protocol still requires every changed file to use the primary
language's source extension and rejects the entire commit when documentation,
configuration, changelog, or another excluded surface is present. That rule can
systematically remove realistic multi-surface tasks before routing is measured.
The aggregate rejection counts identify this as a protocol-design risk; they do
not prove that every rejected commit would otherwise be suitable.

## Claim Boundary

- The seven selected tasks do not become a passing Round 6 result.
- The failed manifest will not be overwritten or manually supplemented.
- Round 6 tasks and all 12 pool repositories are disclosed and excluded from
  the next untouched pool.
- No Token, time, correctness, or route-quality claim follows from this result.
- Product code remains unchanged; only future sampling methodology may change.

## Next Protocol Direction

The next separately preregistered round will:

1. Use an entirely new pool and the complete prior exclusion boundary.
2. Increase the number of preregistered repositories per language family so a
   single ecosystem's commit conventions are less likely to exhaust a quota.
3. Require implementation and focused-test files as before, while allowing a
   small bounded number of modified documentation or configuration files in the
   oracle.
4. Continue excluding generated output, lockfiles, vendored code, fixtures,
   snapshots, examples, and benchmarks.
5. Keep task classification, repository order, surface limits, and all output
   behavior frozen before reading new history.
6. Preserve any further selection failure without in-place repair.
