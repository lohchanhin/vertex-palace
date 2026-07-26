# Disclosed Round 8 Routing Repair Protocol (0.4 Alpha)

## Purpose

This protocol fixes five known static-routing failures preserved by Round 8:
SQLAlchemy, Sinon, Rich, Viper, and Crossbeam. All tasks and oracle files are
already disclosed. Iterative local development is therefore allowed, but the
result is regression evidence only. It is not held-out evidence.

The frozen pre-repair baseline is commit
`7496bef84e49264183cddbc48ce08d5e6665f2eb` with CLI SHA-256
`52A1876B00AF4AAA884A6C7EA47AC2E701E88C34FC8FEE65DD1B32BB6513B8AE`.
The source manifest SHA-256 is
`6678CE22935F938593C9F950636795E3295D18C9AC57D1C1E7A068B145214466`,
and the combined Round 8 analysis SHA-256 is
`3653B738A46690BD51B021D0469D5B3B6F9B1A3E6C23A7EF89A7E430F81442A5`.

## Known Failure Classes

1. **Sinon, parser and surface failure:** object-literal behavior methods were
   absent from the JavaScript symbol index, while documentation filenames
   matched the task literally.
2. **SQLAlchemy, distributed typing failure:** a shared implementation and the
   explicit typing test were missed.
3. **Viper, implementation sibling failure:** `file.go` was omitted and the
   incomplete route was allowed to use `route-lite`.
4. **Crossbeam, integration-test failure:** `tests/mpsc.rs` was omitted while a
   non-oracle library file was included.
5. **Rich, focus failure:** recall was complete, but six generic neighbors
   reduced route focus to `0.25`.

## Fixed Execution Contract

- Same task text, repository URL, route commit, and oracle files as Round 8.
- `budget=6000`, `routeLimit=9`, and `maxDrawers=4`.
- Two deterministic repetitions per condition.
- Baseline and repair candidate run sequentially in separate repository copies
  with fresh indexes. They are never run concurrently.
- Target removal, replacement, task rewriting, and oracle rewriting are
  forbidden.
- Every failed, partial, invalid, and successful attempt is preserved.
- The repair candidate commit and CLI hash must be frozen in a separate
  execution preregistration before the preserved comparison is run.

## Gates

The disclosed panel passes only if all five targets and all ten trials per
condition complete, every target reaches complete changed-file coverage,
macro coverage is at least `0.90`, macro focus and precision are at least
`0.75`, and every target focus and precision are at least `0.50`.

The five candidate routes may contain at most 18 files in total. Rich may use
at most four route files, Sinon may use no `docs/` files, routes must be
deterministic, and no target with coverage below `0.90` may select `bypass` or
`route-lite`.

## Claim Boundary

A passing result means only that the five disclosed Round 8 regressions were
repaired under this fixed static-routing contract. It cannot establish unseen
generalization, Agent correctness, reported Token savings, fewer tool calls,
or lower wall time. A separately frozen Round 9 repository pool and held-out
validation are required before making a generalization claim.
