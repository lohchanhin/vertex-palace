# Layered Routing Validation Result (0.4.0-alpha.2, Round 22)

## Verdict

**Failed.** The frozen alpha.2 candidate passed reference grounding, macro focus, determinism, context ceiling, Git isolation, and payload agreement. It failed control abstention, core closure, macro coverage, per-target coverage/focus, declared auxiliary coverage, and confidence calibration. Round 22 cannot qualify stable 0.4 and remains immutable regression evidence.

Raw result: [layered-routing-results-round-22.json](./evidence/layered-routing-results-round-22.json)

## Aggregate

| Metric | Result | Gate |
| --- | ---: | ---: |
| Accessible reference grounding | 6/6 runs | 100% pass |
| Correct control abstention | 4/6 runs | 100% fail |
| Routable core closure | 0/18 runs | 100% fail |
| Macro core coverage | 0.444 | >= 0.90 fail |
| Macro route focus | 0.889 | >= 0.70 pass |
| Candidate mean delivered context | 1,766.167 tokens | descriptive only |
| Baseline mean delivered context | 786.250 tokens | descriptive only |

The context values are static delivered payloads, not Agent tokens or performance evidence.

## Candidate Target Pattern

| Target | Stratum | Core | Focus | Declared auxiliary | Result |
| --- | --- | ---: | ---: | ---: | --- |
| TS ledger | local | 0.50 | 1.00 | 1.00 | focused test missing |
| Python invoice | local | 0.50 | 1.00 | 1.00 | focused test missing |
| Go identity | local | 0.50 | 1.00 | 1.00 | focused test missing |
| Rust frame | reference | 0.50 | 1.00 | 1.00 | metadata resolved; test missing |
| TS session | reference | 0.50 | 1.00 | 1.00 | metadata resolved; test missing |
| Python retry window | reference | 0.50 | 1.00 | 1.00 | metadata resolved; test missing |
| Go quota | high connectivity | 0.50 | 1.00 | 1.00 | contract found; test missing |
| Rust cursor | high connectivity | 0.00 | 0.00 | 0.00 | high-degree registry displaced explicit evidence |
| TS checkout | high connectivity | 0.50 | 1.00 | 0.00 | test and contract missing |
| Rust opaque control | control | 1.00 | 0.00 | 1.00 | correctly abstained |
| Python incident control | control | 1.00 | 0.00 | 1.00 | bare incident number mis-grounded locally |
| Go opaque PR control | control | 1.00 | 0.00 | 1.00 | correctly abstained |

Both repetitions were deterministic for every candidate target.

## Root Cause

The common failure is not a missing repository-name rule. Explicit task facts are still treated as ranking evidence rather than hard evidence constraints. The gain expansion can stop after one implementation file even when the task explicitly names its focused test. A high-degree candidate can also displace explicitly named implementation, test, and contract files. At grounding time, a bare incident number is incorrectly sufficient as a code identifier.

## Analysis Defects Preserved

The raw `zeroWrongForcedStops` gate passed because the frozen runner only checked `evidenceStatus`, not oracle completeness. Several local routes enforced a stop while covering only one of two core files, so the conservative interpretation is that this safety property was not demonstrated. The two non-inferiority gates also passed vacuously because there were zero targets completed by both versions. Neither raw value is rewritten.

## Allowed Next Step

Stable qualification resets to zero. At most one general mechanism repair is allowed. The repair will make explicit task facts a mandatory evidence contract before gain scoring: explicit implementation, focused test, and declared contract paths must close or remain advisory; bare numeric incident IDs cannot establish local grounding. Round 22 becomes regression-only. Round 23 is already frozen against the failed candidate and cannot qualify a repaired candidate; a future candidate requires fresh unobserved targets.
