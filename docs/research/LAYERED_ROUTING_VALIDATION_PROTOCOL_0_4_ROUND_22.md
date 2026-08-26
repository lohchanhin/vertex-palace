# Layered Routing Validation Protocol (0.4.0-alpha.2, Round 22)

## Freeze Boundary

Round 22 uses the 12 targets in `evidence/layered-routing-targets-round-22.json`. The target task, language, stratum, core truth, declared auxiliary truth, latent auxiliary truth, frozen GitHub metadata, runner, candidate tarball, baseline package, and gates are hashed before either product is run on a target. No observed result may change those inputs.

The candidate is `vertex-palace@0.4.0-alpha.2`; the baseline is the public `vertex-palace@0.3.0`. Each condition runs twice per target. Condition order is reversed by target and repetition, and conditions run sequentially.

## Target Balance

The round contains three targets in each task stratum: locally identifiable, GitHub-metadata grounded, high-connectivity cross-file, and unresolvable control. It also contains three targets in each language family: TypeScript, Python, Go, and Rust.

GitHub metadata is frozen and hashed before routing. Formal trials use the frozen one-hour cache. A separate live GitHub smoke test is a network/product check and is not allowed to change the static-routing result.

## Truth Layers

- Core: implementation and focused test files.
- Declared auxiliary: task- or metadata-required contract, configuration, documentation, or changelog files.
- Latent auxiliary: hidden-diff or convention-only files, reported descriptively.

## Gates

The round passes only if all gates pass: accessible reference grounding 100%; control abstention 100% with zero routed files; routable core closure 100%; macro core coverage at least 0.90; macro route focus at least 0.70; every routable target coverage at least 0.50 and focus at least 0.40; declared auxiliary coverage 100%; candidate non-inferiority of at least -0.05 for coverage and focus on targets both products complete; zero overconfidence, wrong forced stops, tracked-file pollution, or payload metric disagreement; deterministic repeated routes; and no candidate context above 6,000 estimated tokens.

## Failure Rule

The first result is preserved unchanged. A failed round resets stable qualification. At most one general mechanism repair may follow, and these targets then become regression-only. A repeated failure class after one general repair and two fresh rounds pauses 0.4 stable for architecture review.

Round 22 is static routing evidence. It does not establish Agent correctness, Token savings, tool-call reduction, or wall-time improvement.
