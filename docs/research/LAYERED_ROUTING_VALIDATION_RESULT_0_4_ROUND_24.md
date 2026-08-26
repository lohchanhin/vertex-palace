# Layered Routing Validation Result (0.4.0-alpha.3, Round 24)

## Verdict

**PASS.** Round 24 is the first fresh qualification pass for the repaired alpha.3 candidate. All 16 preregistered hard gates passed on the first observation. Stable qualification is now `1/2`; no stable release is authorized until the unchanged candidate also passes Round 25.

## Frozen Lineage

- Preregistered source commit: `5f3b17032cdc996a730bda4fe306edd1493a8c37`
- Candidate: `vertex-palace@0.4.0-alpha.3`
- Candidate integrity: `sha512-rVwwaZMQNBt8sbJV2Al/vo9RWwPn4NMGMOn159DvHDN8j4CPcVzPjm1M+UpkUGaSMbs5KBPH6RrjrKcnJE9qkA==`
- Baseline: public `vertex-palace@0.3.0`
- Design: 12 targets, two repetitions per condition, balanced and sequential candidate/baseline order

The manifest, frozen GitHub metadata, runner, packages, and gates were hash-frozen and pushed before either condition ran.

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
| Candidate mean delivered context | 1,724.667 estimated tokens |

All local and reference targets routed exactly to their implementation and focused test. All three high-connectivity targets included their declared contract. One Rust target also admitted the high-degree registry, producing the lowest per-target focus of `0.75`, still above the preregistered `0.40` floor. Every candidate context remained below 6,000 estimated tokens.

Six targets were completed by both products. Candidate core-coverage delta was `0.000`, while route-focus delta was `+0.431`, satisfying both non-inferiority gates.

## Interpretation Boundary

This pass supports grounding, abstention, evidence closure, focus, calibration, deterministic output, and repository cleanliness for these synthetic static-routing targets. Candidate delivered context was larger than baseline on average; that number is descriptive and is not a model Token, time, or efficiency result. Round 24 does not establish an Agent performance advantage.

Machine evidence: [layered-routing-results-round-24.json](./evidence/layered-routing-results-round-24.json).

## Next Gate

Run the already frozen Round 25 without changing source, manifest, runner, artifact integrity, or thresholds. Only two consecutive passes authorize stable `0.4.0` and npm `latest` evaluation.
