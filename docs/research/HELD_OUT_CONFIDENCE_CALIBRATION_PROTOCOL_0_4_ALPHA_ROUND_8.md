# Held-out Confidence Calibration Protocol (0.4 Alpha, Round 8)

## Status

Preregistered after the Round 8 target manifest was selected and committed, but
before the first Vertex Palace call on any selected task. The frozen baseline,
candidate, manifest, paired validator, this protocol, its Simplified Chinese
counterpart, and their contract tests must be committed before measurement.

## Claim Boundary

This study measures static routing, confidence calibration, adaptive mode, and
delivered context for two frozen Vertex Palace versions on the same newly
selected tasks. It does not execute target tests or ask an Agent to implement a
task. It cannot support claims about Agent correctness, reported Token savings,
tool-call reduction, or wall time. The two repetitions are determinism checks,
not independent statistical samples.

The repositories are held out from candidate development and prior research
pools. This does not claim that the underlying model has never encountered the
public repositories.

## Frozen Inputs

| Input | Frozen value |
| --- | --- |
| Baseline product commit | `228c3bde47f6930023496fdd0a54d43dba10091f` |
| Baseline CLI SHA-256 | `E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F` |
| Candidate product commit | `1a02d89269acb36473db3ad39badab9fe338a4a3` |
| Candidate CLI SHA-256 | `49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747` |
| Selector commit | `56c006f36b1b83f1b5756d071ce6f0f3dcdd57e5` |
| Manifest commit | `93d9ae52ceb68f65dc69ec76cee96e8e752eb84a` |
| Manifest SHA-256 | `6678CE22935F938593C9F950636795E3295D18C9AC57D1C1E7A068B145214466` |
| Repository pool SHA-256 | `118644384D9E099E0833E36900ED5A7E10648827FF4C2DE5AF40CE11A0018158` |
| Task classifier SHA-256 | `C3D787029C019FD64BFB079913F23B58082C38560448A9B9567954ECA9FE1254` |

The candidate is the current frozen `dist/palace.cjs`; the validator checks its
hash and verifies that `packages/` and `plugins/vertex-palace/mcp/server.cjs`
still match the candidate commit before and after measurement.

The baseline is rebuilt once in a temporary local shared clone using
`pnpm install --offline --frozen-lockfile --ignore-scripts` followed by
`pnpm build`. Its CLI hash must match the frozen value before any target task is
given to Palace. An unavailable offline package store is an environment/setup
failure, not a product result.

## Disclosed Preflight Correction

Preflight attempt 1 at harness commit
`e89378bb151e3566327624e4cb021e9ac8c8aa21` stopped before materializing a
selected repository or calling Palace on a selected task. The rebuilt baseline
CLI matched its frozen hash, but `pnpm build` also regenerated the tracked
`plugins/vertex-palace/mcp/server.cjs`; the validator incorrectly treated that
known build output as a source modification.

The failed preflight is preserved at
`docs/research/evidence/held-out-confidence-calibration-round-8-preflight-attempt-1.json`.
The correction allows exactly that generated bundle modification, verifies that
`packages/` remains unchanged, and retains the exact baseline CLI hash gate. No
target, condition order, metric, tolerance, or product artifact changed, and the
eight tasks remain unexposed to both measured Palace versions.

## Frozen Targets

The create-only Round 8 manifest selected eight tasks in binding order, exactly
two per language family. Regex and Hashbrown had no eligible commit; Hyperium
HTTP supplied the second Rust target. Selection had zero setup failures and zero
Palace calls.

| Order | Target | Family | Task type | Oracle files | Implementation | Path-derived tests |
| ---: | --- | --- | --- | ---: | ---: | ---: |
| 1 | yargs | JavaScript/TypeScript | bugfix | 2 | 1 | 1 |
| 2 | sqlalchemy | Python | bugfix | 3 | 2 | 1 |
| 3 | zap | Go | bugfix | 2 | 1 | 1 |
| 4 | sinon | JavaScript/TypeScript | bugfix | 2 | 1 | 1 |
| 5 | rich | Python | bugfix | 2 | 1 | 1 |
| 6 | viper | Go | bugfix | 3 | 2 | 1 |
| 7 | crossbeam | Rust | feature | 4 | 2 | 2 |
| 8 | http | Rust | bugfix | 2 | 1 | 1 |

The unedited commit subject is the task. The complete eligible modified-file set
is the oracle. Test roles are path-derived and do not prove that an assertion was
executed.

## Paired Execution

Targets run sequentially in manifest order; conditions are never concurrent.
Even manifest indexes run baseline then candidate, while odd indexes run
candidate then baseline, producing four AB and four BA targets.

For each target, the validator:

1. Materializes and verifies one pinned source repository and the complete Git
   oracle.
2. Creates separate local shared clones for baseline and candidate so tracked
   files and `.palace` state cannot cross conditions.
3. Deletes `.palace`, then runs `init`, `index`, and `status` with that
   condition's frozen CLI.
4. Runs two formal repetitions. Each repetition runs `evaluate` with the frozen
   oracle, followed by `context --auto` with a warm explicit index.
5. Independently recomputes calibration from route confidence and changed-file
   coverage, then records routing, mode, boundaries, context bytes and estimated
   tokens.
6. Verifies deterministic route order and membership and confirms tracked target
   files remain clean.

## Fixed Limits and Retry Policy

- Targets: 8
- Conditions: baseline and candidate
- Repetitions: 2 per target and condition
- Formal observations: 16 per condition, 32 total
- Context budget: 6,000 estimated tokens
- Route limit: 9 files
- Maximum drawers: 4
- Repository materialization attempts: at most 3
- Fresh-index attempts: at most 2, and only transient `EAGAIN`, `ENOMEM`, or
  `ETIMEDOUT` failures may be retried
- `evaluate` and `context` retries: 0
- Execution: sequential, never concurrent

Product and contract failures are not retried or censored. Environment/setup,
harness, and product findings remain separate in the result.

## Calibration Definitions

The independently observed signed error is `confidence - changed-file coverage`.
With the preregistered tolerance `0.15`:

- greater than `+0.15`: overconfident;
- less than `-0.15`: underconfident;
- otherwise: well-calibrated.

Calibration mean absolute error, false-high and false-low counts are reported at
both trial and target level. Only the first deterministic repetition per target
is used for the paired conclusion.

`bypass` or `route-lite` is an unsafe narrow mode when observed changed-file
coverage is below `0.90`. Lower confidence can select a broader mode and increase
context, so context deltas are reported as costs, not Token savings.

## Product Gates and Paired Findings

Baseline and candidate receive the same descriptive routing gates:

1. All 8 targets and 16 trials complete for the condition.
2. Task type, implementation, path-derived test, and any auxiliary coverage are
   complete.
3. Routes are deterministic across repetitions.
4. Macro coverage is at least `0.90`; macro focus and precision are at least
   `0.75`; every target focus and precision are at least `0.50`.
5. Overconfident trials equal zero.
6. Context stays within 6,000 estimated tokens, boundaries do not overlap,
   explicit indexes are fresh, and tracked target files stay clean.

Baseline gate failure is an observed comparison result and does not invalidate
the study. Candidate gate status is reported independently.

The paired calibration finding uses one repetition per target:

- `supported`: overconfident targets decrease, underconfident and total
  miscalibrated targets do not increase, mean absolute error does not increase,
  routes do not change, and unsafe narrow modes do not increase;
- `tradeoff`: overconfidence decreases but at least one false-low or error
  non-inferiority condition fails;
- `no-difference`: target-level calibration counts and mean absolute error are
  unchanged;
- `regression`: routes change, unsafe narrow modes increase, or calibration
  error worsens without the required improvement;
- `mixed` or `incomplete`: the preceding rules do not yield a clean conclusion.

Mode shifts and context deltas are reported separately from this calibration
finding.

## Status and Evidence Preservation

An environment/setup or harness failure makes the study `invalid`. A negative,
null, or mixed product result remains a scientifically valid `completed` study;
it must not be relabeled as an environment failure.

The validator writes exactly one create-only result:

`docs/research/evidence/held-out-confidence-calibration-0.4-alpha-round-8.json`

The first result is preserved without target removal, rewriting, replacement,
or rerouting. Any later repair must use a separately named disclosed regression
study and cannot relabel Round 8 as held out.

## Command

Run only after the protocol, paired validator, and tests are committed and the
tracked worktree is clean:

```powershell
node scripts/verify-held-out-confidence-calibration-round-8.cjs --out docs/research/evidence/held-out-confidence-calibration-0.4-alpha-round-8.json
```
