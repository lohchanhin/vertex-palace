# Disclosed Round 7 Module-Pair Regressions

## Result

**Mixed improvement, overall gate failed.** Task-anchored module pairing repaired the Httprouter route exactly, raising the disclosed sample from 2/8 to 3/8 passing targets. The first implementation also expanded Jinja with two unrelated files. A constrained second implementation removed that regression while preserving the Httprouter repair.

These are seen-development regressions on the eight already disclosed Round 7 tasks. They are not new held-out evidence and cannot establish Agent correctness, Token, tool-call, or wall-time gains.

## Frozen Evidence

- Original held-out evidence SHA-256: `C53C9186853F1661158212604804261C8394781454A7C7B7DF15811D4E42D7B9`
- Morphology-only evidence SHA-256: `9779EBEC4A235008DF42B915073B87E93079CF8168B7FAFCA2D42C9CE439BF71`
- Module-pair v1 product commit: `cea2fd91f85726603f8f04de23d127e766caf198`
- Module-pair v1 evidence SHA-256: `075BADB394CA1230252AB9F9710E90F88E37262E08CD7D837E95EA259DAE64F5`
- Constrained v2 product commit: `228c3bde47f6930023496fdd0a54d43dba10091f`
- Constrained v2 harness commit: `8b560f0ee4b876d656f2a0ca7f3c40662d272c80`
- Constrained v2 CLI SHA-256: `E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F`
- Constrained v2 evidence SHA-256: `7FBD82D10A99C65D4817349AD5E91C7A7237A712DADECD80E5707DBCA0386252`
- Protocol: 8 targets, 2 sequential repetitions per target, route limit 9, 6,000-token context ceiling

## Comparison

| Metric | Original Round 7 | Module pair v1 | Constrained v2 |
| --- | ---: | ---: | ---: |
| Task types matched | 6/8 | 8/8 | 8/8 |
| Passed targets | 2/8 | 3/8 | 3/8 |
| Core-complete targets | 3/8 | 4/8 | 4/8 |
| Exact-oracle targets | 2/8 | 3/8 | 3/8 |
| Macro changed-file coverage | 0.557 | 0.620 | 0.620 |
| Macro route focus | 0.480 | 0.535 | 0.542 |
| Macro route precision | 0.481 | 0.536 | 0.543 |
| Route files | 30 | 32 | 30 |
| Overconfident trials | 4/16 | 4/16 | 4/16 |
| Environment or harness failures | 0 | 0 | 0 |

## What Changed

Httprouter changed from `tree.go, router_test.go` to the exact oracle `tree.go, tree_test.go`. The task acronym `TSR` expands to the implementation symbol title, and the discriminative root-level module mirror admits the matching test without relying on issue-specific repository names.

Module-pair v1 also changed Jinja from five routed files to seven by admitting `src/jinja2/tests.py` and `tests/test_runtime.py`. The bypass had accepted any strong structural evidence when direct test evidence was weak. Constrained v2 permits that bypass only for the task-anchored module mirror. Jinja returned to the original five-file route, while Httprouter remained exact. The other seven v1 routes were unchanged.

## Interpretation

1. Same-module implementation/test structure can recover a real missing test when it is anchored by discriminative task evidence.
2. Structural similarity alone is not evidence of task ownership. Allowing it to bypass weak semantic evidence creates route inflation.
3. The constrained rule produced a small, attributable static-routing improvement over the original held-out observation, but the disclosed sample still fails every aggregate acceptance gate.
4. Execa and Mio remain confidently wrong; confidence calibration is now the highest safety priority.
5. Thiserror still finds the focused test but misses its macro implementation. The next recall work should use causal package and symbol relationships rather than another global filename boost.
6. Jinja and Httpcore show that auxiliary changelog/configuration files should not be mixed into the core implementation/test rule. Auxiliary recall needs a separate bounded policy.

## Next Direction

- Cap confidence when selected implementation files lack independent task evidence, even if a route contains a strong-looking pair.
- Add exact entity and operation anchors before generic behavior words, especially for tasks such as `peek`, tagged templates, and macro attributes.
- Use test-to-package and symbol dependency relationships to recover indirect implementations in sparse macro or generated-code tasks.
- Keep auxiliary documentation/configuration admission separate and bounded.
- Validate future changes first on neutral product fixtures, then on this disclosed regression, and finally on a newly frozen held-out repository set.

## Claim Boundary

Vertex Palace has shown a reproducible static-routing repair for one disclosed real-repository task and has removed its own observed regression. It has not yet passed the Round 7 routing gates and does not yet prove Token or time savings.
