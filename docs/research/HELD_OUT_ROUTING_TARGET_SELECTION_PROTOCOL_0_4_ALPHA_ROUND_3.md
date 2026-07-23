# Held-out Routing Target Selection Protocol (0.4 Alpha, Round 3)

## Status

Preregistered before inspecting any repository history, diff, commit subject, or candidate task, and before invoking Vertex Palace on any candidate repository. This protocol and `scripts/select-held-out-routing-targets-round-3.cjs` must be committed before selection runs.

## Frozen Product

The product candidate is `6060e0c6aa2aea64d0145c1e55bccdc4669e4b48`. Product source, generated MCP bundle, package metadata, lockfiles, workspace configuration, and build configuration are frozen during selection and held-out validation.

All repositories appearing in prior development or research pools are excluded: Zod, Requests, p-limit, Fastify, Click, date-fns, ripgrep, Cobra, Marked, Express, HTTPX, urfave/cli, Clap, Commander, pytest, chi, and axum. A repository is excluded even when it was only a reserved fallback in an earlier pool.

## Study Size And Balance

Round 3 selects eight targets: exactly two each from JavaScript/TypeScript, Python, Go, and Rust. This yields `16` sequential formal trials at two repetitions per target.

The pool is interleaved by language. The first two eligible repositories in each family win. The third repository in each family is a fallback and is not inspected once that family's two slots are filled. Repository order, language assignment, and pinned HEAD are binding.

## Repository Pool

Pinned HEAD values were obtained with `git ls-remote <url> HEAD`. No commit history, diff, subject, task, or Palace route was read while constructing the pool.

| Order | Repository | Family | Role | Pinned HEAD |
| ---: | --- | --- | --- | --- |
| 1 | [koajs/koa](https://github.com/koajs/koa) | JavaScript | primary | `52d5e8ff5ac79f2479463b53df2999900ae95115` |
| 2 | [encode/starlette](https://github.com/encode/starlette) | Python | primary | `5174d4c8358a6f06aa8056bafd14c2272dab8dd1` |
| 3 | [gin-gonic/gin](https://github.com/gin-gonic/gin) | Go | primary | `34dac209ffb6ef85cc78c5d217bbb7ad001d68fd` |
| 4 | [tower-rs/tower](https://github.com/tower-rs/tower) | Rust | primary | `df06d70dbea345facbffb5881fe8647f53bf424d` |
| 5 | [axios/axios](https://github.com/axios/axios) | JavaScript/TypeScript | primary | `311fcc5c8d989b7248f05d390bb83bfbfb009977` |
| 6 | [pallets/flask](https://github.com/pallets/flask) | Python | primary | `36e4a824f340fdee7ed50937ba8e7f6bc7d17f81` |
| 7 | [labstack/echo](https://github.com/labstack/echo) | Go | primary | `ed8bbe4b6cbf519766c99e492b9cc427404b3719` |
| 8 | [serde-rs/json](https://github.com/serde-rs/json) | Rust | primary | `de8500740cdcabffb9734f503e4889def823cf10` |
| 9 | [honojs/hono](https://github.com/honojs/hono) | TypeScript | fallback | `44f884321a1d52e98d45a85634da9d5f4751a43a` |
| 10 | [pydantic/pydantic](https://github.com/pydantic/pydantic) | Python | fallback | `7b3dd4cf4ba551c33c963f22627cdc566402d8f6` |
| 11 | [gofiber/fiber](https://github.com/gofiber/fiber) | Go | fallback | `23c4f5957f31120b3afd82d223d773fe41957a06` |
| 12 | [hyperium/hyper](https://github.com/hyperium/hyper) | Rust | fallback | `67ace6484db5d4a15367013847768f5f94f4b97d` |

The pool is deliberately language-balanced but is not a random sample of the software ecosystem. Passing can support bounded cross-repository generalization for this sample, not ecosystem-wide prevalence claims.

## Mechanical Commit Selection

For every repository reached by the binding family-quota algorithm, the selector walks backward through at most 300 non-merge commits from the pinned HEAD. The newest commit satisfying every condition is selected:

1. Exactly one parent.
2. The unedited subject is 20-180 characters.
3. Task type is mechanically unambiguous before routing: scoped or unscoped `fix:` maps to `bugfix`; scoped or unscoped `feat:` and subjects beginning with Add, Allow, Implement, or Support map to `feature`.
4. The diff modifies 2-6 files, and every file status is `M`.
5. Every changed file uses the repository's declared source extension.
6. At least one changed file is implementation and at least one is a focused test path.
7. Documentation, generated output, fixtures, snapshots, benchmarks, examples, vendor files, build output, lockfiles, and binary diffs are excluded.
8. Total additions plus deletions are between 2 and 400 lines.
9. Every oracle file exists at both the route commit and the ground-truth commit.

Task text is the unedited Git commit subject. The route commit is the selected commit's parent. The ground-truth commit and complete changed-file diff form the oracle.

The selector never invokes Vertex Palace. It writes one create-only manifest to `docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-3.json`. Selection failure remains evidence; no repository, commit, or task may be manually substituted after history inspection.

## Validation Gates Fixed Before Selection

After the manifest is committed, a separate preregistered harness will run two sequential `evaluate` and `context --auto` trials per target using a 6,000 estimated-token budget, route limit 9, and maximum 4 drawers.

Promotion requires:

- all eight targets complete both trials;
- observed task type matches the mechanically frozen expected type;
- every target covers all declared implementation and focused test files;
- macro changed-file coverage at least `0.90`;
- macro route focus and precision at least `0.75`;
- no target focus or precision below `0.50`;
- deterministic route files across repetitions;
- zero overconfident trials;
- context at or below 6,000 estimated tokens;
- fresh indexes, clean tracked worktrees, and no selected/excluded boundary overlap.

Environment/setup, harness-contract, and product/contract failures are reported separately and all prevent promotion. No failed target may be replaced or silently rerun under a modified candidate.

Passing remains static held-out routing evidence only. It cannot establish final Agent correctness, reported Token savings, wall-time improvement, or fewer tool calls.

## Selection Command

Run only after this protocol and selector are committed:

```powershell
node scripts/select-held-out-routing-targets-round-3.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-3.json
```
