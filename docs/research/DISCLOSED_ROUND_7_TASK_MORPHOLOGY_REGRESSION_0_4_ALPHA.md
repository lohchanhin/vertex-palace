# Disclosed Round 7 Task-Morphology Regression

## Result

**Failed.** The generic task-action morphology repair corrected task classification, but did not change any route or improve coverage, focus, precision, or confidence calibration on the eight disclosed Round 7 targets.

This is a seen-development regression after the original held-out failure. It is not held-out evidence and cannot support claims about Agent correctness, Token use, tool calls, or wall time.

## Frozen Inputs

- Product commit: `084aae31900e41952bc90aaaf959647c473bcc43`
- Harness commit: `0f653c8e0672d6e7df0e4e4ab162583304d53ad6`
- Candidate CLI SHA-256: `0B26DF95458F7302FB76EFB3BD91929EEDEA1F5B94E995339F3D4190141C5C51`
- Original held-out evidence SHA-256: `C53C9186853F1661158212604804261C8394781454A7C7B7DF15811D4E42D7B9`
- Disclosed regression evidence SHA-256: `9779EBEC4A235008DF42B915073B87E93079CF8168B7FAFCA2D42C9CE439BF71`
- Protocol: 8 targets, 2 sequential repetitions per target, route limit 9, 6,000-token context ceiling

## Baseline Comparison

| Metric | Original Round 7 | After morphology repair | Change |
| --- | ---: | ---: | ---: |
| Task types matched | 6/8 | 8/8 | +2 targets |
| Passed targets | 2/8 | 2/8 | 0 |
| Macro changed-file coverage | 0.557 | 0.557 | 0 |
| Macro route focus | 0.480 | 0.480 | 0 |
| Macro route precision | 0.481 | 0.481 | 0 |
| Overconfident trials | 4/16 | 4/16 | 0 |

Every target returned exactly the same ordered route as the original run. Execa changed from `unknown` to `bugfix`, and thiserror changed from `feature` to `bugfix`; the other six task types were already correct.

## Interpretation

1. Leading inflections such as `Fixes`, `Avoid`, and `Prevents` were a real classification defect and are now covered by product tests.
2. Classification was not the causal source of the Round 7 routing failures. Correcting it changed no selected file.
3. Execa remained overconfident at `0.75` after becoming a bugfix, while Mio remained overconfident at `0.86`. Core-pair confidence can therefore override weak or wrong direct evidence.
4. The next repair must target evidence selection itself: discriminate same-module implementation/test mirrors, admit a structurally strong test even when its task text is sparse, and cap confidence unless the selected implementation has independent task evidence.

## Claim Boundary

The repair improves task-type semantics only. It does not improve the measured static routing outcome on this disclosed sample, and it does not show that Vertex Palace saves Tokens or time.
