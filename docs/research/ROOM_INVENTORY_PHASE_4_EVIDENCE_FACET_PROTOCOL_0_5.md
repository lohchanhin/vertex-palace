# Room Inventory 0.5: Phase 4 Evidence-Facet Planning Protocol

Status: development protocol and synthetic truth frozen before candidate observation.

## Research Question

Can Vertex Palace convert the explicit obligations in a compound task into bounded evidence facets, then use file and Room Inventory relations to close those facets without repository-specific rules?

Phase 3 established accurate object relations on a disclosed synthetic fixture, but a post-repair self-evaluation showed no improvement over stable 0.4 on a broad task: both conditions reached core coverage `0.167`, route focus `0.20`, and overconfident route confidence `0.68`. Phase 4 studies the missing planning layer rather than adding more parser or relation exceptions.

## Mechanism Boundary

The existing public `EvidenceRole` vocabulary remains unchanged. Phase 4 may add an internal task-level facet representation, but it must derive facets from explicit task clauses and indexed evidence:

- An implementation facet represents a named behavior or implementation participant.
- A constraint facet represents an explicit preservation or compatibility obligation.
- A verification facet exists only when the task requests a focused test or the task type requires verification.
- A generated-artifact facet exists only when the task explicitly requests rebuilding, synchronizing, or preserving a generated output.
- Parser, compatibility, serializer, transport, adapter, or similar words are task-derived facet labels, not permanent repository-specific role names.

Generic action words such as `fix`, `update`, `change`, `test`, and `project` cannot create implementation facets by themselves.

## Bounded Planning Rules

1. Start from the highest-confidence implementation object or file.
2. Build one obligation per distinct explicit task clause after action-word removal and lexical normalization.
3. Mark an obligation covered only by a selected source whose indexed text, object identity, or causal relation supports it.
4. Expand over `imports`, `calls`, `tests`, `tested_by`, `configures`, `changed_with`, or `depends_on`; at most two source-level hops are allowed.
5. Each uncovered facet may add at most one source, except a generated facet may add one generator/configuration source and one generated output when both are needed to establish provenance.
6. Rank candidates with the registered Phase 2 gain formula: `0.45 taskAffinity + 0.30 relationStrength + 0.25 facetGain - 0.20 degreePenalty - 0.25 redundancy`.
7. Stop when all explicit facets are covered or the best remaining gain is below `0.55`.
8. High-degree files cannot enter only because they connect to many nodes. A source must add a missing facet or meet both task affinity `>=0.65` and relation strength `>=0.75`.
9. Incomplete closure remains advisory and must cap confidence; it cannot enforce an early stop.
10. Production code cannot contain fixture paths, target IDs, repository names, issue numbers, or language-specific expected filenames.

## Frozen Development Fixture

The disclosed synthetic fixture contains 22 source and decoy files and four compound tasks:

| Profile | Language | Required facets |
| --- | --- | --- |
| Generated compound | TypeScript | implementation, parser, compatibility, focused verification, generated artifact |
| Parser and compatibility | Python | implementation, parser, compatibility, focused verification |
| Parser and compatibility | Go | implementation, parser, compatibility, focused verification |
| Parser and compatibility | Rust | implementation, parser, compatibility, focused verification |

The oracle contains 17 required files and three forbidden lexical decoys. It was written and hashed before any Phase 4 candidate route was executed.

Frozen hashes:

- Oracle SHA-256: `8f9295c8afdb6995abb27bc8c6224cc7699ec91ca58764e443500cc64c0e72a2`
- Fixture sources SHA-256: `8fb7ca466df43e758cd02e17da777d6fa6d2ecfd5f4f58595f527d2e5c4cd3ed`

## Development Gates

The first disclosed observation passes only when all gates pass:

1. All four tasks return `decision: route`.
2. Macro required-file coverage is at least `0.90`.
3. Every target reaches required-file coverage at least `0.80`.
4. Every explicit facet is covered on every target.
5. Focused verification coverage is `1.00`.
6. Generated-artifact coverage is `1.00` for the TypeScript target.
7. Macro route focus is at least `0.70`, and every target reaches at least `0.60`.
8. Forbidden decoy hits are zero.
9. Repeated route agreement is `1.00`.
10. No route exceeds its frozen route limit or 6,000 estimated context tokens.
11. Wrong forced stops and overconfident incomplete routes are zero.
12. Default-off indexing and routing remain compatible with stable 0.4 behavior.

## Failure Policy

The first observation is immutable. Task text, oracle files, decoys, hashes, route limits, and thresholds cannot change after observation. One generic mechanism repair is allowed per failure class; the failed fixture becomes regression evidence and cannot qualify a release.

If the same failure class recurs after one generic repair, implementation pauses for architecture review. No fixture-specific rule is allowed.

## Relationship to Round 26

Phase 4 is disclosed synthetic development evidence. It is deliberately separate from the already frozen Round 26 protocol. A Phase 4 pass does not count as a fresh target and cannot qualify `0.5.0-alpha.1` or stable 0.5. Round 26 target selection begins only after the candidate artifact is frozen.

## Claim Boundary

This protocol can evaluate bounded static route closure only. It cannot establish lower Token use, fewer tool calls, faster wall time, or improved end-to-end Agent correctness. npm `latest` remains on 0.4 during development.
