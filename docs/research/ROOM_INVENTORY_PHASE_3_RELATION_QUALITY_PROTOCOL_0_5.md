# Room Inventory 0.5: Phase 3 Relation-Quality Protocol

Status: frozen before candidate observation.

## Question

Phase 2 proved that exact object identity can rank one symbol first, but its disclosed broad self-evaluation did not improve multi-file task closure. Phase 3 asks a narrower causal question: are the inferred `contains`, `calls`, `tests`, and `tested_by` relations accurate, complete enough to be useful, deterministic, and safely absent when Room Inventory is disabled?

This protocol freezes the answer key before running the 0.5 candidate. It is a synthetic development study, not Round 26 qualification.

## Frozen Fixture

The fixture contains 11 source files across TypeScript, JavaScript, Python, Go, and Rust. Each language contributes:

- One unique implementation-to-implementation call.
- One focused test-to-implementation relation and its reverse `tested_by` relation.
- Two same-named ambiguous targets that must not be guessed.
- One Owner-to-member `contains` relation where the Phase 0 parser contract already exposes ownership. Rust ownership is not declared in this fixture because Phase 0 froze only a Rust function object.

The oracle contains 19 expected relations and 10 forbidden ambiguous relations. Undeclared inferred relations are held for human review instead of being automatically labeled false positives.

Frozen hashes:

- Oracle SHA-256: `8ae16a615f34eaf00acfd313afb0a9a3a1a78a69e1f6caa8d9421ef79f0e0c6d`
- Fixture-source SHA-256: `fbbd78f6fd86c674920af589797d2ae4ee39bdd3e0536f446b5d1163a548d97b`

## Standard Test Conventions

The frozen test surfaces intentionally use ordinary conventions rather than tool-specific names:

- TypeScript: `*.test.ts`
- JavaScript: `*.test.js`
- Python: `tests/test_*.py`
- Go: `*_test.go` with `TestXxx`
- Rust: `#[test]`

If the first observation misses one of these conventions, the failure remains recorded. At most one language-general test-detection repair may be made for that failure class; the oracle and thresholds cannot change.

## Metrics and Gates

- Object endpoint resolution: `1.00`
- Macro relation precision: at least `0.95`
- Macro relation recall: at least `0.80`
- Per-language relation recall: at least `0.50`
- Test closure recall: at least `0.80`
- Forbidden relation rate: exactly `0`
- Repeated-index relation agreement: `1.00`
- Maximum outgoing object relations: `32`
- Default-off object relations: `0`

Unresolved expected relations count as misses. Precision uses only inferred relations whose endpoints are declared by the oracle; undeclared but potentially valid relations require human review.

## Execution Order

1. Commit and push this protocol, fixture, oracle, hashes, and guard test.
2. Run the default-off condition once.
3. Run the enabled condition twice and compare deterministic relation keys.
4. Write the complete first observation without changing the fixture, oracle, or thresholds.
5. If a gate fails, permit at most one general mechanism repair for that failure class.
6. Re-run against the same immutable fixture as a disclosed repair result.

Repository names, fixture IDs, object names, and expected paths must not enter production routing rules.

## Claim Boundary

Passing Phase 3 would establish only synthetic relation quality under the frozen fixture. It would not establish fresh Round 26 qualification, lower Token use, fewer tool calls, faster completion, or better end-to-end Agent correctness.
