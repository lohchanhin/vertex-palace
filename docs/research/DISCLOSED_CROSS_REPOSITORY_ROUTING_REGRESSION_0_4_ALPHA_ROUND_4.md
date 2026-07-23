# Disclosed Cross-Repository Routing Regression (0.4 Alpha, Round 4)

## Decision

**Failed. Candidate `569f7c5` does not advance to a new held-out gate or Agent A/B.**

The repair improved the static aggregate, but only three of eight targets
passed. All `16/16` sequential trials completed with no environment, setup, or
harness failure. The remaining failures are therefore product-routing
failures under this protocol.

These eight tasks were disclosed and used while developing the repair. This
result is a development regression, not held-out or generalization evidence.
It does not execute target tests and cannot support claims about Agent
correctness, Tokens, tool calls, or wall time.

## Before And After

| Metric | Original Round 4 | After repair | Gate |
| --- | ---: | ---: | ---: |
| Passed targets | 2/8 | 3/8 | 8/8 |
| Completed trials | 16/16 | 16/16 | 16/16 |
| Macro changed-file coverage | 0.521 | 0.584 | >= 0.900 |
| Macro route focus | 0.375 | 0.449 | >= 0.750 |
| Macro route precision | 0.375 | 0.448 | >= 0.750 |
| Route files | 34 | 31 | reported only |
| Overconfident trials | 6 | 6 | 0 |
| Environment / harness failures | 0 / 0 | 0 / 0 | 0 / 0 |

The aggregate moved in the intended direction, but the gain is small and does
not satisfy any route-quality promotion gate. A smaller route was not
automatically a better route: aiohttp lost a required test while shrinking
from six files to four.

## Frozen Evidence

| Artifact | Commit / SHA-256 |
| --- | --- |
| Product candidate | `569f7c502fad06790784449e537223c9746e1312` |
| Validation harness commit | `62b74a91221a261e49a3c05c452e46a9a34da5e5` |
| Raw repair evidence commit | `57e5809` |
| Original held-out evidence SHA-256 | `7B8E3833A71D60645DF134D8B87ADF49EAA5557EE59A6AB6D64A537C8A3BB5D3` |
| Repair harness SHA-256 | `A61BB50908C57FA546A77FE59EE42A2A60FC9BC7E9056B5F896C5672BA608342` |
| Repair evidence SHA-256 | `320F5C94234F0F7210ABC517422702AF169C052B2FA9138B4A7FF23F7092FA12` |
| Candidate CLI SHA-256 | `7CF0B35BCE86D953A561038B2BA2F339B9B468BFDC685FB87BA128327E35F101` |

The harness was committed before measurement, required a clean tracked
worktree, pinned the candidate and CLI hash, verified the original observation
hash, ran repositories sequentially, and wrote the new result with create-only
semantics. It could not overwrite the original Round 4 observation.

## Target Comparison

Values were identical across both repetitions for every target.

| Target | Before coverage / focus | After coverage / focus | Result | Main observation |
| --- | ---: | ---: | --- | --- |
| Undici | 1.00 / 0.60 | 1.00 / 0.60 | passed | Stable; all three oracle files plus two related cache files. |
| aiohttp | 1.00 / 0.33 | 0.50 / 0.25 | failed | Route became smaller but dropped `tests/test_helpers.py`; confidence rose to 0.77. |
| validator | 0.00 / 0.00 | 1.00 / 0.67 | passed | Locale scope correctly selected the English implementation/test pair. |
| tracing | 0.00 / 0.00 | 0.00 / 0.00 | failed | Still selected `tracing`, not the `tracing-attributes` workspace crate. |
| MSW | 0.50 / 0.40 | 0.50 / 0.40 | failed | Still missed `RequestHandler.ts` and the request-side mock. |
| Uvicorn | 1.00 / 1.00 | 1.00 / 1.00 | passed | Stable exact implementation/test route. |
| GORM | 0.00 / 0.00 | 0.00 / 0.00 | failed | Route shrank from nine to seven and removed workflows, but still missed every oracle file. |
| Reqwest | 0.67 / 0.67 | 0.67 / 0.67 | failed | Still replaced `src/tls.rs` with `src/async_impl/client.rs`. |

## What The Repair Actually Established

### Supported

The bounded locale/path-scope mechanism transferred from the synthetic fixture
to validator. It changed a completely wrong route into a complete route while
keeping focus above the per-target gate.

Operational-metadata filtering also removed the two `.github` workflow files
from GORM. This reduced noise, but did not recover the causal source boundary,
so it is only partial support.

### Not Supported

1. Workspace ownership did not transfer to tracing. Lexical evidence for the
   public `tracing` crate still dominated the task-owning
   `tracing-attributes` crate.
2. Causal multi-file expansion did not recover the missing MSW, GORM, or
   Reqwest implementation siblings.
3. Evidence-sufficient stopping regressed aiohttp by pruning a required test
   before a complete implementation/test boundary was established.
4. Confidence calibration did not improve. Six trials remained
   overconfident, including zero-coverage tracing and GORM routes.
5. Passing synthetic fixtures did not predict transfer for five of the six
   intended mechanisms. The fixtures were necessary regression checks, but
   not sufficient external validation.

## Recursive Self-Audit

After the report and integrity test were prepared, Vertex Palace evaluated the
four actual changed files. Route `route_f592d3d1c6ff94e1` matched only the
integrity test and missed both reports plus `package.json`. Changed-file
coverage and route focus were `0.25`; confidence was `0.40`, classified as
well-calibrated against the low observed coverage.

The route also selected unrelated shared types and failed-route memory code.
This is consistent with the compound artifact-family weakness observed in the
cross-repository study. It is recorded without immediately tuning against the
new report names; repeated self-targeted tuning would not establish
generalization.

## Next Product Direction

The next candidate should change the routing model, not merely tune score
thresholds:

1. Build competing scope hypotheses first: locale, workspace package/crate,
   module, and task-owned test tree. Rank files only inside the winning
   hypothesis unless cross-scope dependency evidence exists.
2. Expand from an anchor through indexed imports, calls, symbol references,
   and reverse dependencies. Lexical similarity alone must not create a
   required causal sibling.
3. Model implementation/test bundles as evidence sets. Stopping is allowed
   only after every explicit identity and required relation has coverage.
4. Separate assertion tests from mocks, fixtures, and helpers in the oracle
   telemetry while retaining complete changed-file coverage as a strict
   reported metric.
5. Derive confidence from scope margin, relation completeness, and unresolved
   competing bundles. A high lexical score cannot compensate for missing
   ownership or implementation/test relations.
6. Rebuild synthetic fixtures from the observed graph shapes of tracing, MSW,
   GORM, Reqwest, and aiohttp without embedding repository names or target
   paths.

The repaired candidate must first preserve Round 2 and Round 3 disclosed
regressions and improve this disclosed Round 4 set. A newly selected untouched
repository pool is still required before Agent A/B or any generalization
claim.

## Claim Boundary

This is disclosed static routing development evidence. It shows that one
locale-scoping repair transferred and that the broader repair remains
insufficient. It does not show that Vertex Palace saves Tokens, reduces time,
uses fewer tool calls, or improves final Agent task success.
