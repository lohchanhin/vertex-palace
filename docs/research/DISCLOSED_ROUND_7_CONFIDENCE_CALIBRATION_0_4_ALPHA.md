# Disclosed Round 7 Confidence Calibration

## Result

**Calibration repair succeeded; the overall routing gate still failed.** The independent implementation-anchor cap reduced overconfident trials from 4/16 to 0/16 while preserving every ordered route and every coverage, focus, and precision result from the constrained module-pair baseline.

This is a seen-development regression on disclosed tasks. It demonstrates a reproducible safety correction on known failures, not held-out generalization, improved route recall, Agent correctness, or Token and wall-time savings.

## Frozen Evidence

- Baseline product commit: `228c3bde47f6930023496fdd0a54d43dba10091f`
- Baseline evidence SHA-256: `7FBD82D10A99C65D4817349AD5E91C7A7237A712DADECD80E5707DBCA0386252`
- Confidence repair product commit: `1a02d89269acb36473db3ad39badab9fe338a4a3`
- Validation harness commit: `f7bdb2ab4deec25d7a408deac84b48638efef723`
- Candidate CLI SHA-256: `49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747`
- Validation harness SHA-256: `226A5D39CBBF2E3703C51B305352F6C6145E647DD08952F9F38EF7384CBC5BFC`
- Result evidence SHA-256: `8258DF9B52703FE497CA5A0EDBD14A346F337E7FCF989EC31DFAB85BFA2CB744`
- Protocol: 8 targets, 2 sequential repetitions per target, route limit 9, 6,000-token context ceiling

## Comparison

| Metric | Constrained module-pair baseline | After confidence cap | Change |
| --- | ---: | ---: | ---: |
| Passed targets | 3/8 | 3/8 | 0 |
| Completed trials | 16/16 | 16/16 | 0 |
| Macro changed-file coverage | 0.620 | 0.620 | 0 |
| Macro route focus | 0.542 | 0.542 | 0 |
| Macro route precision | 0.543 | 0.543 | 0 |
| Route files | 30 | 30 | 0 |
| Deterministic targets | 8/8 | 8/8 | 0 |
| Overconfident trials | 4/16 | 0/16 | -4 |
| Environment or harness failures | 0 | 0 | 0 |

All 16 ordered routes were byte-for-byte equivalent at the route-file level. Only Execa and Mio changed confidence:

| Target | Before | After | Observed coverage | After calibration |
| --- | ---: | ---: | ---: | --- |
| Execa | 0.75 | 0.15 | 0.00 | well-calibrated at the 0.15 tolerance boundary |
| Mio | 0.86 | 0.15 | 0.33 | underconfident |

The other six targets retained their previous confidence and calibration status.

## Mechanism

Evidence-sufficient core selection can raise its confidence cap to 0.90 when a route contains a strong relation or structural implementation/test pair. The new rule applies only to bugfix routes that would receive that elevated cap. It extracts the first two discriminative anchors from the leading task subject and asks whether at least one selected implementation symbol independently covers both. If not, confidence is capped at 0.15.

The rule is repository-independent. A neutral product fixture covers a structurally strong `payload/escape` pair for the task `Fixes payload parsing for escaped newlines`: the route remains unchanged, but confidence is capped because no implementation symbol independently covers both `payload` and `parsing`.

## Runtime Policy Effect

- Execa was already in `full-palace`; it remained there with lower confidence.
- Mio changed from `route-lite` to `full-palace` because its route confidence fell below the narrow-context threshold.
- Mio's reported context estimate increased from 1,804 to 2,440 Tokens.

This is an intentional safety cost. The repair does not save context; it prevents an unsupported narrow route from authorizing early focus.

## Interpretation

1. The prior high scores were caused by a real confidence-cap defect, not environment noise.
2. A structurally convincing pair is insufficient for high confidence when its implementation does not independently match the task's leading identity.
3. The repair eliminates the observed overconfidence without changing static route quality.
4. Execa and Mio routes remain wrong or incomplete. Their recall defects still require separate evidence-selection work.
5. Mio is now deliberately underconfident. New held-out validation is required to estimate whether the cap is too conservative on unseen tasks.

## Next Direction

- Freeze a new held-out calibration set before tuning the cap again.
- Measure false-high and false-low confidence separately, including mode-selection changes and delivered context size.
- Then repair recall with exact operation/entity anchors and causal symbol relationships, keeping calibration measurement independent from recall measurement.
- Do not claim Token or time savings unless a later end-to-end Agent experiment supports them.

## Claim Boundary

Vertex Palace now behaves more safely on these disclosed failures: it no longer reports high confidence for Execa or Mio, and Mio no longer remains in narrow `route-lite` mode. It still does not find the missing files, does not pass the Round 7 routing gates, and does not demonstrate an efficiency gain.
