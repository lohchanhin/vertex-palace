# Room Inventory 0.5: Phase 2 Object Relations and Routing

Status: development candidate verified. Default 0.4 behavior remains active unless Room Inventory indexing is explicitly enabled.

## Purpose

Phase 2 uses the optional object metadata introduced in Phase 1. It adds bounded object relations and exact object-identity scoring to the existing Palace graph. It does not create a second graph and does not treat an exact object match as proof that all task evidence is complete.

This is development evidence, not Round 26 qualification and not an Agent-performance claim.

## Object Relations

Object relations are built only when indexed nodes contain Room Inventory metadata:

- `contains`: an owner class, type, interface, or object contains a named member.
- `calls`: an object body references one unique declaration.
- `tests` and `tested_by`: a conservatively identified test object references one unique implementation object.

The relation builder uses an inverted reference index. A local declaration name must be unique before a body reference can create a relation. Ambiguous same-named declarations produce no guessed call relation. Dynamic dispatch and unresolved references remain unlinked.

Every source object retains at most 32 newly inferred relations. Relations are ranked by test evidence, owner structure, call evidence, parser confidence, and deterministic target identity before the cap is applied.

## Object-First Scoring

Object scoring is active only when a node has optional object metadata. The scoring order is:

1. Exact qualified identity such as `PaymentService.authorize`.
2. Exact owner and member identifiers supplied separately.
3. An explicit local code identifier such as backticked `authorize`.

A local identifier shared by multiple objects boosts all matching objects equally; it does not manufacture disambiguation. Parser confidence scales the identity boost but does not replace route confidence, evidence closure, tests, or runtime verification.

The existing evidence-gain route expansion now accepts `calls` as a causal relation. Existing context ceilings, degree penalties, role closure, and stop rules remain in force.

## Focused Development Tests

The Phase 2 suite verifies:

- Owner-to-member structure on the existing node graph.
- Focused test-to-implementation closure.
- A hard, deterministic 32-relation outgoing cap.
- Qualified identity preference between same-named methods.
- Symmetric ambiguity for an explicit local-only method name.
- Zero Room Inventory score reasons under default indexing.
- Exact object routing to a `full_symbol` drawer when enabled.

## Self-Repository Development Benchmark

The benchmark used the Vertex Palace repository itself after Phase 2 implementation. Conditions were sequential and local; this is an engineering smoke benchmark, not a randomized study.

| Metric | Default index | Room Inventory index |
| --- | ---: | ---: |
| Files | 818 | 818 |
| Nodes | 10,868 | 10,868 |
| Symbol nodes | 9,976 | 9,976 |
| Object records | 0 | 4,495 |
| Total edges | 17,412 | 22,994 |
| Index bytes | 60,743,627 | 66,297,933 |
| Wall time | 10,608.3 ms | 11,388.5 ms |

The measured size multiplier was `1.0914`; the time multiplier was `1.0735`, or a `7.35%` regression. Both are below the preregistered development gates of `1.50x` size and `25%` incremental-time regression. The enabled index contained 5,596 observed object-to-object relations: 7 `contains`, 5,575 `calls`, 7 `tests`, and 7 `tested_by`. The largest observed outgoing set was 31, below the hard cap of 32.

## Exact-Object Smoke Result

For the task naming `attachObjectMetadata`, the locally built candidate (`node dist/palace.cjs`) selected:

```text
packages/core/src/parser/attach-object-metadata.ts:13-22
```

as priority 1 with `full_symbol` loading and the reason `exact Room Inventory object match`. A focused Room Inventory test entered the same bounded route. Overall route confidence remained `0.4` because evidence closure was still insufficient. This is the intended safety behavior.

The globally installed `palace` command remained the stable 0.4 package during this development test. It was not used as the 0.5 candidate. The default, object-free index was restored after the smoke run.

## Broad Self-Evaluation: Negative Result

After implementation, the same broad Phase 2 task and layered truth were evaluated once with the globally installed stable 0.4 route and once with the locally built 0.5 candidate. This is a disclosed self-evaluation, not held-out evidence.

| Metric | Stable 0.4 | Local 0.5 candidate |
| --- | ---: | ---: |
| Route confidence | 0.81 | 0.79 |
| Changed-file coverage | 0.364 | 0.364 |
| Route focus | 0.571 | 0.571 |
| Core coverage | 0.286 | 0.286 |
| Declared auxiliary coverage | 0.500 | 0.500 |
| Calibration error | 0.52 | 0.50 |

The candidate did not improve broad multi-file closure. Both conditions missed the edge integration, metadata attachment, expansion, focused test, and generated bundle surfaces. Phase 2 therefore establishes exact object identity and bounded relations, but not general task-closure improvement. Phase 3 must measure relation precision and unresolved evidence roles instead of adding a route rule for this observed task.

## Compatibility and Claim Boundary

- Default indexing writes no object metadata or object relations.
- Existing node IDs, CLI/MCP schemas, Palace modes, and context ceilings are unchanged.
- Object matching cannot bypass task grounding or abstention.
- Object matching cannot authorize a forced stop by itself.
- The current evidence does not establish better Agent correctness, lower Token use, fewer tool calls, or faster completion.

## Next Phase

Phase 3 should freeze relation-quality fixtures, measure false-positive and unresolved rates across all five languages, and test whether object relations close missing implementation and verification roles on fresh tasks. Only then should the project prepare the immutable `0.5.0-alpha.1` candidate and fresh Round 26 target selection. No target-specific route rule should be added during that process.
