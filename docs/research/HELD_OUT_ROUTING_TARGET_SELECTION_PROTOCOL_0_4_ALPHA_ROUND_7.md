# Held-out Routing Target Selection Protocol (0.4 Alpha, Round 7)

## Status and Claim Boundary

Preregistered before inspecting any Round 7 repository history, diff, commit
subject, or task, and before invoking Vertex Palace on a candidate task. The
English and Simplified Chinese protocols, repository pool, selector, classifier,
and tests must be committed before selection runs.

The repositories are held out from Vertex Palace development and prior research
pools. This does not claim that the underlying model has never encountered these
public repositories.

## Frozen Product

- Product commit: `f61207688badbe07818470a42441a3a966a8bdf0`
- CLI: `dist/palace.cjs`
- CLI SHA-256:
  `72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC`
- Frozen runtime paths: `packages/` and
  `plugins/vertex-palace/mcp/server.cjs`

The selector refuses to run if the frozen paths or CLI hash differ.

## Protocol Revision Before New History

Round 5 and Round 6 each produced only seven of eight targets, with one of two
Python targets. Both failures had zero Palace calls and no environment failures.
Round 6 showed that the inflected task classifier improved subject eligibility,
but a source-only oracle could still reject realistic commits that also modified
documentation, changelogs, or configuration.

Round 7 changes research sampling only; Vertex Palace remains frozen. Before any
new history is read, it makes two generic revisions:

1. Four repositories are preregistered per language family instead of three.
2. Every target must still include implementation and focused-test source files,
   but may also include at most two modified documentation or configuration
   files. Those auxiliary files remain part of the oracle.

Generated output, locks, vendor code, fixtures, snapshots, examples, and
benchmarks remain excluded. A failed Round 7 manifest will be preserved without
changing these rules or replacing repositories.

## Complete Exclusion Boundary

The exclusion set contains 65 repositories: the 53 repositories already
excluded by Round 6 plus all 12 repositories in the Round 6 pool, including
uninspected fallbacks. The preregistration test mechanically derives this union
and requires exact equality with Round 7 `previouslyObservedRepositories`.

Organization or ecosystem overlap is still possible and will be reported as a
limitation. Repository URLs cannot repeat.

## Study Size and Repository Order

Round 7 selects eight targets: exactly two each from JavaScript/TypeScript,
Python, Go, and Rust. Each family has four repositories in a binding interleaved
order. The first two repositories with eligible commits win; remaining members
of that family are not inspected after its quota is full.

Pinned HEAD values were obtained only with `git ls-remote <url> HEAD`. No new
repository history, diff, subject, or task was read while choosing this order.

| Order | Repository | Family | Role | Pinned HEAD |
| ---: | --- | --- | --- | --- |
| 1 | sindresorhus/execa | JavaScript/TypeScript | primary | `499fe800361e6b383b0085f635a69fd27e6cf447` |
| 2 | pallets/jinja | Python | primary | `5ef70112a1ff19c05324ff889dd30405b1002044` |
| 3 | hashicorp/go-multierror | Go | primary | `6d4d48630db25c3c83fa83ecd41dd8438b82963c` |
| 4 | dtolnay/thiserror | Rust | primary | `aa9d91f75302025e0c1d4c535d84a5bfdad62508` |
| 5 | isaacs/node-glob | JavaScript/TypeScript | primary | `9f70854bd1d0bc7e715622a6df987f34d180248e` |
| 6 | encode/httpcore | Python | primary | `10a658221deb38a4c5b16db55ab554b0bf731707` |
| 7 | julienschmidt/httprouter | Go | primary | `484018016424d215c0b87c42f4c9b57d980fbd00` |
| 8 | tokio-rs/mio | Rust | primary | `7654f571f2474a1774a4f6e1004a4c17c50f64c7` |
| 9 | floating-ui/floating-ui | JavaScript/TypeScript | fallback 1 | `12d94738472e922e1b3fa31b02b2b61b9ed77e6a` |
| 10 | tox-dev/tox | Python | fallback 1 | `ccb12fc2e1bb9df0da860be4af175e9b97949fbc` |
| 11 | rs/cors | Go | fallback 1 | `2f30c9cf7731f7b5e0e372678d05acb22f2c2b4a` |
| 12 | rustls/rustls | Rust | fallback 1 | `bd9f7f59aa790da07010961188209e68384febe5` |
| 13 | reduxjs/redux-toolkit | JavaScript/TypeScript | fallback 2 | `58bb0e04c1e957f07b732b25473e13a0f975302a` |
| 14 | python-hyper/h11 | Python | fallback 2 | `62c5068c971579d61fa1b55373390e12f25fd856` |
| 15 | go-playground/universal-translator | Go | fallback 2 | `f83cd526536e253181a13835b00cd107f627c505` |
| 16 | indexmap-rs/indexmap | Rust | fallback 2 | `571943c5b3ec56eb2710e4bcbdda25557f7b3e49` |

Frozen pool artifact:
`docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-7.json`

## Task Classification

The frozen `inflected-behavioral-subject-v1` classifier remains unchanged from
Round 6. Conventional `fix` and `feat`, plus tested base and inflected forms of
behavioral verbs, map mechanically to `bugfix` or `feature`. Ambiguous
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
5. At most two other files are allowed, and each must be an existing modified
   documentation or configuration file.
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

`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-7.json`

The selector contains no Palace invocation path and records
`palaceCallsOnCandidateTasksDuringSelection: 0`. Selection alone is not product
validation. A separate validation protocol and harness must be committed before
any selected task is given to Palace.

## Command

Run only after all selection files are committed and the tracked worktree is
clean:

```powershell
node scripts/select-held-out-routing-targets-round-7.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-7.json
```
