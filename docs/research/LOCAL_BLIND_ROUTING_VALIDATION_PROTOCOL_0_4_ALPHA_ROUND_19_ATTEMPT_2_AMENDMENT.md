# Round 19 Static Validation Attempt 2 Amendment

## Why Attempt 1 Is Invalid

Attempt 1 is preserved create-only at `docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-19-attempt-1.json`. It completed seven paired targets and then remained invalid because `iniconfig` could not pass target materialization.

The failure was a generic validator contract error, not a repository or network failure:

- target selection froze the first non-empty line of `git show --format=%B` as the task;
- the validator compared that task with `git show --format=%s`;
- Git collapses a multi-line first paragraph into `%s`, so the frozen `iniconfig` task and collapsed subject differed;
- the materialization wrapper then mislabeled every exception as `environment-or-setup` and retried the deterministic assertion three times.

The diagnosis and exact hashes are preserved in `docs/research/evidence/local-blind-routing-validation-attempt-1-failure-record-0.4-alpha-round-19.json`.

## Observation Boundary

Attempt 1 exposed seven target pairs, 14 completed trials per condition, and 98 selected-task Palace CLI calls. Attempt 2 is therefore not a pristine first observation for those seven targets. Their partial aggregates remain historical evidence but are not treated as a formal eight-target product conclusion.

No product code was tuned after observing Attempt 1. The frozen candidate source tree, CLI, baseline, eight targets, whole-file oracles, semantic reviews, task order, condition order, limits, gates, and advancement rule remain unchanged.

## Allowed Harness Corrections

Attempt 2 changes only the generic validator harness:

1. compare the frozen task with the first non-empty line of `%B`, matching the frozen selector contract;
2. classify non-network materialization failures as `harness-contract`;
3. retry only environment or network materialization failures;
4. write a new create-only result and preserve all Attempt 1 artifacts by hash.

There is no task removal, oracle pruning, outcome-dependent exclusion, semantic gate change, product change, or concurrency change.

## Corrected Output

The corrected validator writes exactly one create-only result:

`docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-19-attempt-2.json`

The base Round 19 protocol remains authoritative except where this amendment explicitly corrects the harness and discloses the prior partial observation.
