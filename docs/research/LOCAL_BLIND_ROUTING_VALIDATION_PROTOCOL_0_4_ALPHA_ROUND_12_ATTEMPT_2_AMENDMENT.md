# Round 12 Validation Attempt 2 Harness Amendment

## Reason

The first formal command stopped inside `assertFrozenInputs` before target materialization, baseline build, or any Palace call. The validator expected `freezeAttempt: 2`, while the first validation freeze declared `freezeAttempt: 1`.

The create-only invalid result, first validation freeze, and a machine-readable failure record remain preserved and hash-bound.

## Permitted Correction

Attempt 2 changes only:

- validation study and output identity from attempt 1 to attempt 2;
- validation freeze identity from attempt 1 to attempt 2;
- the validator/freeze identity assertion and matching integrity-test expectations; and
- amendment provenance that binds the failed freeze and invalid result.

The candidate source, CLI, target manifest, target order, tasks, oracle files, semantic reviews, baseline, thresholds, budgets, repetitions, condition order, and static-only claim boundary remain unchanged.

No selected task had been sent to Palace before this amendment. Product commands started: 0. Product mutations: 0.

The corrected create-only formal result path is:

`docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-12-attempt-2.json`
