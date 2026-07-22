# Route Precision After Self-Audit Protocol 0.4 Alpha

Status: preregistered regression protocol. The candidate results described here have not been observed when this protocol is committed.

## Question

Does the routing and freshness repair at product commit `543a670ff06d65d8df3fe6d63f0915918812aaaf` preserve the previously observed cross-repository routes while also repairing the bilingual six-artifact Vertex Palace self-audit and the permanently stale generated-artifact index state?

## Claim Boundary

This is a seen-target regression study. Zod, Requests, p-limit, and the Vertex Palace research artifacts have all influenced development before this run. A pass can establish compatibility with these frozen targets, but cannot establish held-out generalization or end-to-end Agent Token, time, or task-success improvements.

## Candidate Freeze

- Product commit: `543a670ff06d65d8df3fe6d63f0915918812aaaf`
- Harness: `scripts/verify-route-precision-after-self-audit.cjs`
- The harness records its own Git commit in the evidence file.
- Product source, packages, build configuration, lockfiles, and generated MCP bundle must remain identical to the product commit before and after build.
- The historical harness, protocol, and first evidence file are not modified or overwritten.

## Cross-Repository Targets

The external repository set, tasks, changed-file oracles, and accepted boundaries remain identical to the first replication.

| Repository | Route commit | Changed-file oracle | Accepted route boundary |
| --- | --- | --- | --- |
| Zod | `912f0f51b0ced654d0069741e7160834dca742ee` | `packages/zod/src/v4/core/schemas.ts`; focused discriminated-union test | exactly those two files |
| Requests | `f361ead047be5cb873174218582f7d8b9fcd9f49` | `src/requests/sessions.py`; `tests/test_requests.py` | exactly those two files |
| p-limit | `c944e4a4363ff41a7202d5dec346cc174c3ecf49` | real diff to `ccb80b2721a6a4a27ce5ad7721fe939162a35b31` | `index.d.ts`, `index.test-d.ts`, and `package.json` |

## Bilingual Self-Audit

The harness clones Vertex Palace at the frozen product commit and copies the frozen built `dist/palace.cjs` into that clone as an ignored, declared generated artifact. It then runs `init`, `index`, and `status` before routing either task.

Both an English task and an equivalent Simplified Chinese task must recover this six-file family:

1. `scripts/verify-route-precision-cross-repositories.cjs`
2. `docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md`
3. `docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md`
4. `docs/research/evidence/cross-repository-route-precision-0.4-alpha.json`
5. `docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md`
6. `docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md`

`tsconfig.base.json` is the only additional accepted route file because the frozen-protocol wording explicitly requests a configuration surface. It does not count as changed-file coverage.

## Execution

- Build the frozen candidate once from the current repository.
- Clone each external target at its pinned commit into a fresh OS temporary directory.
- Run `evaluate` followed by `context --auto` twice per external target.
- Clone Vertex Palace at the product commit into the temporary directory.
- Explicitly initialize and index the self-audit clone, then observe status once.
- Run `evaluate` followed by `context --auto` twice for each self-audit language.
- Use budget `6000`, route limit `9`, and maximum drawers `4` throughout.
- Preserve command, parse, setup, and partial-trial failures in the evidence.
- Do not modify tracked files in any target repository.

## Frozen Gates

Every external repository must satisfy:

1. Two completed trials.
2. Changed-file coverage `1.00`.
3. Accepted-boundary precision `1.00`.
4. Identical route files across repetitions.
5. No overconfident route.
6. Context at or below 6000 estimated tokens.
7. No overlap between selected and excluded boundaries.
8. Clean tracked worktree.

Each English and Simplified Chinese self-audit must additionally satisfy:

1. Changed-file coverage `1.00` for all six artifacts.
2. Route focus at least `0.75`.
3. No more than `8` route files.
4. Accepted-boundary precision `1.00`.
5. Identical route files across repetitions.
6. No overconfident route.

The explicit self-audit status immediately after indexing must report `stale: false`.

## Evidence Preservation

Run exactly:

```powershell
node scripts/verify-route-precision-after-self-audit.cjs --out docs/research/evidence/route-precision-after-self-audit-0.4-alpha.json
```

The output path is required and written with create-only semantics. A retry must use a different path; the first observation cannot be overwritten.

## Decision Rule

A pass promotes this candidate only to the next static gate: a genuinely unseen repository and real historical task selected and preregistered before routing. A failure remains part of the permanent record and must be diagnosed without changing these gates.
