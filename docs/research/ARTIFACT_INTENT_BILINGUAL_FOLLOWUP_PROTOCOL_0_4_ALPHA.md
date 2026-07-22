# Artifact-Intent Bilingual Follow-up Protocol (0.4 Alpha)

## Status

Preregistered before the first formal observation. This protocol and its validation script must be committed before the evidence command is run.

## Question

Does candidate `0b6a0fd92f43a74c983663cd32f937087e3ec923` repair the previously observed Simplified Chinese recursive artifact-family failure without regressing English routing, older artifact families, product repairs, external seen repositories, or confidence calibration for nonexistent families?

## Claim Boundary

This is a seen-target static routing regression and candidate self-audit. It is not held-out validation and does not measure end-to-end Agent correctness, tokens, or wall time. Passing permits the candidate to advance to held-out testing; it does not prove Agent performance gains.

## Frozen Candidate

- Product commit: `0b6a0fd92f43a74c983663cd32f937087e3ec923`
- CLI: `dist/palace.cjs`, rebuilt from the frozen product paths before validation
- Budget: 6,000 estimated input tokens
- Route limit: 9 files
- Maximum drawers: 4
- Repetitions: 2 sequential trials per target
- Concurrency: none

The harness rejects any difference between the frozen product commit and the current product paths. Protocol, harness, report, and evidence files are outside that frozen product path set.

## Targets

The external regression set remains the previously observed, commit-pinned Zod, Requests, and p-limit tasks. Their file oracles are unchanged.

The candidate audit contains nine preregistered targets:

1. Original cross-repository artifact family, English.
2. Original cross-repository artifact family, Simplified Chinese.
3. Recursive post-self-audit artifact family, English.
4. Recursive post-self-audit artifact family, Simplified Chinese, using the exact task that failed the preceding formal regression.
5. Compound product routing repair.
6. Release-vocabulary product routing repair.
7. Current named-artifact product repair.
8. Nonexistent post-cobalt-harbor family, English negative control.
9. Nonexistent post-cobalt-harbor family, Simplified Chinese negative control.

## Gates

Every target must complete both sequential trials with deterministic route files, no tracked worktree changes, no selected/excluded boundary overlap, and context payloads at or below 6,000 estimated tokens.

- External repositories: expected changed-file coverage and accepted-route precision must both equal 1.00.
- Existing and recursive artifact families: changed-file coverage must equal 1.00, route focus must be at least 0.85, accepted-route precision must equal 1.00, and the route may contain at most 7 files.
- Compound and release-vocabulary product repairs: coverage, focus, and accepted-route precision must equal 1.00, with at most 7 files.
- Current named-artifact product repair: coverage, focus, and accepted-route precision must equal 1.00, with at most 4 files.
- Both nonexistent-family controls: expected coverage must equal 0, route confidence must be at most 0.15, accepted-route precision must equal 1.00, and the route may contain at most 7 files.
- No completed trial may be classified as overconfident.
- Candidate status must be fresh immediately after explicit indexing.

Any failed gate rejects this candidate from held-out promotion. Failures remain evidence and are not reinterpreted as passes.

## Evidence Preservation

The first formal observation must be created at:

`docs/research/evidence/artifact-intent-bilingual-followup-0.4-alpha.json`

The harness uses exclusive creation and refuses to overwrite an existing result. The output is committed unchanged, hashed with SHA-256, and then interpreted in separate English and Simplified Chinese result reports.

## Command

Run only after this protocol and `scripts/verify-artifact-intent-bilingual-followup.cjs` are committed:

```powershell
node scripts/verify-artifact-intent-bilingual-followup.cjs --out docs/research/evidence/artifact-intent-bilingual-followup-0.4-alpha.json
```

