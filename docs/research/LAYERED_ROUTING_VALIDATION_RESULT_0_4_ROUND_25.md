# Layered Routing Validation Result (0.4.0-alpha.3, Round 25)

## Verdict

**PASS.** Round 25 passed all 16 preregistered hard gates on its first observation. Together with the passing Round 24, the unchanged alpha.3 artifact has completed two consecutive fresh qualification rounds. Static-routing stable qualification is now `2/2`.

This authorizes preparation of stable `0.4.0`, npm `latest`, and the marketplace update after the stable artifact passes the complete release verification. It does not authorize Token, speed, tool-call, or end-to-end Agent correctness claims.

## Frozen Lineage

- Preregistered source commit: `5f3b17032cdc996a730bda4fe306edd1493a8c37`
- Candidate: `vertex-palace@0.4.0-alpha.3`
- Candidate integrity: `sha512-rVwwaZMQNBt8sbJV2Al/vo9RWwPn4NMGMOn159DvHDN8j4CPcVzPjm1M+UpkUGaSMbs5KBPH6RrjrKcnJE9qkA==`
- Baseline: public `vertex-palace@0.3.0`
- Design: 12 new targets, two repetitions per condition, balanced and sequential order

Round 24 results did not alter the Round 25 manifest, runner, packages, gates, or freeze.

## Results

| Metric | Result |
| --- | ---: |
| Accessible reference grounding | 6/6 runs |
| Control abstention with zero source files | 6/6 runs |
| Routable implementation/test core closure | 18/18 runs |
| Macro core coverage | 1.000 |
| Macro route focus | 0.972 |
| Declared auxiliary coverage | 100% |
| Deterministic target routes | 12/12 |
| Overconfident runs | 0 |
| Wrong forced stops | 0 |
| Tracked-file pollution | 0 |
| Payload metric disagreements | 0 |
| Candidate mean delivered context | 1,721.750 estimated tokens |

Every local and frozen-reference target routed its implementation and focused test. Every high-connectivity target included its explicit contract. One Python target also included the high-degree registry and had focus `0.75`; all other routable targets had focus `1.00`. All candidate contexts remained under 6,000 estimated tokens.

Six targets were completed by both products. Candidate core-coverage delta was `0.000`; route-focus delta was `+0.320`. Both preregistered non-inferiority gates passed.

## Two-Round Qualification Summary

| Round | Core coverage | Route focus | Controls | References | Hard gates |
| --- | ---: | ---: | ---: | ---: | ---: |
| 24 | 1.000 | 0.972 | 6/6 | 6/6 | 16/16 |
| 25 | 1.000 | 0.972 | 6/6 | 6/6 | 16/16 |

Across 96 sequential observations, the repaired candidate produced deterministic routes, no tracked-file pollution, no overconfidence, and no wrong forced stop.

## Claim Boundary

This establishes the preregistered static-routing release gate only. Candidate context remained larger than baseline on average, and neither round executed an Agent. Performance claims still require the separate 8-task, 24-pair randomized crossover Agent A/B with a correctness non-inferiority gate and paired bootstrap intervals.

Machine evidence: [layered-routing-results-round-25.json](./evidence/layered-routing-results-round-25.json).

## Release Decision

Prepare stable `0.4.0` from the qualified source, run lint, all tests, build, MCP smoke, release-candidate installation, version consistency, and a real GitHub transport smoke. Publish npm only after the packed stable integrity is recorded. Update npm `latest`, Git tag/GitHub release, and marketplace defaults together; preserve alpha and failed-round evidence unchanged.
