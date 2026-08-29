# Room Inventory 0.5: Phase 3 Repair 1

Status: disclosed synthetic repair passed the frozen relation-quality gates and restored default-off graph compatibility.

## Evidence Chain

Phase 3 preserves three distinct observations:

1. First observation at commit `0f41dbd`: failed precision and per-language recall.
2. Pre-compatibility repair at commit `64c47aa`: passed relation gates but reduced default-off edges from 364 to 360, so it was rejected as a compatible candidate.
3. Final Repair 1 at commit `600effb`: passed relation gates while restoring the default-off edge count to 364.

Raw evidence hashes:

- First observation: `cc95cc7ca4a67cac5252feb17d205ff5f46846957de3dc3725e84e8f1f6ed9d2`
- Pre-compatibility repair: `c42cccda07376c116e881ab9284bc5b8c77dc46f3d6c01c84b89dc801a816cc7`
- Final Repair 1: `e731bc476076e22c2e8f9f92b1f745b607fc6f4ef607c00489528959f2d9e32a`
- Broad-routing self-evaluation: `1327d6dbab59913a3ee59efeecbb2c68c899d0f3532b86f722e256b52127e5d8`

The pre-compatibility raw result retains a generic `first observation` phrase in its claim boundary because the initial reused harness label was not parameterized. Its `observation` field is correctly `repair-1`. The raw file remains unchanged; the final harness and result use the correct repair label.

## Frozen Result Comparison

| Metric | First observation | Pre-compat repair | Final Repair 1 |
| --- | ---: | ---: | ---: |
| Resolved endpoints | 46 / 46 | 46 / 46 | 46 / 46 |
| Matched expected relations | 22 / 27 | 27 / 27 | 27 / 27 |
| Relation precision | 0.7586 | 1.0000 | 1.0000 |
| Relation recall | 0.8148 | 1.0000 | 1.0000 |
| Test closure recall | 0.8000 | 1.0000 | 1.0000 |
| Forbidden hits | 0 | 0 | 0 |
| Unexpected in-scope relations | 7 | 0 | 0 |
| Deterministic agreement | 1.0000 | 1.0000 | 1.0000 |
| Default-off objects | 0 | 0 | 0 |
| Default-off object relations | 0 | 0 | 0 |
| Default-off total edges | 364 | 360 | 364 |
| Overall accepted | No | No, compatibility regression | Yes, synthetic repair only |

Every language reached relation recall `1.00` in the final repair. TypeScript, JavaScript, Python, Go, and Rust standard test objects were all classified as `test`.

## General Mechanism Repairs

The product changes contain no fixture names, object identities, expected paths, or repository-specific rules:

- Optional parser-only `objectReferences` preserve complete structured identifiers for Room Inventory without persisting a second graph.
- Standard Go `*_test.go` / `TestXxx` and Rust `#[test]` conventions classify test objects.
- Owner-to-direct-member references are represented by `contains` and are not duplicated as `calls`.
- When Room Inventory metadata is present, a more specific source symbol suppresses a strict token-subset Owner in test matching.
- The specificity filter is inactive under default indexing, preserving the 0.4 graph.

## Verification

- Lint/typecheck: passed.
- Core: 271 / 271 tests passed.
- CLI: 2 / 2 tests passed.
- MCP: 2 / 2 tests passed.
- Research: 267 tests passed with 2 preserved lifecycle skips.
- MCP smoke: passed for all 10 tools.

## Interpretation

Repair 1 establishes complete, precise, deterministic relation recovery on the disclosed frozen synthetic fixture while preserving default-off behavior. This is meaningful engineering evidence: the object layer now carries useful cross-language calls and test closure instead of only exact identity metadata.

It is not independent qualification. The same fixture was used to diagnose and verify the general repair. The next release decision requires a frozen `0.5.0-alpha.1` artifact followed by fresh Round 26 targets that were not used in this development cycle.

## Residual Broad Routing Limitation

A disclosed post-repair self-evaluation compared installed stable 0.4 with the local 0.5 candidate on the compound task that produced this repair. Both versions returned the same five-file route and the same evaluation:

| Metric | Stable 0.4 | Local 0.5 candidate |
| --- | ---: | ---: |
| Route confidence | 0.68 | 0.68 |
| Core coverage | 0.167 | 0.167 |
| Route focus | 0.20 | 0.20 |
| Calibration | overconfident | overconfident |

This result is not a Phase 3 gate and was observed after the repair. It records an important product boundary: better object relations do not automatically produce complete multi-file routes. The current planner still misses parser, compatibility, focused-test, and generated-artifact evidence roles on a compound task.

Phase 4 should therefore study a generic evidence-role planner, using fresh frozen tasks. It should ask which implementation, parser, compatibility, test, and generated-artifact facets remain unfilled, then use object relations as evidence rather than adding repository names, issue identifiers, or fixture-specific rules.

## Claim Boundary

This result does not establish lower Token use, fewer tool calls, faster completion, fresh-repository generalization, or better end-to-end Agent correctness. npm `latest` must remain on 0.4 until the fresh qualification sequence succeeds.
