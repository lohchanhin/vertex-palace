# Held-out Routing Target Selection Protocol (0.4 Alpha, Round 6)

## Status

Preregistered before inspecting any Round 6 repository history, diff, commit
subject, or task, and before invoking Vertex Palace on any candidate task. This
protocol, its Simplified Chinese counterpart, the repository-pool JSON, the
selector, the task classifier, and their tests must be committed before
selection runs.

This is candidate-held-out evidence: none of the Round 6 repository URLs has
appeared in a prior Vertex Palace development or research pool. It does not
claim that the underlying model has never encountered these public repositories.

## Frozen Product

- Product candidate:
  `f61207688badbe07818470a42441a3a966a8bdf0`
- CLI: `dist/palace.cjs`
- CLI SHA-256:
  `72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC`
- Frozen tracked paths: `packages/` and
  `plugins/vertex-palace/mcp/server.cjs`

Research files committed after the product candidate do not alter its runtime
paths. The selector refuses to run if those paths or the CLI hash differ.

## Why This Is a New Round

Round 5 was preserved as `selection-failed`: its frozen pool yielded seven of
eight targets and only one of two Python targets. Every repository materialized
on the first attempt; the narrow base-form subject classifier rejected all 300
Django subjects and 283 of 300 AnyIO subjects.

Round 6 changes only the research sampling classifier, not Vertex Palace. The
generic revision accepts common base and inflected behavioral prefixes. It was
implemented and tested before any Round 6 history was read. Round 5 targets are
not reused, and a Round 6 failure will be preserved rather than repaired in
place.

## Complete Exclusion Boundary

The exclusion set contains 53 repositories: all 41 repositories already
excluded by Round 5 plus all 12 repositories in the Round 5 pool, including
uninspected fallbacks. The preregistration test derives this union from the
frozen Round 5 pool and requires exact equality with Round 6
`previouslyObservedRepositories`.

Organization or ecosystem overlap is not repository independence. New
repositories from previously seen organizations remain possible, but repository
URLs cannot repeat. This limitation will remain visible in the final report.

## Study Size and Balance

Round 6 selects eight targets: exactly two each from JavaScript/TypeScript,
Python, Go, and Rust. Each family has three repositories in the binding pool.
The first two repositories with an eligible historical commit win. The third is
a fallback and is not inspected after both family slots are filled.

Repository order, language family, pinned HEAD, eligibility rules, classifier,
and fallback behavior were fixed before any Round 6 repository history was read.

## Frozen Repository Pool

Pinned HEAD values were obtained only with `git ls-remote <url> HEAD`. No commit
history, diff, subject, selected task, or Palace result was read while choosing
or ordering this pool.

| Order | Repository | Family | Role | Pinned HEAD |
| ---: | --- | --- | --- | --- |
| 1 | sindresorhus/ky | JavaScript/TypeScript | primary | `3419113b48e034fdcf8fa6bd3be3da7b3d0d758f` |
| 2 | pallets/werkzeug | Python | primary | `1b00618e787f40dfb21eba29caf8f8be7c8e1d93` |
| 3 | golang-jwt/jwt | Go | primary | `1a11d3724e63105d751decf9adbdc90165137b45` |
| 4 | dtolnay/anyhow | Rust | primary | `1dbe1862aae650423e3361fbd20b7d17c5109cc3` |
| 5 | chalk/chalk | JavaScript/TypeScript | primary | `e91293130c7d642c7b91152c3c942743a3b910a7` |
| 6 | psf/black | Python | primary | `db2e3e7b317b40685ba4618235a8388c7c6ea5e2` |
| 7 | Masterminds/semver | Go | primary | `8b89c86cb53c57cfd5d07c13de12bc4d78954e99` |
| 8 | tokio-rs/bytes | Rust | primary | `d5c8ad3227afe459c09f1d0d85455abf00f0381a` |
| 9 | npm/node-semver | JavaScript/TypeScript | fallback | `6e05b7637396ac66522cff8731f07cfe0ef49a29` |
| 10 | python-attrs/attrs | Python | fallback | `f06ceaafbe5bdbdafad8a0c01a2daabb89386a42` |
| 11 | go-chi/render | Go | fallback | `14f1cb3d5c2969d6e462632a205eacb6421eb4dc` |
| 12 | BurntSushi/bstr | Rust | fallback | `08a77375dfa8e3cf5473f8afd22f2552988a10cf` |

Frozen pool artifact:
`docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-6.json`

## Frozen Task Classifier

`scripts/lib/commit-task-classifier.cjs` defines
`inflected-behavioral-subject-v1`:

- Conventional Commit `fix` maps to `bugfix`; `feat` maps to `feature`.
- Feature prefixes include base and inflected forms of `Add`, `Allow`,
  `Create`, `Implement`, `Introduce`, `Support`, and `Enable`.
- Bugfix prefixes include base and inflected forms of `Fix`, `Debug`, `Repair`,
  `Correct`, `Resolve`, `Prevent`, and `Avoid`.
- Ambiguous maintenance prefixes such as `Refactor`, `Update`, `Bump`, and
  subsystem-only subjects remain unclassified.

The classifier derives only a task category. It does not inspect file contents
or rank repositories.

## Mechanical Commit Eligibility

For each inspected repository, the newest commit among at most 300 non-merge
commits is selected only when every condition holds:

1. The commit has exactly one parent, and the parent is available.
2. Its first non-empty subject line has 20 to 180 characters and receives a
   task type from the frozen classifier.
3. The diff modifies two to six files. Added, deleted, copied, and renamed files
   are ineligible.
4. Every changed file uses the repository's frozen source extension list.
5. Documentation, examples, fixtures, snapshots, generated output, lockfiles,
   vendored files, and benchmark paths are excluded.
6. The diff contains at least one implementation file and one focused test file.
7. Total changed lines are between 2 and 400.
8. Every oracle file exists at both the route commit and ground-truth commit.

The unedited commit subject becomes the task. The complete modified-file diff
becomes the oracle. There is no manual rewriting, cherry-picking, or target
replacement.

## Environment and Evidence Policy

Each repository may be materialized at most three times with a five-second
delay. Every attempt is recorded. Only the next already-preregistered repository
in the same language family may replace a setup failure or no-eligible result.

Selection writes one create-only manifest:

`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-6.json`

The selector records every inspected, rejected, selected, skipped, and
setup-failed repository. It contains
`palaceCallsOnCandidateTasksDuringSelection: 0` and has no Palace invocation
path. Selection alone cannot pass or fail the product. A separate validation
protocol and harness must be committed before any selected task is given to
Palace.

## Command

Run only after all selection-stage files are committed and the tracked worktree
is clean:

```powershell
node scripts/select-held-out-routing-targets-round-6.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-6.json
```
