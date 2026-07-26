# Held-out Confidence Calibration Target Selection Protocol (0.4 Alpha, Round 8)

## Status and Claim Boundary

Preregistered before inspecting any Round 8 repository history, diff, commit
subject, or task, and before invoking Vertex Palace on a candidate task. The
English and Simplified Chinese protocols, repository pool, selector, classifier,
and contract tests must be committed before selection runs.

The repositories are held out from Vertex Palace development and all prior
research pools. This does not claim that the underlying model has never
encountered these public repositories.

## Frozen Paired Products

Round 8 plans a paired baseline-versus-candidate calibration comparison on the
same newly selected tasks. Both products existed and were frozen before the new
repository pool was chosen.

| Role | Product commit | CLI SHA-256 |
| --- | --- | --- |
| Baseline, before the independent task-anchor confidence cap | `228c3bde47f6930023496fdd0a54d43dba10091f` | `E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F` |
| Candidate, with the independent task-anchor confidence cap | `1a02d89269acb36473db3ad39badab9fe338a4a3` | `49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747` |

Both CLIs use `dist/palace.cjs`. The baseline CLI was rebuilt offline from its
commit and hash-verified before preregistration. Candidate runtime paths are
`packages/` and `plugins/vertex-palace/mcp/server.cjs`; the selector refuses to
run if those paths or the candidate CLI hash differ.

## Why a New Held-out Round Is Required

The disclosed Round 7 regression set showed that the candidate removed four
false-high confidence cases without changing any of the sixteen routes. That
result is useful but cannot establish generalization because the repair was
designed after those tasks were known.

Round 8 therefore keeps the Round 7 sampling rules unchanged and selects a new
candidate-held-out set. The later validator will compare the frozen baseline and
candidate on identical tasks. A confidence change is not a routing improvement:
coverage, focus, mode choice, and delivered context remain separate outcomes.
Lower confidence can increase context, so no Token or speed claim follows from
calibration alone.

## Complete Exclusion Boundary

The exclusion set contains 81 repositories: the 65 repositories already
excluded by Round 7 plus all 16 repositories in the Round 7 pool, including
uninspected fallbacks. The preregistration test mechanically derives this union
and requires exact equality with Round 8 `previouslyObservedRepositories`.

Organization or ecosystem overlap is still possible and will be reported as a
limitation. Repository URLs cannot repeat.

## Study Size and Repository Order

Round 8 selects eight targets: exactly two each from JavaScript/TypeScript,
Python, Go, and Rust. Each family has four repositories in a binding interleaved
order. The first two repositories with eligible commits win; remaining members
of that family are not inspected after its quota is full.

Pinned HEAD values were obtained only with `git ls-remote <url> HEAD`. No new
repository history, diff, subject, or task was read while choosing this order.

| Order | Repository | Family | Role | Pinned HEAD |
| ---: | --- | --- | --- | --- |
| 1 | yargs/yargs | JavaScript/TypeScript | primary | `db916b4154271e4cbbd2c60618fab90bdc1dbac2` |
| 2 | sqlalchemy/sqlalchemy | Python | primary | `aa1a5575358d3aa14953b04dced02f4763fed2e7` |
| 3 | uber-go/zap | Go | primary | `5b81b37b81b8e2ed447a6f57991e372ee4fa5c8f` |
| 4 | rust-lang/regex | Rust | primary | `2b527599eb9eea0dcc288c704584f242f26a5c61` |
| 5 | sinonjs/sinon | JavaScript/TypeScript | primary | `ab289e92cdd76caf8cec2b0a8c9a391283e6c9df` |
| 6 | Textualize/rich | Python | primary | `9d8f9a372cc5916fd4781fec207ced7ddac2f08f` |
| 7 | spf13/viper | Go | primary | `528f7416c4b56a4948673984b190bf8713f0c3c4` |
| 8 | crossbeam-rs/crossbeam | Rust | primary | `b23b7e8eca2efdad9bdc1ceb1aee1207a852c03b` |
| 9 | prettier/prettier | JavaScript/TypeScript | fallback 1 | `8ffc849446ffa4a882197dff4cdc7321f0d88972` |
| 10 | celery/celery | Python | fallback 1 | `dd7c23862eb08a2cfde7da6926f28410b699c077` |
| 11 | gorilla/mux | Go | fallback 1 | `db9d1d0073d27a0a2d9a8c1bc52aa0af4374d265` |
| 12 | rust-lang/hashbrown | Rust | fallback 1 | `227319c890c9663e953fdae44fd78e1c3a38bac3` |
| 13 | ajv-validator/ajv | JavaScript/TypeScript | fallback 2 | `f177fe323420ccb23e1a79445fd470cbf80aee7c` |
| 14 | scrapy/scrapy | Python | fallback 2 | `e710b9c18e18f0a3fe104fbfc72d49c221dfe448` |
| 15 | google/uuid | Go | fallback 2 | `2d3c2a9cc518326daf99a383f07c4d3c44317e4d` |
| 16 | hyperium/http | Rust | fallback 2 | `2178e175c4e247a33ba5f6ca3503afb1afbaabba` |

Frozen pool artifact:
`docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-8.json`

## Task Classification

The frozen `inflected-behavioral-subject-v1` classifier remains unchanged from
Rounds 6 and 7. Conventional `fix` and `feat`, plus tested base and inflected
forms of behavioral verbs, map mechanically to `bugfix` or `feature`. Ambiguous
maintenance subjects remain unclassified.

## Mechanical Commit Eligibility

For each inspected repository, the newest commit among at most 300 non-merge
commits is selected only when every condition holds:

1. Exactly one parent is available.
2. The first non-empty subject is 20 to 180 characters and receives a frozen
   task type.
3. The diff modifies 2 to 8 files; every status is `M`.
4. At least one implementation file and one focused test file use the
   repository's frozen primary-language extension list.
5. At most two modified documentation or configuration files are allowed; each
   must already exist at both compared commits and remains part of the oracle.
6. Allowed auxiliary extensions are `.cfg`, `.conf`, `.ini`, `.json`, `.md`,
   `.mdx`, `.rst`, `.toml`, `.txt`, `.yaml`, and `.yml`; `.flake8` and `go.mod`
   are also allowed by exact basename.
7. Generated output, lockfiles, vendor code, fixtures, snapshots, examples,
   benchmarks, build output, coverage, and distributions are excluded.
8. Total changed lines are 2 to 400, and every oracle file exists at both the
   route and ground-truth commits.

The unedited subject becomes the task. All modified eligible files, including
auxiliary files, form the oracle. No task is rewritten or replaced manually.

## Environment and Evidence Policy

Each repository may be materialized at most three times with a five-second
delay. Attempts are recorded. Only the next preregistered repository in the same
language family may follow a setup failure or no-eligible result.

Selection writes one create-only manifest:

`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-8.json`

The selector contains no Palace invocation path and records
`palaceCallsOnCandidateTasksDuringSelection: 0`. A failed selection manifest is
preserved without changing rules or replacing repositories. Selection alone is
not product validation. A separate paired validation protocol, validator, and
tests must be committed before any selected task is given to either Palace
version. The later calibration tolerance is preregistered as `0.15`.

## Command

Run only after all selection files are committed and the tracked worktree is
clean:

```powershell
node scripts/select-held-out-routing-targets-round-8.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-8.json
```
