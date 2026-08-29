# Room Inventory 0.5: Phase 4 Repair 1

Status: disclosed synthetic repair passed every frozen evidence-facet gate; fresh qualification remains pending.

## Evidence Chain

Phase 4 preserves two immutable observations against the same frozen oracle:

1. First observation at commit `c561245`: failed coverage, facet closure, generated-artifact retrieval, minimum focus, decoy safety, and confidence calibration.
2. Repair 1 at commit `bb3ccf0`: passed every frozen development gate after one generic mechanism repair.

Raw evidence hashes:

- First observation: `bd5859955841947f74db3b395d30f0b63433b70eedf3d98ba63bbe53aa412c5b`
- Repair 1: `18a75b367eb78a84b90e21da53857ebc17fa924004e571198664d5ffe576fa38`
- Post-repair self-evaluation: `1952abc3cdd4c0fad78ef2ea5f807b989442a3e78b05627c4e4792e949786dcb`
- Oracle: `8f9295c8afdb6995abb27bc8c6224cc7699ec91ca58764e443500cc64c0e72a2`
- Fixture sources: `8fb7ca466df43e758cd02e17da777d6fa6d2ecfd5f4f58595f527d2e5c4cd3ed`

## Frozen Result Comparison

| Metric | First observation | Repair 1 | Gate |
| --- | ---: | ---: | ---: |
| Required files matched | 13 / 17 | 17 / 17 | >= 90% macro |
| Macro required-file coverage | 0.7647 | 1.0000 | >= 0.9000 |
| Minimum target coverage | 0.4000 | 1.0000 | >= 0.8000 |
| Explicit facet closure | 0.5000 | 1.0000 | 1.0000 |
| Focused verification coverage | 1.0000 | 1.0000 | 1.0000 |
| Generated-artifact coverage | 0.0000 | 1.0000 | 1.0000 |
| Macro route focus | 0.7238 | 1.0000 | >= 0.7000 |
| Minimum target focus | 0.4286 | 1.0000 | >= 0.6000 |
| Forbidden decoy hits | 1 | 0 | 0 |
| Deterministic agreement | 1.0000 | 1.0000 | 1.0000 |
| Maximum estimated context | 1,745 | 1,300 | <= 6,000 |
| Overconfident incomplete routes | 1 | 0 | 0 |
| Default-off objects / object relations | 0 / 0 | 0 / 0 | 0 / 0 |

All four repaired routes achieved required-file coverage and route focus `1.00`. TypeScript recovered implementation, parser, compatibility, focused verification, and the generated output. Python, Go, and Rust each recovered the implementation, parser, compatibility, and focused verification files without cross-language noise.

## Generic Mechanism Repair

The repair adds an internal evidence-facet planner without changing the public `EvidenceRole` vocabulary:

- Explicit task clauses become bounded identifier, concern, constraint, verification, or generated obligations.
- Identifier obligations require exact object identity instead of accepting a shared generic word.
- Candidate evidence must be relation-connected within two source-level hops.
- Non-generated evidence must remain in the anchor's language and ownership scope unless an exact identifier justifies it.
- Explicit generated work can follow indexed provenance across two hops.
- Candidate gain uses the preregistered task-affinity, relation-strength, facet-gain, degree-penalty, and redundancy model.
- Any unclosed explicit facet caps route confidence at `0.40`.
- The planner is inactive when Room Inventory metadata is absent, preserving default behavior.

Production code contains no fixture paths, target IDs, expected symbols, repository names, or issue numbers.

## Verification

- Lint and typecheck: passed.
- Core: 273 / 273 tests passed.
- CLI: 2 / 2 tests passed.
- MCP: 2 / 2 tests passed.
- Research: 277 tests passed with 2 preserved lifecycle skips.
- Build: all packages, CLI bundle, and generated MCP bundle passed.
- MCP smoke: all 10 tools passed.

## Residual Limitation

The repaired routes are complete against the frozen facet oracle, but the older public `evidenceClosure` remains `insufficient` for these tasks because it does not yet expose dynamic facet obligations. This is conservative: the Agent remains advisory and is not forced to stop. A later phase should unify facet diagnostics with public closure and confidence evidence without weakening the existing safety checks.

A post-repair self-evaluation also prevents a broader claim:

| Diagnostic task | Core coverage | Focus | Confidence / calibration |
| --- | ---: | ---: | --- |
| Phase 4 implementation task | 1.000 | 0.400 | 0.40 / underconfident |
| Same Phase 3 compound task, stable 0.4 | 0.167 | 0.200 | 0.68 / overconfident |
| Same Phase 3 compound task, local 0.5 Repair 1 | 0.167 | 0.167 | 0.40 / overconfident |

The Phase 4 implementation task now has complete core and changed-file coverage, but it remains broad. More importantly, the exact earlier Phase 3 task did not improve its core coverage. Repair 1 therefore establishes the mechanism on the frozen development fixture, not broad self-repository generalization. The protocol permits no second post-hoc repair for the same failure class; architecture work pauses here pending a fresh qualification design.

## Interpretation

Repair 1 demonstrates that the Phase 3 relation graph can support precise compound-task closure when the planner asks which explicit obligation is still missing. It also removes the cross-language and historic-document noise observed in the first run while reducing maximum estimated context.

This is still a disclosed development fixture used to diagnose and verify the repair. It cannot qualify a release. The next product checkpoint is a frozen `0.5.0-alpha.1` artifact followed by fresh Round 26 targets that were not used anywhere in Phase 1-4 development.

## Claim Boundary

This result does not establish lower Token use, fewer tool calls, faster wall time, fresh-repository generalization, or improved end-to-end Agent correctness. npm `latest` remains on 0.4 until fresh qualification succeeds.
