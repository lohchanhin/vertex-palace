# Vertex Palace 0.4.0 Release Verification

## Result

Vertex Palace `0.4.0` passed the complete product, packaging, static-routing qualification, and public GitHub transport gates. This authorizes the stable Git tag, GitHub release, npm `latest`, and marketplace default update.

It does not authorize claims that Palace generally reduces end-to-end Agent tokens, wall time, tool calls, or correctness errors. Those performance claims remain gated by the separate randomized Agent A/B.

## Product Verification

- Workspace lint and build passed.
- Core tests passed 257/257; CLI/MCP tests passed 4/4.
- Research tests passed 242 with 2 protocol-defined skips.
- MCP smoke exposed all ten tools and reported version `0.4.0`.
- Version consistency passed for the root package, workspace packages, shared runtime constant, plugin manifest, plugin MCP pin, CLI, and MCP.
- A clean temporary-directory install reported `vertex-palace@0.4.0`, kept `.palace/` out of tracked Git state, and started the installed MCP server.

The stable package has shasum `8b50ca082cce86618a774ae81668c1fd965d722c` and integrity `sha512-s81a+d17EfMhS/Kqszk54DDxYxjTYQ5PnhMHWicP2OEif2H4gSE0Tu+8lAU9ijeAid0fjACqNk9EEGD2IrhOHQ==`. Machine evidence: [release-candidate-0.4.0.json](./evidence/release-candidate-0.4.0.json).

## Fresh Qualification

The unchanged alpha.3 artifact passed two fresh preregistered rounds:

| Round | Core coverage | Route focus | Reference grounding | Control abstention | Hard gates |
| --- | ---: | ---: | ---: | ---: | ---: |
| 24 | 1.000 | 0.972 | 6/6 | 6/6 | 16/16 |
| 25 | 1.000 | 0.972 | 6/6 | 6/6 | 16/16 |

Across 96 sequential observations there were zero overconfident runs, wrong forced stops, tracked-file pollution events, or payload metric disagreements. Candidate context stayed below 6,000 estimated tokens. Round 21 and Round 22 remain immutable negative results; the repaired Round 22 replay is disclosed regression evidence and is excluded from stable qualification.

## Live GitHub Transport

The reproducible smoke test cleared `GH_TOKEN` and `GITHUB_TOKEN`, anonymously fetched public `microsoft/vscode#1`, then resolved the same reference from the one-hour local cache. Both requests produced the same content hash, exactly one cache record was created, and no credential marker appeared in output or cache. Machine evidence: [github-reference-smoke-0.4.0.json](./evidence/github-reference-smoke-0.4.0.json).

## Publication Checklist

- Tag the final verification commit as `v0.4.0` and push the tag.
- Create a GitHub release from that tag with the claim boundary above.
- Publish the exact stable package as npm `latest`, verify registry integrity and clean installation, and move npm `next` to `0.4.0` only after registry confirmation.
- Keep the marketplace default at `v0.4.0` after the tag is reachable.
