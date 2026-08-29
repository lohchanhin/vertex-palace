# Random Real-Repository Repair Smoke 0.5

This study is a one-target exploratory smoke test of the latest local Vertex Palace 0.5 candidate. It is not a release gate and cannot establish repair accuracy, routing quality, Token savings, or speed.

## Frozen procedure

1. Query public GitHub issues carrying both `bug` and `good first issue` labels.
2. Mechanically retain active, public, non-fork JavaScript, TypeScript, and Python repositories that fit the recorded size limits and can be exercised by the local toolchain.
3. Freeze the complete eligible pool, its SHA-256 digest, a 256-bit random seed, the chosen issue, the repository commit, and the local candidate CLI digest.
4. Select the issue with the smallest `SHA-256(seed + "\n" + issue URL)` value.
5. Commit and push the selection artifact before exposing the selected issue to Vertex Palace.
6. Clone the frozen commit into an isolated sibling directory. Capture repository status and baseline behavior.
7. Route the exact selected issue through `node dist/palace.cjs`, implement the smallest evidence-backed repair, and run the repository's focused verification.
8. Preserve success, product failure, target invalidity, or environment failure without substituting another target. Never push to the upstream repository.

## Interpretation boundary

The smoke can reveal integration faults and generate a concrete case study. One randomly selected issue is not a benchmark. Positive or negative results must remain an observation, not a performance claim.

## Observation 1

The first frozen target exposed general Vertex Palace failures before any repository repair was attempted:

- Cold indexing took approximately 680 seconds, peaked near 1.58 GB working set, and produced 216.9 MB of indexes for 3,282 files.
- A repeated hot context call still took 33.6 seconds and delivered about 5,623 estimated tokens.
- The explicit GitHub issue URL was not enriched because the prompt already contained local product vocabulary.
- URL components became task terms, so the repository name `maka` matched common imports and displaced the actual Rust ACL implementation.
- Neither of the two issue-derived core evidence files was routed.
- Selecting by repository primary language incorrectly predicted a TypeScript target even though the issue's implementation surface was Rust.

The target repository remains unchanged and its push URL is disabled. This observation is frozen in `random-real-repository-repair-smoke-observation-1-0.5.json`. Development now returns to general mechanisms; no Maka-, issue-, junction-, or path-specific routing rule is permitted.

## Observation 2: generic repair 1

The same frozen task was rerun after explicit URLs were enriched and provider/owner/repository identity was removed from semantic task analysis. Reference grounding succeeded, but the route still missed both core files.

The failure moved one layer deeper: concatenating the complete issue body made remote reproduction paths behave like user-authoritative code paths, while headings, bilingual duplication, environment prose, and logs became dozens of required task subjects. A nested Rust `target/` directory produced by baseline work also changed the index from 3,282 to 3,364 files and forced another approximately 706-second rebuild despite a clean Git HEAD.

The next repair must therefore introduce typed, bounded, non-authoritative reference evidence and depth-independent generated-directory ignores. The unchanged negative result is preserved in `random-real-repository-repair-smoke-observation-2-0.5.json`.

## Observation 3: generic repair 2

The second generic repair separated user-authoritative explicit file contracts from bounded reference prose and added directory-scoped nested `.gitignore` handling. The unchanged frozen target confirmed one real improvement: generated Rust `target/` content disappeared from the index, indexed files returned from 3,364 to 3,282, and the expected Rust implementation entered the route.

The candidate still failed the predeclared core gate. It routed only one of two core evidence files and selected a broad TypeScript Windows smoke test instead of the focused Rust regression. A measured hot context call took 36.303 seconds. More importantly, external evidence was still analyzed in the same channel as task obligations, so renderer labels and issue prose appeared as missing mandatory task subjects.

The next architecture must use separate channels: the task contract controls intent, closure, explicit files, and stopping; bounded external evidence may only recall or softly rank candidates. Hot route latency is a separate performance problem. This failed result is preserved in `random-real-repository-repair-smoke-observation-3-0.5.json`.

## Observation 4: dual-channel boundary and stop decision

The third generic repair introduced distinct routing-hint and task-obligation channels. The semantic boundary worked: reference renderer words, reproduction paths, and unrelated issue prose no longer appeared as task obligations. Only the original task's `Glob` subject and access-safety constraint remained missing.

The product gate still failed. The unchanged fresh-index call took 61.241 seconds, delivered about 5,698 estimated tokens, and again covered only one of two core evidence files. A broad filesystem operation and generic client test displaced the focused Rust regression. Semantic correctness therefore did not produce adequate focus or latency.

This target is now closed for tuning. No further Maka-, issue-, diagnostic-, or path-derived product change is allowed. The next work must profile hot-route stages, replace absolute lexical accumulation with bounded evidence gain and redundancy control, then use fresh blind targets. Observation 4 is preserved in `random-real-repository-repair-smoke-observation-4-0.5.json`.
