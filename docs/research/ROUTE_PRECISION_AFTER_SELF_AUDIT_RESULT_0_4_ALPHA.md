# Route Precision After Self-Audit Result 0.4 Alpha

Status: passed the preregistered seen-target regression gate.

## Frozen Evidence

- Product commit: `543a670ff06d65d8df3fe6d63f0915918812aaaf`
- Protocol and harness commit: `d71e6c463c2f78817beddba3e63be7168cbe6c30`
- Raw evidence: `docs/research/evidence/route-precision-after-self-audit-0.4-alpha.json`
- Raw evidence SHA-256: `BA482B2E5B5C379A3FDD381893F354ACC76DC379B876E439F4CA584DD29C606A`
- First formal observation: `2026-07-22T17:12:36.247Z`
- Evidence status: `passed`, with zero recorded failures

The evidence file was written once with create-only semantics and committed separately before this interpretation was written.

## Why This Regression Was Necessary

The first frozen candidate preserved its three external routes but failed when asked to retrieve its own newly created research artifact family. Three post-result checks all returned zero of six target files and were overconfident:

| Check | Evaluation ID | Coverage | Confidence | Calibration |
| --- | --- | ---: | ---: | --- |
| Simplified Chinese | `evaluation_aed0f811252f98e3` | 0/6 | 0.81 | overconfident |
| English | `evaluation_52f0a0280b0cd1c1` | 0/6 | 0.72 | overconfident |
| English after explicit reindex | `evaluation_104e35f60fed62a0` | 0/6 | 0.72 | overconfident |

The investigation found two independent product defects:

1. Declared ignored generated artifacts were added to the stored index, but status compared that index against only the ordinary scan. The file-count mismatch made a freshly indexed self-hosting repository immediately stale.
2. Compound research tasks did not consistently separate test harness, protocol, narrative result, bilingual documentation, and machine-readable JSON evidence. An evidence JSON could consume the documentation quota, and older reports could outrank the current artifact family.

The candidate repaired status hashing for declared generated artifacts, added compound replication intent, and allocated artifact-family roles before this protocol was frozen.

## External Repository Regression

All six preregistered external trials completed. Routes were deterministic, stayed inside their accepted boundaries, did not overlap selected and excluded files, and left tracked target worktrees clean.

| Repository | Route files | Coverage | Focus | Confidence | Calibration | Context tokens |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Zod | 2 | 1.00 | 1.00 | 0.87 | well-calibrated | 2,277 |
| Requests | 2 | 1.00 | 1.00 | 0.72 | underconfident | 1,958 |
| p-limit | 3 | 1.00 | 0.67 | 0.55 | underconfident | 2,159 |
| Macro | - | **1.00** | **0.89** | - | 0 overconfident trials | max 2,277 |

These values reproduce the first frozen cross-repository observation. The routing repair did not regress the three previously seen TypeScript, Python, and declaration-focused targets.

## Bilingual Vertex Palace Self-Audit

The harness cloned the product commit, copied its built `dist/palace.cjs` as an ignored declared generated artifact, explicitly initialized and indexed the clone, and then checked status. The immediate result was `stale: false`.

Both language tasks completed twice with identical routes:

| Task language | Trials | Target files found | Route files | Coverage | Focus | Confidence | Calibration | Max context tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| English | 2/2 | 6/6 | 7 | 1.00 | 0.86 | 0.75 | underconfident | 4,827 |
| Simplified Chinese | 2/2 | 6/6 | 7 | 1.00 | 0.86 | 0.75 | underconfident | 4,795 |

The seventh file was the preregistered `tsconfig.base.json` configuration surface. It was accepted before observation because the task explicitly asks for a frozen protocol. No older unrelated report entered either route.

## Exploratory Recursive Audit

This audit happened after the formal evidence and was not preregistered. It does not change the formal pass, but it tests whether the repair generalized to the next artifact family created by the repair study itself.

| Scope | Evaluation ID | Target files found | Route files | Coverage | Focus | Confidence | Calibration |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Entire implementation and research stage | `evaluation_4276401182cd09ce` | 3/13 | 9 | 0.23 | 0.33 | 0.78 | overconfident |
| Product repair only | `evaluation_c4dfe215d01ce085` | 3/7 | 9 | 0.43 | 0.33 | 0.77 | overconfident |
| New research artifact family only | `evaluation_f728f4db638311d8` | 1/6 | 8 | 0.17 | 0.13 | 0.81 | overconfident |

The raw evaluation records were copied byte-for-byte from `.palace/evaluations/`:

- `exploratory-stage-aggregate-self-evaluation-0.4-alpha.json`: SHA-256 `5379DFF58B098B3A3D57DC0E63377CE8F148D6110ED68E42CFD933FB0287077C`
- `exploratory-product-fix-self-evaluation-0.4-alpha.json`: SHA-256 `4A519F8B4A268D6A20D84324B9139BCD628651CB73D193E170F3163E3C7CAD49`
- `exploratory-recursive-artifact-family-self-evaluation-0.4-alpha.json`: SHA-256 `EEAF9531B672805505C0F81F2CCB085D3A188C1A54ED25F9D42C5AB4683DE4D6`

The recursive task selected the old `CROSS_REPOSITORY_ROUTE_PRECISION_*` family instead of the new `ROUTE_PRECISION_AFTER_SELF_AUDIT_*` family. The product task found the three router modules but missed status freshness, both focused regressions, and the generated MCP bundle. This shows that the first repair solved its frozen example but did not yet generalize artifact-family identity or multi-problem role allocation.

## Product Verification

After preserving the formal evidence, the current tree passed:

- `npm run lint`
- `npm test`: 109 core, 2 CLI, and 2 MCP tests; 113 total
- `npm run test:mcp-smoke`: 10 MCP tools and guarded-memory context
- `npm run test:release-candidate`

## Interpretation

The formal result establishes a useful but narrow point: the routing repair resolved the frozen self-hosting artifact-family failure and permanent stale-state defect without regressing the three frozen external routes. The previously concrete `0/6` bilingual failure became `6/6`, with focus `0.86` and no overconfidence. The exploratory recursive audit then showed that this success does not yet transfer to the immediately following artifact family.

It does **not** establish:

- performance on a repository or task that did not influence development;
- reduced Agent-reported Token use;
- reduced wall time or tool calls;
- higher end-to-end coding-task success;
- benefit from long-term memory.

The external repositories and self-audit are all seen targets. Timing fields also mix cold and warm index states and remain diagnostic only.

## Decision

Record both outcomes: the candidate passed its preregistered seen-target gate, then failed an exploratory recursive-generalization check. Do not promote this candidate to held-out testing yet. First generalize artifact-family selection, preserve distinct status and routing implementation roles, cover their focused tests and generated bundle, and reduce confidence when requested roles remain unresolved. Freeze a new candidate and preregister both the old and new artifact families before selecting the held-out repository.
