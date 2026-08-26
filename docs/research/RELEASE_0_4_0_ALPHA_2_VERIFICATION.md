# Vertex Palace 0.4.0-alpha.2 Release Verification

## Result

The alpha.2 product and packaging gate passed on clean source commit `20e797d5558d671e01effd4528fef077d6d78f83`. This authorizes an npm `next` and GitHub prerelease only. It does not authorize npm `latest`, a stable tag, or an Agent performance claim.

## Verified Contracts

- Workspace lint, all 252 core tests, CLI/MCP tests, and the complete research lifecycle suite passed.
- CLI, MCP, workspace packages, plugin metadata, and the packed npm artifact report `0.4.0-alpha.2` consistently.
- Four repeated uncertain local tasks stayed in advisory `route-lite`, used 1,729 estimated tokens, exposed missing verification, and did not enforce a stop.
- An opaque task with reference resolution disabled returned structured `abstain`, zero routed source files, and a normal exit.
- Layered evaluation gated core truth independently from latent auxiliary truth.
- Dense memory output remained below its 5,000-token ceiling in both JSON and Markdown.
- The clean install kept `.palace/` out of tracked Git state and the installed MCP exposed all ten tools.

The machine record is [release-candidate-0.4.0-alpha.2.json](./evidence/release-candidate-0.4.0-alpha.2.json).

## Negative Boundary

Vertex Palace evaluated this full 53-file product, release, and research change as one compound task. The route covered 18% of core truth and 0% of declared auxiliary truth, with 88% focus, and correctly returned `needs-review` plus an overconfidence warning. This is not an ordinary coding-task benchmark, but it is a useful disclosed limitation: repository-wide release orchestration still requires an explicit checklist and cannot rely on one route.

## Next Gate

Round 22 and Round 23 must be hash-frozen before either candidate or baseline is run. Both fresh rounds must pass unchanged preregistered gates before stable `0.4.0` or npm `latest` can be published.
