# Held-out Routing Target Selection Protocol (0.4 Alpha, Round 5)

## Status

Preregistered before inspecting any candidate repository history, diff, commit
subject, or task, and before invoking Vertex Palace on any candidate task. This
protocol, its Simplified Chinese counterpart, the repository-pool JSON, the
selector, and their regression test must be committed before selection runs.

This is candidate-held-out evidence: none of these repository URLs has appeared
in a prior Vertex Palace development or research pool. It is not a claim that
the underlying model has never encountered these public repositories.

## Frozen Product

- Product candidate:
  `f61207688badbe07818470a42441a3a966a8bdf0`
- CLI: `dist/palace.cjs`
- CLI SHA-256:
  `72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC`
- Frozen tracked paths: `packages/` and
  `plugins/vertex-palace/mcp/server.cjs`

Research files committed after this candidate do not alter the frozen runtime
paths. The selector refuses to run if those paths differ from the candidate or
if the CLI hash differs.

## Complete Exclusion Boundary

The pool excludes every URL in the Round 4 pool and every repository already
excluded by Round 4. The resulting exclusion set contains 41 repositories,
including prior primary targets and uninspected fallbacks. The preregistration
test derives this union from the frozen Round 4 pool and requires exact equality
with Round 5 `previouslyObservedRepositories`.

Organization or ecosystem overlap is not repository independence. Round 5
includes new repositories from organizations seen before, such as Tokio and
Serde. This limitation is declared and will remain visible in the final report.

## Study Size and Balance

Round 5 selects eight targets: exactly two each from JavaScript/TypeScript,
Python, Go, and Rust. Each family has three repositories in the binding pool.
The first two repositories with an eligible historical commit win. The third is
a fallback and is not inspected after both family slots are filled.

Repository order, language family, pinned HEAD, eligibility rules, and fallback
behavior were fixed before any repository history was read.

## Frozen Repository Pool

Pinned HEAD values were obtained only with `git ls-remote <url> HEAD`. No commit
history, diff, subject, selected task, or Palace result was read while choosing
or ordering this pool.

| Order | Repository | Family | Role | Pinned HEAD |
| ---: | --- | --- | --- | --- |
| 1 | sindresorhus/got | JavaScript/TypeScript | primary | `e3924aa1e53a6ca3eb93a43618ce532442a89b40` |
| 2 | django/django | Python | primary | `957d0cee7167757ae221ffde59d2cf0a322e89c7` |
| 3 | stretchr/testify | Go | primary | `001eb7946baf451879253643e4ce4b38eaa0d4a7` |
| 4 | tokio-rs/tokio | Rust | primary | `818e2dd866e0d6b0e25ebad8508722efa3a2f8fb` |
| 5 | vitest-dev/vitest | JavaScript/TypeScript | primary | `a31f86af738b2979905f6a61eb5d8848d489eed7` |
| 6 | python-trio/trio | Python | primary | `d0e762f56c80c2f6ca3603dc66a2595b3237e8c6` |
| 7 | go-resty/resty | Go | primary | `29010be3b22dde872740e1e39e50cf8c0eba189c` |
| 8 | serde-rs/serde | Rust | primary | `747814f7d5fbab872df3b02f070c165b91bde062` |
| 9 | TanStack/query | JavaScript/TypeScript | fallback | `fd50fa14d283c7d6664a796f758498d1ad5bfce7` |
| 10 | agronholm/anyio | Python | fallback | `caca0e076d4052fca751f1a6b5e248bb4901f6cd` |
| 11 | rs/zerolog | Go | fallback | `9c53f4ea79c89f42478eb1e0c0414e4d68594506` |
| 12 | tower-rs/tower-http | Rust | fallback | `44bed484bf03f70782b1011b6cb527abb83e675c` |

Frozen pool artifact:
`docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-5.json`

The pool SHA-256 will be recorded after these preregistration files are
committed and before selection runs.

## Mechanical Commit Eligibility

For each inspected repository, the newest commit among at most 300 non-merge
commits is selected only when every condition holds:

1. The commit has exactly one parent, and the parent is available.
2. Its first non-empty subject line has 20 to 180 characters.
3. Expected task type is mechanically derivable before Palace exposure:
   - Conventional Commit `fix` maps to `bugfix`.
   - Conventional Commit `feat` maps to `feature`.
   - A subject beginning with `Add`, `Allow`, `Create`, `Implement`, or
     `Support` maps to `feature`.
   - A subject beginning with `Fix`, `Debug`, `Repair`, `Correct`, or
     `Resolve` maps to `bugfix`.
4. The diff modifies two to six files. Added, deleted, copied, and renamed files
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
becomes a setup failure, and only the next already-preregistered repository in
the same language family may be inspected.

No outcome-dependent repository substitution is allowed.

## Evidence Preservation

Selection writes one create-only manifest:

`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-5.json`

The selector records every inspected, rejected, selected, skipped, and
setup-failed repository, including rejection counts and materialization
attempts. It contains `palaceCallsOnCandidateTasksDuringSelection: 0` and has no
Palace invocation path.

Selection alone cannot pass or fail the product. After the manifest is
committed and hashed, a separate protocol and one-shot validation harness must
be committed before any selected task is given to Palace.

## Command

Run only after all selection-stage files are committed and the tracked worktree
is clean:

```powershell
node scripts/select-held-out-routing-targets-round-5.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-5.json
```
