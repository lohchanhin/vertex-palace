# Held-out Routing Target Selection Protocol (0.4 Alpha)

## Status

Preregistered before inspecting repository histories or invoking Vertex Palace on any candidate task. The protocol and selector must be committed before target selection runs.

## Frozen Product

The product candidate remains `0b6a0fd92f43a74c983663cd32f937087e3ec923`. No product path may change during target selection or held-out validation. Zod, Requests, and p-limit are excluded because they influenced product development.

## Repository Pool

The pool order is binding. HEAD values were obtained without inspecting commit histories or route outcomes.

| Order | Repository | Language | Pinned HEAD |
| ---: | --- | --- | --- |
| 1 | [fastify/fastify](https://github.com/fastify/fastify) | JavaScript | `ada0623dce9ed776306f2ccaa095b8ee01a492ba` |
| 2 | [pallets/click](https://github.com/pallets/click) | Python | `cfa01eeb7894a408af70b29d28c0b24f8680f9fb` |
| 3 | [date-fns/date-fns](https://github.com/date-fns/date-fns) | TypeScript | `4098115cf705e3af7f663d8e5b0686e39a9f478a` |
| 4 | [BurntSushi/ripgrep](https://github.com/BurntSushi/ripgrep) | Rust fallback parser | `8372866810a1f2a647d11d7780984d4402a5c1e9` |
| 5 | [spf13/cobra](https://github.com/spf13/cobra) | Go fallback parser | `adbc8813901bba65827259daa8e22ff94ec1f30e` |
| 6 | [markedjs/marked](https://github.com/markedjs/marked) | JavaScript/TypeScript | `1d3229a4cc423dbfef9dc2d1e325f7a9231ad60b` |

The first four repositories with an eligible commit become the target set. Repositories five and six are fallback candidates only when an earlier repository has no eligible commit or cannot be prepared. A repository cannot be manually replaced after route outcomes are observed.

## Mechanical Commit Selection

For each repository, the selector walks backward from the pinned HEAD through at most 200 non-merge commits. The newest commit satisfying every condition is selected:

1. Exactly one parent.
2. Commit subject is 20–180 characters and starts with a behavioral action such as fix, feat, add, allow, prevent, support, or improve.
3. The diff modifies 2–6 files; every status is `M`, so every target exists before and after the change.
4. Every changed file uses the repository's declared source extension.
5. At least one file is implementation and at least one is a focused test path.
6. Documentation, generated output, fixtures, snapshots, benchmarks, examples, vendor files, build output, lockfiles, and binary diffs are excluded.
7. Total additions plus deletions are between 2 and 400 lines.

The task text is the Git commit subject without manual rewriting. The route commit is its parent; the ground-truth commit is the selected commit; the changed-file oracle is the complete selected diff.

The selector never invokes Vertex Palace. It writes one create-only manifest to `docs/research/evidence/held-out-routing-target-manifest-0.4-alpha.json`. If fewer than four targets qualify, the failed manifest is preserved and no manual substitution is allowed outside the frozen pool.

## Validation Gates Fixed Before Selection

After the manifest is committed, a separate validation harness will clone each route commit and use frozen candidate `0b6a0fd`. Each target runs two sequential `evaluate` and `context --auto` trials with a 6,000-token budget, route limit 9, and maximum 4 drawers.

Promotion requires every selected target to satisfy:

- changed-file coverage `1.00`;
- route focus at least `0.75`;
- precision against the mechanically selected changed-file boundary at least `0.75`;
- deterministic route files across both repetitions;
- no overconfident calibration;
- context at or below 6,000 estimated tokens;
- no selected/excluded overlap and no tracked worktree changes.

All four targets must pass. Environment and repository setup failures are reported separately but do not count as product passes. A failed target becomes disclosed development data and cannot be reused as held-out evidence for a tuned successor.

Passing remains static routing evidence only. It does not prove Agent task correctness, token savings, or speed.

## Selection Command

Run only after this protocol and `scripts/select-held-out-routing-targets.cjs` are committed:

```powershell
node scripts/select-held-out-routing-targets.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha.json
```

