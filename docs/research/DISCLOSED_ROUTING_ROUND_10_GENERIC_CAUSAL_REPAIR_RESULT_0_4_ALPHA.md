# Disclosed Round 10 Generic Causal Repair Result (0.4 Alpha)

## Claim boundary

The preregistered Round 10 gate remains **FAILED**. Attempt 3 is a disclosed, post-result repair evaluation and is not held out against the candidate. It does not authorize an end-to-end Agent A/B study and does not replace a fresh Round 11.

The separately labeled task-coherent sensitivity analysis is also post-hoc. It estimates what the disclosed result looks like after excluding one entire target whose pinned commit was found to contain unrelated semantic work. It does not rewrite the frozen oracle.

## What changed

The repair remained generic and did not contain repository or target names:

1. The Rust fallback parser recognizes a bounded generated-output declaration only when a generator function, a repository-relative string constant, and an explicit file write call agree.
2. Already tracked generated files retain their parsed content while receiving generated-artifact provenance.
3. The index records generator-to-output ownership with high-confidence `configures` and `changed_with` edges.
4. A proven generator-output pair can stop route expansion before lexical codegen neighbors fill the route.
5. A versioned downstream test can be selected from the pre-change import chain when its mirrored version implementation depends on the task-named version implementation.

The synthetic regressions were tightened to remove future behavior text. The generated output no longer imports its generator, and the v6 test no longer mentions the multicast fix.

## Verification

- Core: 14 files, 197/197 tests passed.
- Router: 84/84 tests passed.
- CLI: 2/2 tests passed.
- MCP: 2/2 tests passed.
- Full workspace build passed, including generated plugin MCP and package CLI bundles.
- MCP smoke passed for 10 tools.
- All disclosed routes were deterministic and left target worktrees clean.

## Disclosed repair chain

| Observation | Passed | Core complete | Macro coverage | Macro focus | Overconfident trials | Gate |
|---|---:|---:|---:|---:|---:|---|
| Frozen held-out candidate | 4/8 | 5/8 | 0.804 | 0.810 | 0 | FAILED |
| Disclosed Attempt 1 | 5/8 | 5/8 | 0.808 | 0.665 | 2 | FAILED |
| Disclosed Attempt 2 | 6/8 | 7/8 | 0.975 | 0.706 | 0 | FAILED |
| Disclosed Attempt 3 | 7/8 | 7/8 | 0.975 | 0.790 | 0 | FAILED |
| Task-coherent sensitivity subset | 7/7 | 7/7 | 1.000 | 0.831 | 0 | PASSED (diagnostic only) |

Attempt 3 also had zero unsafe narrow trials, zero unsafe enforced stops, zero metric disagreements, zero evaluation/context route disagreements, and no context pack above the 6,000-token ceiling.

## Repaired targets

### syn

Attempt 1 selected ten unrelated generated-code neighbors and missed both core files. Attempt 2 found both core files but still selected six files, producing focus 0.333. Attempt 3 stopped on the proven ownership pair:

- `codegen/src/snapshot.rs`
- `tests/debug/gen.rs`

Coverage and focus were both 1.000.

### uuid

The candidate now derives downstream impact from the pre-change chain `v6 test -> v6 implementation -> v1 implementation`. The exact route was:

- `src/v1.ts`
- `src/test/v1.test.ts`
- `src/test/v6.test.ts`

Coverage and focus were both 1.000. No post-change multicast wording was present in the synthetic v6 regression fixture.

## Remaining formal failure

The only Attempt 3 failure was `itsdangerous`. Its frozen task was "Added SHA-512 fallback by default", but the pinned commit also changed:

- `src/itsdangerous/timed.py`: distinct `SignatureExpired` control flow.
- `tox.ini`: unrelated pytest traceback formatting.

The route found the serializer implementation, serializer test, changelog, and tox configuration, but correctly did not infer the unrelated timed-serializer behavior from the task. Because the frozen oracle still marks `timed.py` as core, the formal gate remains failed.

The post-hoc coherence audit is preserved at [round10-task-diff-coherence-audit-0.4-alpha.json](evidence/round10-task-diff-coherence-audit-0.4-alpha.json). The sensitivity result excludes the entire target rather than cherry-picking favorable files.

## Evidence

- [Frozen Round 10 result](evidence/local-blind-routing-validation-0.4-alpha-round-10-attempt-1.json)
- [Disclosed Attempt 1](evidence/disclosed-routing-round-10-after-generic-causal-repair-attempt-1-0.4-alpha.json)
- [Disclosed Attempt 2](evidence/disclosed-routing-round-10-after-generic-causal-repair-attempt-2-0.4-alpha.json)
- [Disclosed Attempt 3](evidence/disclosed-routing-round-10-after-generic-causal-repair-attempt-3-0.4-alpha.json)
- [Task-coherent sensitivity analysis](evidence/disclosed-routing-round-10-attempt-3-task-coherent-sensitivity-0.4-alpha.json)

## Next decision

Round 11 target selection must audit task-to-diff coherence before candidate freeze. Mixed-semantic commits must be rejected as whole targets, with the rejection reason recorded before any candidate route is run. Only a fresh held-out Round 11 that passes the unchanged safety, coverage, focus, determinism, cleanliness, and context-budget gates can authorize Agent A/B evaluation.
