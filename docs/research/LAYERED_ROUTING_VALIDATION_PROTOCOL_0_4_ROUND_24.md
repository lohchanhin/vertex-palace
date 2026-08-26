# Layered Routing Validation Protocol (0.4.0-alpha.3, Round 24)

## Qualification Role

Round 24 is the first fresh qualification round after the single general explicit-evidence repair. Round 22 remains a failed immutable alpha.2 result and its alpha.3 replay remains disclosed regression evidence only. Round 23 is retired because it was frozen against alpha.2. No Round 24 target task is routed before this protocol, the manifest, runner, and product packages are hash-frozen.

## Freeze Boundary

The complete 12-target manifest is `evidence/layered-routing-targets-round-24.json`. Before either condition runs, the target tasks, language and stratum assignments, core truth, declared and latent auxiliary truth, resolved GitHub metadata, runner, candidate tarball, public baseline package, and numerical gates are hashed. The first observed result is immutable.

The candidate is `vertex-palace@0.4.0-alpha.3`; the baseline is public `vertex-palace@0.3.0`. Each condition runs twice for every target. Candidate/baseline order is balanced by target and repetition, and all observations run sequentially.

## Target Balance

The round has three locally identifiable tasks, three frozen GitHub-metadata tasks, three high-connectivity cross-file tasks, and three controls that must abstain. TypeScript, Python, Go, and Rust each contribute three targets. IDs, symbols, implementation paths, focused test paths, and reference numbers are unique across Rounds 22-25.

Formal GitHub-reference trials use frozen one-hour cache records whose normalized metadata is hashed in the freeze. A separate real-network GitHub smoke test checks transport only and cannot change the formal result.

## Truth Layers

- Core truth: implementation and focused test files.
- Declared auxiliary truth: a contract, configuration, documentation, or changelog file explicitly required by the task or frozen metadata.
- Latent auxiliary truth: hidden-diff or convention-only files, reported descriptively and excluded from the hard core gate.

## Stable Gates

The round passes only if all gates pass: reference grounding 100%; control abstention 100% with zero source drawers; routable implementation/test core closure 100%; macro core coverage at least 0.90; macro route focus at least 0.70; every routable target coverage at least 0.50 and focus at least 0.40; declared auxiliary coverage 100%; candidate non-inferiority of at least -0.05 for coverage and focus on commonly completed targets; zero overconfidence, wrong forced stops, tracked-file pollution, or metric disagreement; deterministic repeated routes; and no candidate context above 6,000 estimated tokens.

## Failure And Claim Rules

A failed first result is committed unchanged and resets the stable qualification count. Because the explicit-evidence failure class already received its one general repair, a recurrence across two fresh rounds pauses stable 0.4 for architecture review rather than authorizing target-specific fixes. Passing Round 24 alone is not enough; the unchanged alpha.3 candidate must also pass fresh Round 25.

This is static-routing, grounding, abstention, and context-contract evidence only. It does not establish Agent correctness, Token savings, tool-call reduction, or wall-time improvement.
