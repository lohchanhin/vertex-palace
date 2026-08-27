# Room Inventory Validation Protocol (0.5, Round 26)

Status: protocol locked, target selection pending. No candidate route has been run on a selected target.

## Research Question

Does object-first routing improve retrieval of the exact implementation and focused verification objects without reducing safety, determinism, compatibility, or bounded context compared with Vertex Palace 0.4 file-first routing?

## Claim Boundary

Round 26 is a static object-routing qualification study. It cannot establish end-to-end Agent correctness, Token savings, fewer tool calls, or faster wall time. Those claims require a separate randomized paired Agent study after static routing qualifies.

## Products

The baseline is `vertex-palace@0.4.0`, Git tag `v0.4.0`, starting commit `2d29561`. The planned candidate is `vertex-palace@0.5.0-alpha.1`, with object-first routing behind an experimental switch.

The candidate package, runner, target manifest, ground truth, and hashes must be frozen before either condition is executed. Target selection cannot use candidate route output.

## Target Selection

Round 26 contains 16 fresh targets not used to tune Room Inventory:

| Language family | Targets |
| --- | ---: |
| TypeScript or JavaScript | 4 |
| Python | 4 |
| Go | 4 |
| Rust | 4 |

The study also contains four targets in each profile:

1. Exact object tasks naming a function, method, def, type, or endpoint.
2. Ambiguous tasks where the repository contains multiple same-named objects.
3. Cross-file tasks requiring an implementation object and focused test object.
4. Dynamic, missing, or otherwise unresolved controls where advisory output or abstention is correct.

Repositories, historical tasks, and truth must be selected before candidate execution. A development fixture or previously repaired target cannot count as fresh qualification evidence.

## Truth Layers

- Target object: the implementation declaration that owns the requested behavior.
- Focused verification object: the smallest test declaration directly exercising that behavior.
- Explicit contract object: a type, configuration declaration, endpoint, or documentation contract explicitly required by the task.
- Latent auxiliary file: a hidden-diff or convention-only surface, reported separately and not used to redefine core failure after observation.

Ground truth is recorded before routing from historical diffs, repository tests, or an independent code review. The oracle cannot be rewritten after results are observed.

## Execution

- Conditions are `0.4-file-first` and `0.5-object-first`.
- Each target and condition is repeated twice.
- Condition order is balanced across targets.
- Runs are sequential. Concurrent runs are prohibited.
- Model, task text, repository commit, index freshness, context ceiling, and verification commands remain identical.
- The context ceiling is 6,000 estimated tokens.
- No tracked file in a target repository may be changed.
- Parse, setup, timeout, and partial failures are preserved in the first result.

## Metrics

Primary static metrics are exact target-object recall, implementation plus focused-test closure, and macro object focus. Safety metrics are wrong forced stops, correct advisory or abstention controls, deterministic route agreement, context ceiling compliance, and tracked-file cleanliness.

Engineering metrics are line-shift identity retention, index size multiplier over 0.4, and incremental index time regression. They do not substitute for routing correctness.

## Frozen Gates

Round 26 passes only when all gates pass:

1. Exact target-object recall is `1.00`.
2. Implementation plus focused-test closure is at least `0.95`.
3. Macro object focus is at least `0.75`.
4. Wrong forced stops are zero.
5. Repeated route agreement is `1.00`.
6. Every context is at or below 6,000 estimated tokens.
7. Tracked-file pollution is zero.
8. Line-shift identity retention is `1.00`.
9. Index size is at most `1.50` times the 0.4 baseline.
10. Incremental index time regression is at most `0.25` relative to the 0.4 baseline.

## Failure Policy

The first observed result is immutable. A failed target, oracle, task, or threshold cannot be removed, replaced, or rewritten. One general mechanism repair is allowed for a failure class, and the failed sample becomes regression evidence only.

Qualification then restarts with two fresh rounds. If the same failure class recurs after that general repair, stable 0.5 pauses for architecture review instead of receiving another target-specific rule.

## Release Decision

A Round 26 pass authorizes only preparation of a fresh Round 27 with an unchanged candidate. Stable `0.5.0` requires two consecutive fresh qualification passes, compatibility tests, package installation tests, and a separate review of the Agent-performance claim boundary.
