# Room Inventory 0.5: Phase 3 First Observation

Status: failed frozen development gates. No repair is included in this observation.

Observed at: 2026-08-29T13:55:13.842Z  
Candidate commit: `0f41dbd4153a56b6edf264e36a745d1e2345dbf0`  
Oracle SHA-256: `f2f06345b16050b54bbdbbab640379cb2b70e02f952645071f57f4df839d8c12`  
Raw evidence SHA-256: `cc95cc7ca4a67cac5252feb17d205ff5f46846957de3dc3725e84e8f1f6ed9d2`

## Result

The first immutable Phase 3 observation did not pass all preregistered gates.

| Metric | Result | Gate | Status |
| --- | ---: | ---: | --- |
| Object endpoint resolution | 1.0000 | 1.00 | Pass |
| Relation precision | 0.7586 | >= 0.95 | Fail |
| Relation recall | 0.8148 | >= 0.80 | Pass |
| Test closure recall | 0.8000 | >= 0.80 | Pass |
| Forbidden relation rate | 0.0000 | 0 | Pass |
| Deterministic relation agreement | 1.0000 | 1.00 | Pass |
| Maximum outgoing object relations | 3 | <= 32 | Pass |
| Default-off object relations | 0 | 0 | Pass |

The enabled index resolved all 46 declared endpoints and matched 22 of 27 expected relations. It produced no forbidden same-name relation. Both enabled runs produced the same complete object-relation key set.

## Language Recall

| Language | Matched / expected | Recall |
| --- | ---: | ---: |
| TypeScript | 6 / 6 | 1.0000 |
| JavaScript | 6 / 6 | 1.0000 |
| Python | 5 / 6 | 0.8333 |
| Go | 5 / 6 | 0.8333 |
| Rust | 0 / 3 | 0.0000 |

The per-language gate failed because Rust recall was zero.

## Missed Relations

Five expected relations were absent:

- Python `py_build_session calls py_hash_session`.
- Go `goBuildStore calls goPersistStore`.
- Rust `rust_build_route calls rust_prepare_route`.
- Rust `rust_builds_route tests rust_build_route`.
- Rust `rust_build_route tested_by rust_builds_route`.

## Additional In-Scope Relations

Seven inferred relations among declared endpoints were not in the exhaustive oracle:

- Three Owner-to-member `calls` edges duplicated structural ownership in TypeScript, JavaScript, and Python.
- Python test closure also attached to the broad `PySession` Owner in both directions.
- Go test closure also attached to the broad `GoStore` Owner in both directions.

These seven relations reduced measured precision to `0.7586`. The frozen ambiguity controls still worked: none of the ten forbidden caller-to-same-name-target relations appeared.

## Test-Object Metadata

TypeScript, JavaScript, and Python test objects were classified as `test`. Go `TestGoBuildStore` and Rust `rust_builds_route` remained classified as ordinary `function` objects. Existing file/symbol test edges still allowed Go to meet its test-closure truth, but this does not satisfy the Room Inventory metadata intent.

## Allowed Repair Direction

The protocol permits one general mechanism repair per failure class. The next step may investigate and repair:

1. Declaration/ownership text being mistaken for executable calls.
2. Broad Owner matches displacing the uniquely named implementation target.
3. Structural parser bodies failing to expose Python, Go, and Rust implementation calls.
4. Standard Go and Rust test conventions not producing `test` object metadata.

No fixture name, object identity, expected path, oracle, or threshold may enter production logic or change after this observation.

## Claim Boundary

This is a failed disclosed synthetic development observation. It does not establish fresh Round 26 qualification, Token savings, fewer tool calls, faster completion, or better end-to-end Agent correctness.
