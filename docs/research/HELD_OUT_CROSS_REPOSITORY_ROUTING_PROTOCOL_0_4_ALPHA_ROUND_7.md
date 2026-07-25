# Held-out Cross-repository Routing Protocol (0.4 Alpha, Round 7)

## Status

Preregistered after the Round 7 target manifest was selected and committed, but
before the first Vertex Palace call on any selected task. The frozen candidate,
manifest, validation harness, this protocol, its Simplified Chinese counterpart,
and their contract tests must be committed before measurement starts.

## Claim Boundary

This study measures static routing behavior only. It tests whether the frozen
Vertex Palace candidate identifies the mechanically selected changed-file oracle
with bounded extra files, calibrated confidence, and a bounded context payload.

It does not execute target tests or ask an Agent to implement the task. It cannot
support claims about Agent correctness, reported Token savings, tool-call
reduction, or wall time. The repositories are held out from candidate
development, not necessarily unseen by the underlying model.

## Frozen Inputs

- Product commit: `f61207688badbe07818470a42441a3a966a8bdf0`
- CLI SHA-256:
  `72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC`
- Selector commit: `8dfe027063454baf5af915492849c4bcffe3ac6f`
- Manifest commit: `3f1e3e349afc181690f7a7a5d0739cfb7f768aeb`
- Manifest SHA-256:
  `9234AAB3E64E6EEB5857B6376646078067AA0121CA593DEBBB3275037A307616`
- Repository pool SHA-256:
  `A5573635E28C7A7A4D10B8847297D2FDD2671D4B24645A35DAAE77AE49459149`
- Task classifier SHA-256:
  `C3D787029C019FD64BFB079913F23B58082C38560448A9B9567954ECA9FE1254`
- Frozen runtime paths: `packages/` and
  `plugins/vertex-palace/mcp/server.cjs`

The validator checks every hash and commit before and after measurement. It does
not rebuild; the frozen `dist/palace.cjs` is the measured artifact.

## Frozen Targets

The create-only Round 7 manifest selected eight tasks in binding order, exactly
two per language family. All eight came from the primary half of the pool; eight
fallback repositories remained uninspected.

| Order | Target | Family | Task type | Oracle files | Auxiliary files |
| ---: | --- | --- | --- | ---: | ---: |
| 1 | execa | JavaScript/TypeScript | bugfix | 2 | 0 |
| 2 | jinja | Python | bugfix | 3 | 1 |
| 3 | go-multierror | Go | feature | 2 | 0 |
| 4 | thiserror | Rust | bugfix | 2 | 0 |
| 5 | node-glob | JavaScript/TypeScript | feature | 2 | 0 |
| 6 | httpcore | Python | bugfix | 5 | 1 |
| 7 | httprouter | Go | feature | 2 | 0 |
| 8 | mio | Rust | bugfix | 3 | 0 |

The unedited commit subject is the task. The complete eligible modified-file
set is the oracle. Jinja and HTTPcore include one bounded documentation or
configuration auxiliary file each; those files remain required evidence.

## Execution

Targets run sequentially in manifest order. For each target, the validator:

1. Materializes the pinned ground-truth and route commits in an OS temporary
   directory and verifies the full Git oracle.
2. Checks out the route commit, deletes any previous `.palace`, then runs
   `palace init`, `palace index`, and `palace status` through the frozen CLI.
3. Runs two formal repetitions with a warm explicit index. Each repetition runs
   `palace evaluate` with the frozen oracle, then `palace context --auto`.
4. Records route membership and order, task type, coverage, focus, precision,
   confidence calibration, context payload, mode, boundaries, and elapsed
   command times.
5. Verifies that Palace did not modify tracked target files.

The two repetitions test deterministic route order and membership. They are not
independent samples and are not used to make latency claims.

## Fixed Limits and Retry Policy

- Targets: 8
- Repetitions: 2 per target, 16 formal trials total
- Context budget: 6,000 estimated tokens
- Route limit: 9 files
- Maximum drawers: 4
- Repository materialization attempts: at most 3
- Fresh-index attempts: at most 2, and only transient `EAGAIN`, `ENOMEM`, or
  `ETIMEDOUT` failures may be retried
- `evaluate` and `context` retries: 0
- Execution: sequential, never concurrent

Product or contract failures are not retried or censored. Setup and environment
failures remain in the result under separate categories.

## Pass Gates

The formal result passes only when all gates hold:

1. All 8 targets and all 16 trials complete.
2. Task type matches the frozen oracle in every trial.
3. Every target has complete implementation and path-derived focused-test
   coverage in every trial.
4. Every applicable target has complete documentation/configuration auxiliary
   coverage in every trial.
5. Route order and membership are identical across both repetitions.
6. Macro changed-file coverage is at least `0.90`.
7. Macro route focus and independently computed route precision are each at
   least `0.75`.
8. Every target's focus and precision are each at least `0.50`.
9. Overconfident trials equal `0`.
10. Every context payload stays within 6,000 estimated tokens.
11. Selected and excluded execution boundaries never overlap.
12. Status is fresh immediately after explicit indexing, and Palace leaves the
    tracked target worktree clean.

No target can be removed, rewritten, replaced, or rerouted after observation.

## Evidence Preservation

The validator writes exactly one create-only result:

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-7.json`

The first completed result is preserved whether it passes, fails, or contains
environment failures. Any later product repair must use a separately named,
explicitly disclosed regression study and cannot relabel this observation as
held out.

## Command

Run only after the protocol, harness, and tests are committed and the tracked
worktree is clean:

```powershell
node scripts/verify-held-out-cross-repository-routing-round-7.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-7.json
```
