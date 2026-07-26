# Disclosed Round 8 Condition Repository Repair Protocol (0.4 Alpha)

## Status and Evidence Chain

Preregistered after preserving the first Round 8 result and before retrying any
Palace operation on a selected task.

The original create-only result is immutable:

- Path:
  `docs/research/evidence/held-out-confidence-calibration-0.4-alpha-round-8.json`
- Commit: `ea3504b770b26bae1ceeb684efe835ad72b0c66e`
- SHA-256:
  `F8779C649DCA4350B4E22FBF3E423047371F74F03F6EFB6E3356C2B81083B733`
- Status: `invalid`
- Formal trials: baseline 0, candidate 0

All sixteen conditions failed during local condition-repository setup before
`init`, `index`, `evaluate`, or `context`. The selected repositories were
materialized to verify their Git oracle, but neither measured Palace version
received a selected task. The candidate remains unchanged and untrained on these
tasks. This retry is nevertheless labeled a disclosed harness repair and cannot
replace or relabel the original invalid result.

## Root Cause

The original validator created each isolated condition with `git clone --shared`
from a shallow source repository whose checked-out `HEAD` was the route parent.
The selected ground-truth child commit existed in the source object store but
was not reachable from a copied branch. The condition clone therefore could not
resolve `<groundTruthCommit>^`, and Git oracle verification stopped before any
Palace command.

This was a generic Git materialization defect. Both products failed identically,
so the invalid output contains no routing or calibration evidence.

## Frozen Repair

Only condition-repository materialization changes:

1. The already verified source repository creates private refs for the route and
   ground-truth commits.
2. Each condition still receives a physically separate local repository.
3. That repository initializes with `git init`, adds the verified source as a
   local remote, and fetches both private refs with depth 2.
4. It checks out the route commit and reruns the complete Git oracle before any
   Palace command.

A synthetic two-commit repository test must prove that an isolated condition can
resolve the ground-truth parent and exact modified-file oracle.

No product source, CLI artifact, selected task, condition order, repetition,
oracle, retry policy, context budget, route limit, drawer limit, calibration
tolerance, metric, gate, or conclusion rule changes. The baseline and candidate
remain:

| Role | Product commit | CLI SHA-256 |
| --- | --- | --- |
| Baseline | `228c3bde47f6930023496fdd0a54d43dba10091f` | `E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F` |
| Candidate | `1a02d89269acb36473db3ad39badab9fe338a4a3` | `49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747` |

The paired execution remains four AB and four BA targets, two deterministic
repetitions per target and condition, 16 observations per condition and 32
total. It remains sequential and never concurrent. Calibration tolerance remains
`0.15`; route budget remains 9 files and context budget remains 6,000 estimated
tokens.

## Claim Boundary

The repaired run is a disclosed continuation of the candidate-held-out static
comparison, not a new first held-out observation. It can measure whether the
confidence repair generalizes on the frozen tasks because the product did not
see them before this harness correction. It still does not execute target tests
or an Agent and cannot support Agent correctness, reported Token, tool-call, or
wall-time claims.

Environment/setup, harness, and product failures remain separate. A negative or
null product result is valid evidence and cannot be censored as an environment
failure.

## Evidence Preservation

The repaired validator writes exactly one separately named create-only result:

`docs/research/evidence/disclosed-round-8-after-condition-repository-repair-0.4-alpha.json`

The result embeds and hash-verifies the original invalid evidence before and
after measurement. It cannot overwrite the original Round 8 file.

## Command

Run only after this protocol, its Simplified Chinese counterpart, the repaired
validator, and contract tests are committed with a clean tracked worktree:

```powershell
node scripts/verify-disclosed-round-8-after-condition-repository-repair.cjs --out docs/research/evidence/disclosed-round-8-after-condition-repository-repair-0.4-alpha.json
```
