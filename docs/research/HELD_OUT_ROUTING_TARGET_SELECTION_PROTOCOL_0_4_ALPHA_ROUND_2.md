# Held-out Routing Target Selection Protocol (0.4 Alpha, Round 2)

## Status

Preregistered before inspecting any repository history or invoking Vertex Palace on any candidate task. This protocol and `scripts/select-held-out-routing-targets-round-2.cjs` must be committed before selection runs.

## Frozen Product

The product candidate is `0ef19a7bbef1901d813b81389405f87482db47c5`. Product source, generated MCP bundle, package metadata, and build configuration are frozen during selection and held-out validation.

Repositories previously used by product development or research are excluded: Zod, Requests, p-limit, Fastify, Click, date-fns, ripgrep, Cobra, and Marked. The second-round pool contains no repository URL appearing in those studies.

## Repository Pool

Pool order and pinned HEAD values are binding. HEAD values were obtained with `git ls-remote <url> HEAD`, without reading commit histories, diffs, task subjects, or route outcomes.

| Order | Repository | Family | Pinned HEAD |
| ---: | --- | --- | --- |
| 1 | [expressjs/express](https://github.com/expressjs/express) | JavaScript | `ae6dd37680e3a00618d6c8a3e522f0ee4eeba1a4` |
| 2 | [encode/httpx](https://github.com/encode/httpx) | Python | `b5addb64f0161ff6bfe94c124ef76f6a1fba5254` |
| 3 | [urfave/cli](https://github.com/urfave/cli) | Go | `c6f4cf7e9223793478cfcde9b8f135cc8f86e78f` |
| 4 | [clap-rs/clap](https://github.com/clap-rs/clap) | Rust | `466b2be56c5811d1af62c407f5a00456350ece62` |
| 5 | [tj/commander.js](https://github.com/tj/commander.js) | JavaScript/TypeScript | `ba6d13ddb4243e5913367734f8c159089ffe7834` |
| 6 | [pytest-dev/pytest](https://github.com/pytest-dev/pytest) | Python | `b4e846616cbb0ba74dc548f7066b09d820f5dc05` |
| 7 | [go-chi/chi](https://github.com/go-chi/chi) | Go | `8b258c7bb28f97a5f2a856ff7ef962578fec9215` |
| 8 | [tokio-rs/axum](https://github.com/tokio-rs/axum) | Rust | `0704574455272caa79ff3ae8207adf8f620516c9` |

The selector must produce six targets and include JavaScript/TypeScript, Python, Go, and Rust. The first eligible repository for each missing language family wins its family slot. Two additional targets are filled in repository order. A repository from an already represented family is not inspected after both extra slots are occupied, unless its family is still missing.

## Mechanical Commit Selection

For every repository that the binding diversity algorithm reaches, the selector walks backward through at most 250 non-merge commits from the pinned HEAD. The newest commit satisfying every condition is selected:

1. Exactly one parent.
2. Commit subject is 20-180 characters and begins with a behavioral action such as fix, feat, add, allow, prevent, support, or improve.
3. The diff modifies 2-6 files, and every file status is `M`.
4. Every changed file uses the repository's declared source extension.
5. At least one changed file is implementation and at least one is a focused test path.
6. Documentation, generated output, fixtures, snapshots, benchmarks, examples, vendor files, build output, lockfiles, and binary diffs are excluded.
7. Total additions plus deletions are between 2 and 400 lines.

Task text is the unedited Git commit subject. The route commit is the selected commit's parent. The ground-truth commit and complete changed-file diff form the oracle.

The selector never invokes Vertex Palace. It writes one create-only manifest to `docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-2.json`. A failed selection manifest is preserved; no target can be manually substituted after history inspection.

## Validation Gates Fixed Before Selection

After the manifest is committed, a separate preregistered harness will run two sequential `evaluate` and `context --auto` trials per target using a 6,000-token budget, route limit 9, and maximum 4 drawers.

Promotion requires:

- all six targets complete both trials;
- task type remains `bugfix`;
- aggregate changed-file coverage at least `0.90`, with every target covering all declared implementation and test files;
- aggregate route focus and precision at least `0.75`, with no target below `0.50`;
- deterministic route files across repetitions;
- zero overconfident trials;
- context at or below 6,000 estimated tokens;
- fresh indexes, clean tracked worktrees, and no selected/excluded boundary overlap.

The aggregate coverage gate is less brittle than requiring every ancillary changed file, while the per-target implementation/test gate preserves the core multi-surface requirement. Product, harness-contract, and environment/setup failures will be reported separately. No failed target can be replaced after observation.

Passing remains static held-out routing evidence only. It cannot establish Agent correctness, Token savings, or execution speed.

## Selection Command

Run only after this protocol and selector are committed:

```powershell
node scripts/select-held-out-routing-targets-round-2.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-2.json
```
