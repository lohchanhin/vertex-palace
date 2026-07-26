# Disclosed Round 8 SQLAlchemy Timeout Completion Protocol (0.4 Alpha)

## Status and Evidence Chain

This protocol is preregistered after preserving both earlier Round 8 outputs and
before any further Palace operation on SQLAlchemy.

The first create-only result remains immutable:

- Path: `docs/research/evidence/held-out-confidence-calibration-0.4-alpha-round-8.json`
- Commit: `ea3504b770b26bae1ceeb684efe835ad72b0c66e`
- SHA-256: `F8779C649DCA4350B4E22FBF3E423047371F74F03F6EFB6E3356C2B81083B733`
- Status: `invalid`; baseline 0 and candidate 0 formal trials

The disclosed condition-repository repair result also remains immutable:

- Path: `docs/research/evidence/disclosed-round-8-after-condition-repository-repair-0.4-alpha.json`
- Commit: `9eb29b4cdb639ccbb8db11df070fedb6498c49e6`
- SHA-256: `E6216E3F6F43BFC3CD42A2B5E640777349B1977250BB43A159AC5155FFF3A23D`
- Status: `invalid`; baseline 14 and candidate 14 formal trials across seven paired targets

The second result completed both repetitions for yargs, zap, sinon, rich,
viper, crossbeam, and http. SQLAlchemy was the only missing target. Its
candidate and baseline indexes each exhausted two attempts of approximately
300 seconds with `ETIMEDOUT`, before `evaluate` or `context` received the task.
No completed target may be rerun in this completion.

## Frozen Environment Completion

Only the SQLAlchemy explicit-index execution policy changes:

1. Run SQLAlchemy only, at its original manifest index 1.
2. Preserve its original paired order: candidate, then baseline.
3. Use one fresh repository and one fresh `.palace` per condition.
4. Replace two 300-second index attempts with one 900-second index attempt per
   condition. This increases the ceiling without adding a post-result retry.
5. Keep two deterministic `evaluate` and `context` repetitions per condition,
   for two observations per condition and four total.
6. Execute sequentially and never concurrently.

No product source, CLI artifact, selected task, Git oracle, route limit,
drawer limit, context budget, calibration tolerance, metric, product gate, or
conclusion rule changes. The frozen products remain:

| Role | Product commit | CLI SHA-256 |
| --- | --- | --- |
| Baseline | `228c3bde47f6930023496fdd0a54d43dba10091f` | `E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F` |
| Candidate | `1a02d89269acb36473db3ad39badab9fe338a4a3` | `49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747` |

Calibration tolerance remains `0.15`, the route limit remains 9 files, and the
context ceiling remains 6,000 estimated tokens.

## Analysis Rule

This output is supplementary. It cannot replace either earlier result. If both
conditions complete, its first deterministic repetition is combined
descriptively with the seven previously completed target pairs to produce the
frozen eight-target comparison. If either condition still fails for an
environment or harness reason, the eight-target comparison remains incomplete.
A negative product result remains evidence and must not be reclassified as an
environment failure.

## Claim Boundary

This is a disclosed environment completion, not a fresh first observation and
not a new held-out target selection. It measures static route membership,
coverage, focus, confidence calibration, mode selection, and delivered context
size only. It does not execute target tests or an Agent and cannot support Agent
correctness, reported Token, tool-call, or wall-time claims.

## Evidence Preservation

The validator writes one separately named create-only output:

`docs/research/evidence/disclosed-round-8-sqlalchemy-timeout-completion-0.4-alpha.json`

It hash-verifies both prior outputs before and after measurement and writes with
exclusive creation. It cannot overwrite either earlier Round 8 result.

## Command

Run only after this protocol, its Simplified Chinese counterpart, the validator,
and contract tests are committed with a clean tracked worktree:

```powershell
node scripts/verify-disclosed-round-8-sqlalchemy-timeout-completion.cjs --out docs/research/evidence/disclosed-round-8-sqlalchemy-timeout-completion-0.4-alpha.json
```
