# Local Blind Routing Round 16 Selection Result (0.4 Alpha)

## Verdict

Round 16 ended with a valid **selection failure before semantic review**. The
locally frozen 16-repository pool was inspected mechanically at its pinned
HEADs, producing 56 candidate packets. Rust had only one repository with any
mechanically eligible candidate, below the frozen quota of two targets per
language family. No semantic decision could make the frozen pool feasible.

No Round 16 candidate task was sent to Palace. This is not a product-routing
result and does not authorize static validation or a v5 Agent study.

## Preserved Evidence

- Repositories inspected: 16/16.
- Mechanical candidates: 56.
- JavaScript/TypeScript repositories with candidates: 4/4.
- Python repositories with candidates: 3/4.
- Go repositories with candidates: 4/4.
- Rust repositories with candidates: 1/4 (`toml`).
- Rust repositories without candidates: `cfg-if`, `predicates-rs`, `chumsky`.
- Semantic reviews performed: 0.
- Palace calls on candidate tasks: 0.
- Product changes after candidate freeze: 0.

The yarl repository required one bounded retry after a transient GitHub 443
failure. It then completed normally and still produced no mechanically eligible
candidate within the frozen 300-commit scan limit. The environment retry did
not alter repository identity, order, rules, or task exposure.

## Why The Gate Cannot Be Relaxed

Reducing the Rust quota, replacing a repository after reading history, or
publishing only the feasible families would turn a predeclared balanced study
into an outcome-dependent study. Round 16 therefore remains failed under its
original identity. No partial oracle is published.

## Next Direction

Round 17 may use the same frozen product candidate but must:

1. recursively exclude the 162 prior repositories plus all 16 Round 16 pool
   repositories;
2. use a larger URL-and-HEAD-only fallback pool per language family;
3. freeze the new pool, selector, source, and integrity machinery before reading
   new history; and
4. preserve the same two-target-per-family absolute gate.

This result establishes no claim about route quality, Agent correctness, Token
use, tool calls, or wall time.

## Competition Freeze

All work remains local. Nothing was committed, pushed, tagged, released, or
published to npm, and submitted competition materials were not changed.
