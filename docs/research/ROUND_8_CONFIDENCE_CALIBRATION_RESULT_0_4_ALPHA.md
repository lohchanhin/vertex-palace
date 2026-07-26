# Round 8 Confidence Calibration Result (0.4 Alpha)

## Verdict

**The independent implementation-anchor hard confidence cap regressed held-out
calibration and must not be retained as a score rule. Its narrow-context safety
intent should be retained as separate evidence and authorization.**

Across eight frozen targets, baseline and candidate produced identical ordered
routes. The candidate reduced no held-out overconfidence, increased
underconfident targets from 4 to 5, and increased target calibration mean
absolute error from 0.284 to 0.465. It moved two targets from `route-lite` to
`full-palace`, removed one unsafe narrow-mode target, and added 792 estimated
context tokens across 16 paired trial observations.

This is static route evidence, not an Agent efficiency result.

## Frozen Evidence

| Evidence | Commit | SHA-256 | Role |
| --- | --- | --- | --- |
| Seven-pair condition-repair result | `9eb29b4cdb639ccbb8db11df070fedb6498c49e6` | `E6216E3F6F43BFC3CD42A2B5E640777349B1977250BB43A159AC5155FFF3A23D` | Seven completed pairs; SQLAlchemy environment timeout |
| SQLAlchemy completion | `22f022239716c1402b3fc59fc9686fef787e64f3` | `97EAA94336880CF6309A565E06DA7C9B5E3E33203709259061F5589598DA475F` | Separately preregistered missing pair |
| Mechanical combined analysis | `f611be23da80997c82a05a8291e63888ff8ba0d3` | `3653B738A46690BD51B021D0469D5B3B6F9B1A3E6C23A7EF89A7E430F81442A5` | Original eight-target order and frozen combination rule |

Frozen products:

| Role | Product commit | CLI SHA-256 |
| --- | --- | --- |
| Baseline | `228c3bde47f6930023496fdd0a54d43dba10091f` | `E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F` |
| Candidate hard cap | `1a02d89269acb36473db3ad39badab9fe338a4a3` | `49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747` |

## Environment Completion

SQLAlchemy was not silently removed. Its candidate index completed in 741,906
ms and its baseline index completed in 701,166 ms after the preregistered
ceiling changed from two 300-second attempts to one 900-second attempt per
condition. Both conditions then completed two deterministic observations.

The SQLAlchemy result was identical in both conditions:

- route: `lib/sqlalchemy/orm/session.py` and `test/orm/test_session.py`
- changed-file coverage: 0.33
- route focus and precision: 0.50
- confidence: 0.40
- calibration error: 0.07, well-calibrated
- mode: `full-palace`

It missed `lib/sqlalchemy/orm/scoping.py` and the actual typing test
`test/typing/plain_files/orm/session.py`, while adding an unrelated session
test. This is a product routing failure, not an environment failure.

## Eight-target Comparison

| Metric | Baseline | Hard-cap candidate | Change |
| --- | ---: | ---: | ---: |
| Completed paired targets | 8 / 8 | 8 / 8 | 0 |
| Completed trials | 16 / 16 | 16 / 16 | 0 |
| Identical ordered routes | 8 / 8 | 8 / 8 | 0 |
| Passed targets | 3 / 8 | 3 / 8 | 0 |
| Core-surface complete targets | 4 / 8 | 4 / 8 | 0 |
| Exact-oracle targets | 2 / 8 | 2 / 8 | 0 |
| Macro changed-file coverage | 0.719 | 0.719 | 0 |
| Macro route focus | 0.625 | 0.625 | 0 |
| Macro route precision | 0.625 | 0.625 | 0 |
| Overconfident targets | 0 / 8 | 0 / 8 | 0 |
| Underconfident targets | 4 / 8 | 5 / 8 | +1 |
| Calibration MAE | 0.284 | 0.465 | +0.181 |
| Unsafe narrow-mode targets | 1 / 8 | 0 / 8 | -1 |
| Mean delivered context | 2,429.625 | 2,479.125 | +49.5 |
| Total context across trials | 38,874 | 39,666 | +792 |

The candidate failed the frozen `coverage >= 0.90`, `focus >= 0.75`, and
`precision >= 0.75` gates. The confidence change could not repair recall or
focus because it never changed route membership.

## Target Profile

| Target | Coverage | Focus | Baseline confidence | Candidate confidence | Mode effect |
| --- | ---: | ---: | ---: | ---: | --- |
| yargs | 1.00 | 1.00 | 0.40 | 0.40 | none |
| sqlalchemy | 0.33 | 0.50 | 0.40 | 0.40 | none |
| zap | 1.00 | 1.00 | 0.56 | 0.15 | both full |
| sinon | 0.00 | 0.00 | 0.15 | 0.15 | none |
| rich | 1.00 | 0.25 | 0.40 | 0.40 | none |
| viper | 0.67 | 1.00 | 0.54 | 0.15 | route-lite to full-palace |
| crossbeam | 0.75 | 0.75 | 0.83 | 0.83 | none |
| http | 1.00 | 0.50 | 0.80 | 0.15 | route-lite to full-palace |

## Product Decision

1. Revert the binary `0.15` hard cap as a route-confidence scoring rule.
2. Preserve the independent-anchor result as explicit route evidence.
3. Make automatic `bypass` and `route-lite` require sufficient narrowing
   evidence independently of the displayed confidence score.
4. Keep insufficient evidence advisory and force automatic selection to
   `full-palace`; an explicit user override remains an override.
5. Validate the separation on neutral fixtures and disclosed regressions, then
   use a new held-out set before making another generalization claim.

This does not declare the old baseline confidence calibrated. Round 7 already
showed known false-high routes. The next calibration model must be empirical and
graded rather than a binary score collapse, while safety authorization remains
conservative.

## Next Routing Direction

The larger product problem is still route quality. The next repair should target
the observed misses without changing this evidence:

- distinguish Sinon documentation examples from the implementation/test change
  surface;
- connect SQLAlchemy `Session` typing tasks to scoped-session delegation and
  typing tests;
- recover Viper's third modified implementation/test surface;
- retain Crossbeam's bounded four-file route while finding its missing file;
- reduce Rich's six extra files without losing its two oracle files.

The next held-out goal remains `coverage >= 0.90`, `focus >= 0.75`, and no more
than 9 route files.

## Claim Boundary

Round 8 supports a safety-architecture decision: confidence calibration and
narrow-context authorization should be separate. It does not establish Agent
correctness, Token savings, fewer tool calls, shorter wall time, or an efficiency
advantage over Codex without Palace.
