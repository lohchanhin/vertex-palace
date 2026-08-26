# Vertex Palace 0.4.0-alpha.1 Release Verification

Date: 2026-08-26

Status: passed for prerelease publication under npm dist-tag `next`

## Release Boundary

`0.4.0-alpha.1` is an advisory routing preview, not a stable performance claim. Version `0.3.0` remains npm `latest`; this release is intended for explicit alpha testing through `vertex-palace@next` and Git tag `v0.4.0-alpha.1`.

The product source was committed before the final clean-install run:

- source commit: `9af77d724929b2acac79c82ce0067173caf3d4d2`
- source tree dirty during final package verification: `false`
- package: `vertex-palace@0.4.0-alpha.1`
- tarball files: `7`
- compressed size: `3,826,552` bytes
- SHA-1: `dc1a71899664df84be2ce94428e7d6ffc858207d`
- integrity: `sha512-XYninBJESrbcggJWfXLHuq+7E8zGdhwLweABF5BcRLXxZoTJ1Q4xN8scdSWCGk2bheHGtiMZObQ4zIRi3mptyQ==`

Machine-readable evidence: [release-candidate-0.4.0-alpha.1.json](evidence/release-candidate-0.4.0-alpha.1.json)

## Gates

| Gate | Result |
| --- | --- |
| `pnpm build` | Passed for all workspaces, package CLI, and bundled plugin MCP |
| `pnpm lint` | Passed TypeScript no-emit checks |
| `pnpm test` | Passed 238 workspace tests; 239 research checks passed and 2 preserved failure-state checks were skipped as not applicable |
| `pnpm test:mcp-smoke` | Passed, 10 MCP tools, reported version `0.4.0-alpha.1` |
| `pnpm test:release-candidate` | Passed from a packed tarball installed into a clean temporary project |
| `npm pack --dry-run --json` | Passed with exactly 7 public package entries |
| staged privacy and credential scan | No API key, npm token, GitHub token, or private key found; raw Codex session audit excluded |

## Installed-Package Contract

The clean-install verifier ran four deterministic 240-distractor trials. All four selected advisory `full-palace`, identified `src/format-currency.mjs:1` as the starting Primary, reported missing verification evidence, and kept `stopEnforced` false. Each delivered 1,593 estimated tokens inside the 6,000-token ceiling.

The same tarball also passed:

- one relevant decision-memory inclusion with no exclusion;
- Aurora tenant inference with both scoped memories included and the shared token demoted to Support;
- a 50-candidate guarded-memory ceiling with 3 included and 47 auditable exclusions;
- installed MCP startup and tool-list/context smoke testing.

## Failure Preserved During Release

The first clean-install run failed because the verifier still required the `0.3.0` five-field bypass schema. The product correctly returned the new `0.4` advisory full context when verification evidence was missing. The verifier was updated to assert the new safety contract, then rerun against the packed and installed artifact. Product behavior was not weakened to satisfy the old assertion.

## Public Registry Verification

The prerelease was published to the public npm registry at `2026-08-26T04:28:38.351Z` and then installed by package name from a new temporary project with a new npm cache and the public registry explicitly selected.

| Check | Result |
| --- | --- |
| exact public version | `vertex-palace@0.4.0-alpha.1` |
| npm dist-tags | `latest=0.3.0`, `next=0.4.0-alpha.1` |
| public SHA-1 | `dc1a71899664df84be2ce94428e7d6ffc858207d`, matching the verified tarball |
| installed CLI | Reported `0.4.0-alpha.1` |
| installed MCP | Passed initialization, listed 10 tools, and completed `palace_context` in `full-palace` mode |
| installed CLI context | Completed `context --auto --format json` in the clean project |

The stable npm channel was deliberately left unchanged. Users must explicitly install this preview with `npm install vertex-palace@next`.

## Claim Limit

The disclosed 13-file post-observation replay reached 13/13 coverage and 1.00 focus, but the abstract eight-file self-evaluation reached only 3/8, and the frozen Round 19 held-out gate failed. This release therefore validates packaging, deterministic advisory behavior, memory isolation, context ceilings, and research traceability. It does not establish a general reduction in Agent tokens, wall time, or correctness errors.
