# Held-out Routing Target Selection Protocol (0.4 Alpha, Round 4)

## Status

Preregistered before inspecting any candidate repository history, diff, commit
subject, or task, and before invoking Vertex Palace on any candidate task. This
protocol, its Simplified Chinese counterpart, the repository-pool JSON, the
selector, and their regression test must be committed before selection runs.

This is candidate-held-out evidence: none of these repository URLs has appeared
in prior Vertex Palace development or research pools. It is not a claim that an
underlying model has never encountered the public repositories.

## Frozen Product

- Product candidate:
  `efd53274e42fb8123745f2b8bb09a24e4fa384b7`
- CLI: `dist/palace.cjs`
- CLI SHA-256:
  `E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0`
- Frozen tracked paths: `packages/` and
  `plugins/vertex-palace/mcp/server.cjs`

The research reports and harness files committed after the product candidate do
not alter these frozen runtime paths. Selection refuses to run if the current
runtime paths differ from the candidate or if the CLI hash differs.

## Complete Exclusion Boundary

The pool excludes every repository URL recorded by the Round 3 selector,
including earlier development targets and uninspected fallbacks. The exclusion
set contains 29 repositories. The regression test derives that set from the
frozen Round 3 manifest and requires exact equality with the new pool's
`previouslyObservedRepositories`.

Organization or ecosystem overlap is not treated as repository reuse. For
example, Uvicorn is a new repository even though other Encode repositories were
previously observed. This is a declared limitation, not hidden independence.

## Study Size And Balance

Round 4 selects eight targets: exactly two each from
JavaScript/TypeScript, Python, Go, and Rust. Each family has three repositories
in the binding pool. The first two with an eligible historical commit win; the
third is a fallback and is not inspected after both family slots are filled.

Repository order, language family, pinned HEAD, eligibility rules, and fallback
behavior are fixed before any history is read.

## Frozen Repository Pool

Pinned HEAD values were obtained only with `git ls-remote <url> HEAD`. No commit
history, diff, subject, target task, or Palace result was read while choosing or
ordering this pool.

| Order | Repository | Family | Role | Pinned HEAD |
| ---: | --- | --- | --- | --- |
| 1 | nodejs/undici | JavaScript/TypeScript | primary | `9f09b49accd391cca818409447f2fb8bc93229b3` |
| 2 | aio-libs/aiohttp | Python | primary | `7ffc8aeb6cd644fb3b2b41ae3b4d787d4b8217d4` |
| 3 | go-playground/validator | Go | primary | `fd8bd3c9d513cd1d29e495974fa07dba7a2b5936` |
| 4 | tokio-rs/tracing | Rust | primary | `d9d4c542de10f5d3a711b7a45ffe450fd0666437` |
| 5 | mswjs/msw | JavaScript/TypeScript | primary | `49d9d47f613b072f8d20e1a025feaee7c5382b2b` |
| 6 | encode/uvicorn | Python | primary | `d26c85c27bb8ea66237ff43f90ca23b774a3c1ce` |
| 7 | go-gorm/gorm | Go | primary | `1d6ce99528060be18a42be09aca8d39efcb47f28` |
| 8 | seanmonstar/reqwest | Rust | primary | `221abe9ec921e22fe1bafaed47b51b03bed4b7c3` |
| 9 | vitejs/vite | JavaScript/TypeScript | fallback | `791843e1591ec2d65a401560bc1fc0a85b32ee32` |
| 10 | python-poetry/poetry | Python | fallback | `f46702336862f30050d5c641d5ed6f7568ded793` |
| 11 | redis/go-redis | Go | fallback | `5c82f57a47e097b32509ac2abd3d7c9d57f5100b` |
| 12 | rayon-rs/rayon | Rust | fallback | `1f9bb2538e50f1e6d1bc2e3d06a361ba2af0b632` |

Frozen pool artifact:
`docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-4.json`

Pool SHA-256:
`DF36C82D51AF4B91DF6E67E9848AD54EBB5FE99E9F4DF03498BC1A0FFD6E1A0A`

## Mechanical Commit Eligibility

For each inspected repository, the newest commit among at most 300 non-merge
commits is selected only when all conditions hold:

1. The commit has exactly one parent, and the parent is available.
2. Its first non-empty subject line has 20 to 180 characters.
3. Expected task type is mechanically derivable before Palace exposure:
   - Conventional Commit `fix` maps to `bugfix`.
   - Conventional Commit `feat` maps to `feature`.
   - A subject beginning with `Add`, `Allow`, `Create`, `Implement`, or
     `Support` maps to `feature`.
   - A subject beginning with `Fix`, `Debug`, `Repair`, `Correct`, or
     `Resolve` maps to `bugfix`.
4. The diff modifies two to six files. Added, deleted, copied, or renamed files
   are ineligible.
5. Every changed file uses the repository's frozen source extension list.
6. Documentation, examples, fixtures, snapshots, generated output, lockfiles,
   vendored files, and benchmark paths are excluded.
7. The diff contains at least one implementation file and one focused test
   file.
8. Total changed lines are between 2 and 400.
9. Every oracle file exists at both the route commit and ground-truth commit.

The unedited commit subject becomes the task. The complete modified-file diff
becomes the oracle. There is no manual rewriting, cherry-picking, or target
replacement.

## Environment Policy

Each repository may be materialized at most three times, with a five-second
delay. Every attempt is recorded. A repository that still cannot be prepared
becomes a setup failure and only the next already-preregistered repository in
the same language family may be inspected.

No outcome-dependent repository substitution is allowed.

## Evidence Preservation

Selection writes one create-only manifest:

`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-4.json`

The selector refuses to overwrite it. The manifest records all inspected,
rejected, selected, skipped, and setup-failed repositories, including rejection
counts and materialization attempts.

Selection alone cannot pass or fail the product. After the manifest is
committed and hashed, a separate validation protocol and harness must be
committed before any selected task is given to Palace.

## Command

Run only after all selection-stage files are committed and the tracked worktree
is clean:

```powershell
node scripts/select-held-out-routing-targets-round-4.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-4.json
```
