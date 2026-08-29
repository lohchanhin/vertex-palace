# Room Inventory 0.5: Phase 4 First Observation

Status: failed disclosed synthetic development observation; preserved before repair.

## Frozen Evidence

- Candidate commit: `c561245c5b6f0828056bd9bbbafd9ebcdb496f3a`
- Raw result SHA-256: `bd5859955841947f74db3b395d30f0b63433b70eedf3d98ba63bbe53aa412c5b`
- Oracle SHA-256: `8f9295c8afdb6995abb27bc8c6224cc7699ec91ca58764e443500cc64c0e72a2`
- Fixture sources SHA-256: `8fb7ca466df43e758cd02e17da777d6fa6d2ecfd5f4f58595f527d2e5c4cd3ed`

The measurement copied the fixture to a temporary repository and removed `oracle.json` before indexing. Each task ran twice, sequentially, through `packages/core/dist/index.js` with Room Inventory enabled.

## Aggregate Result

| Metric | Observed | Gate | Result |
| --- | ---: | ---: | --- |
| Route decision rate | 1.0000 | 1.0000 | Pass |
| Macro required-file coverage | 0.7647 | >= 0.9000 | Fail |
| Minimum target coverage | 0.4000 | >= 0.8000 | Fail |
| Explicit facet closure | 0.5000 | 1.0000 | Fail |
| Focused verification coverage | 1.0000 | 1.0000 | Pass |
| Generated-artifact coverage | 0.0000 | 1.0000 | Fail |
| Macro route focus | 0.7238 | >= 0.7000 | Pass |
| Minimum target focus | 0.4286 | >= 0.6000 | Fail |
| Forbidden decoy hits | 1 | 0 | Fail |
| Deterministic agreement | 1.0000 | 1.0000 | Pass |
| Maximum estimated context | 1,745 | <= 6,000 | Pass |
| Wrong forced stops | 0 | 0 | Pass |
| Overconfident incomplete routes | 1 | 0 | Fail |
| Default-off object metadata | 0 | 0 | Pass |

The candidate retrieved 13 of 17 required files. The aggregate focus gate passed, so Phase 4 is not a general context explosion. The failure is uneven closure: strong results on two tasks coexist with severe omissions and cross-language noise on the other two.

## Target Findings

| Target | Coverage | Focus | Missing facets | Additional failure |
| --- | ---: | ---: | --- | --- |
| TypeScript generated compound | 0.4000 | 1.0000 | parser, compatibility, generated artifact | confidence 0.71 while incomplete |
| Python parser/compatibility | 1.0000 | 0.8000 | none | selected forbidden historic document |
| Go parser/compatibility | 1.0000 | 0.6667 | none | selected unrelated Python and Rust files |
| Rust parser/compatibility | 0.7500 | 0.4286 | parser | selected unrelated Python and Go files |

Python and Go achieved complete required-file and facet closure. Focused verification was recovered for all four languages. The current graph therefore contains useful evidence; the planner does not apply it consistently.

## Diagnosed Failure Class

The first observation supports one general failure class: **compound-task facet closure is not ownership constrained**.

- The planner can stop after implementation and verification even when explicit parser, compatibility, or generated obligations remain.
- Lexical similarity can outrank same-language and same-ownership evidence after the primary route is found.
- Generated provenance is indexed but does not become a required task obligation.
- Confidence can remain too high when explicit facets are missing.

## Allowed Repair Direction

One general mechanism repair is allowed for this failure class:

1. Derive bounded facet obligations from explicit clauses.
2. Prefer relation-connected evidence inside the anchor's language and ownership scope.
3. Use indexed generated provenance when a generated output is explicitly requested.
4. Penalize unrelated scope expansion and cap confidence while any explicit facet is unclosed.

The repair cannot contain fixture paths, target IDs, symbol names, repository names, or language-specific expected filenames.

## Claim Boundary

This is disclosed synthetic development evidence, not Round 26 qualification. It does not establish Token savings, fewer tool calls, faster completion, or improved end-to-end Agent correctness. npm `latest` remains on 0.4.
