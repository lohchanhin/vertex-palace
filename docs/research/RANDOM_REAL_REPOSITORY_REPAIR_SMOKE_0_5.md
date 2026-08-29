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
