# Held-out Cross-Repository Routing Protocol (0.4 Alpha, Round 4)

## Status

Preregistered after mechanical target selection and before candidate `efd5327`
initializes, indexes, routes, evaluates, contextualizes, or packs any selected
task. This protocol, its Simplified Chinese counterpart, the validation
harness, and the manifest regression tests must be committed before the first
formal observation.

## Frozen Inputs

- Product candidate:
  `efd53274e42fb8123745f2b8bb09a24e4fa384b7`
- Candidate CLI SHA-256:
  `E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0`
- Selector commit:
  `96af578295484831e4a14511baf0e88cb69cc081`
- Target manifest commit:
  `7ccf0c7d668f4a9790186ba4659a76fd4a30813d`
- Target manifest:
  `docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-4.json`
- Target manifest SHA-256:
  `D6A1DDCDA3BD704D1F809279229153F72B4CF6162F1C1231C40D36F18626F5C0`
- Repository pool SHA-256:
  `DF36C82D51AF4B91DF6E67E9848AD54EBB5FE99E9F4DF03498BC1A0FFD6E1A0A`
- Palace calls on selected tasks before this protocol: `0`

Runtime paths `packages/` and `plugins/vertex-palace/mcp/server.cjs` must remain
identical to the product candidate. The harness does not rebuild before
measurement; it verifies the frozen CLI hash directly.

## Mechanically Selected Targets

Expected task type, route commit, ground-truth commit, and the complete
modified-file oracle were all frozen before Palace exposure.

| Repository | Type | Task | Oracle files |
| --- | --- | --- | --- |
| Undici | bugfix | `fix: handle empty qualified private cache directive` | `lib/util/cache.js`; `test/cache-interceptor/utils.js`; `test/interceptors/cache.js` |
| aiohttp | bugfix | `Fix parse_mimetype producing spurious empty-key parameter for whitespace-only segments after semicolons (#13010)` | `aiohttp/helpers.py`; `tests/test_helpers.py` |
| validator | feature | `Add English translations for prefix and suffix validators (#1583)` | `translations/en/en.go`; `translations/en/en_test.go` |
| tracing | feature | `Support constant expressions as instrument field names (#3158)` | `tracing-attributes/src/attr.rs`; `tracing-attributes/src/expand.rs`; `tracing-attributes/src/lib.rs`; `tracing-attributes/tests/fields.rs` |
| MSW | bugfix | `fix(HttpResponse): forward cookies only when response is used (#2728)` | `src/core/handlers/RequestHandler.ts`; `src/core/utils/HttpResponse/decorators.ts`; `src/core/utils/request/storeResponseCookies.ts`; `test/browser/rest-api/request/request-cookies.mocks.ts` |
| Uvicorn | bugfix | `Fix typo: error_occured -> error_occurred (#2776)` | `tests/test_lifespan.py`; `uvicorn/lifespan/on.py` |
| GORM | bugfix | `Fix potential rows leak on panic by deferring rows.Close() (#7798)` | `callbacks/delete.go`; `callbacks/update.go`; `finisher_api.go`; `tests/query_test.go` |
| Reqwest | feature | ``feat: expose the negotiated TLS version via `TlsInfo` (#3067)`` | `src/connect.rs`; `src/tls.rs`; `tests/client.rs` |

The harness verifies each exact subject, parent relationship, `M` status,
changed-file list, file existence on both sides, and expected task type directly
from Git before invoking Palace.

## Oracle Limitation

The Git diff is reproducible, but role labels are path-derived. A changed file
under a test tree can be a helper, mock, or fixture rather than an assertion
file. This is visible in Undici's test utility and MSW's
`request-cookies.mocks.ts`.

The study therefore measures whether Palace recovers the complete historical
change boundary selected by the frozen rule. It does not claim that every
`testFiles` entry independently executes an assertion, and it does not run the
target repositories' tests.

## Execution

Each repository is freshly materialized at its route commit. Git
materialization may be attempted up to three times, with all attempts recorded.
The frozen CLI then creates a fresh Palace and explicitly indexes the
repository.

Fresh indexing may be attempted twice only when the process reports
`ETIMEDOUT`, `EAGAIN`, or `ENOMEM`. The `.palace` directory is removed before
the second attempt. Non-transient index failures do not retry.

Every target then performs two sequential formal trials. Each trial runs
`evaluate` followed by `context --auto` with:

- budget: 6,000 estimated input tokens;
- route limit: 9 files;
- maximum drawers: 4;
- no evaluate or context retry;
- no concurrent target or repetition execution.

Retries make the static correctness observation less vulnerable to transfer or
index-host interruptions, but they prohibit interpreting recorded elapsed time
as a clean performance comparison.

## Promotion Gates

The candidate passes only when all conditions hold:

- all eight targets complete both trials;
- every observed task type matches the frozen expected type;
- every target routes all declared implementation and path-derived test files;
- macro changed-file coverage is at least `0.90`;
- macro route focus and route precision are each at least `0.75`;
- no target route focus or route precision is below `0.50`;
- route order and membership are deterministic across repetitions;
- no completed trial is `overconfident` against observed coverage;
- context remains at or below 6,000 estimated tokens;
- selected and excluded boundaries do not overlap;
- status is fresh immediately after explicit indexing;
- Palace modifies no tracked target file.

Exact-oracle target count is reported but is not an additional gate. The
thresholds are unchanged from Round 3 and were not selected after seeing Round
4 routes.

Environment/setup, harness-contract, and product/contract failures are recorded
separately. Any unresolved category prevents promotion. A failed output is not
overwritten, no target is replaced, and evaluate/context trials are not rerun
under the same evidence path.

## Evidence Preservation

The first formal observation must be created exclusively at:

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-4.json`

The harness uses create-only output. Raw evidence must be committed unchanged
and hashed before interpretation or product repair begins.

## Claim Boundary

Passing supports candidate-held-out static route generalization for this
balanced eight-target sample only. The repositories are public and are not
claimed to be model-unseen. The study does not execute target tests and cannot
prove final Agent correctness, reported Token reduction, lower wall time, or
fewer tool calls.

Failing rejects promotion to Agent A/B and turns all eight tasks into disclosed
development data. Passing only authorizes planning a separately preregistered,
sequential Agent study.

## Command

Run only after this protocol and validation harness are committed and the
tracked worktree is clean:

```powershell
node scripts/verify-held-out-cross-repository-routing-round-4.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-4.json
```
