# Held-out Routing Environment Recovery Protocol (0.4 Alpha, Round 3)

## Status

Preregistered after preserving the first Round 3 observation and before rerunning any censored target. This protocol and `scripts/verify-held-out-cross-repository-routing-round-3-environment-recovery.cjs` must be committed before recovery execution.

## Why This Is A Separate Study

The original create-only observation remains failed at `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3.json`.

- Koa completed both trials and produced a product failure: zero oracle coverage, zero focus, zero precision, and two overconfident trials.
- Starlette failed during Git transfer with a reset connection.
- Gin, Tower, Axios, Echo, serde-json (`serde_json`), and Pydantic failed before Palace execution because GitHub DNS resolution failed.

Only Koa produced product evidence. The other seven observations are environment-censored. This supplemental study collects those missing observations without changing the original status, deleting the Koa failure, or pretending the first study passed.

## Frozen Inputs

- Product candidate: `6060e0c6aa2aea64d0145c1e55bccdc4669e4b48`
- Selector commit: `a9f5ff2e22a7cd41ed6f019f75c9759500ecce09`
- Manifest commit: `d35ff810c79c3374ce5b37d780138def50d3c52d`
- Manifest SHA-256: `16D62D36341E22864DED89CB7A8C2CC6C5D765C0C4F8B6AE237CFC4D5F0E1DC2`
- Original observation commit: `2964abf4c7f8b5745e8daa636ac2a58a37b662c0`
- Original observation SHA-256: `7C1C0731008979D1DD3085EAEC86A43F277E3BFE588C86D43D5E11AFA5BD7EDF`
- Product changes between observations: `0`

The harness verifies all commits and hashes before building or accessing a target.

## Exact Recovery Set

Only the seven targets with `environment-or-setup` failure and zero trials in the original observation may run:

1. Starlette
2. Gin
3. Tower
4. Axios
5. Echo
6. serde-json (`serde_json`)
7. Pydantic

Koa is not rerun. No target, task, repository, commit, oracle, budget, route limit, drawer limit, or metric may be replaced.

## Materialization Recovery

Each target receives at most three materialization attempts. Before every attempt the incomplete target directory is removed, then the exact frozen route and ground-truth commits are fetched again. Failed attempts and errors are recorded. A fixed 5,000 ms delay separates attempts.

Retries stop before any Palace execution. Once a target materializes successfully, it receives exactly the original two sequential Palace trials, never extra trials.

## Unchanged Evaluation

Every recovered target uses:

- explicit `init` and `index`;
- `evaluate` followed by `context --auto`;
- two sequential repetitions;
- 6,000 estimated-token budget;
- route limit 9;
- maximum 4 drawers;
- the same implementation/test oracle, task-type oracle, coverage, focus, precision, calibration, determinism, context, cleanliness, and boundary checks.

The recovery output has its own pass/fail status for the seven observations. Even if all seven pass, the original Round 3 study remains failed and the candidate cannot advance to Agent A/B because Koa remains a frozen product failure.

## Evidence Preservation

The supplemental observation must be created once at:

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3-environment-recovery.json`

The harness refuses to overwrite it. Raw evidence must be committed unchanged and hashed before any product repair.

## Claim Boundary

This study can complete the missing held-out static routing observations against the unchanged candidate. It cannot retroactively repair the original protocol result, cannot establish Agent correctness, and cannot support Token, wall-time, or tool-call improvement claims.

## Command

Run only after this protocol and recovery harness are committed:

```powershell
node scripts/verify-held-out-cross-repository-routing-round-3-environment-recovery.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3-environment-recovery.json
```
