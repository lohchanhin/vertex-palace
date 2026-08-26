# Vertex Palace 0.4.0-alpha.3 Release-Candidate Verification

## Result

The alpha.3 product and packaging gate passed on clean source commit `c22c8e41e8f415cd182513c1cf7a902ca86ad564`. This verifies that the repaired source can produce a deterministic prerelease artifact. It does not authorize npm `latest`, a stable tag, or any Agent Token, speed, or correctness claim.

## Verified Contracts

- The unchanged full suite passed with 257/257 core tests, 4/4 CLI/MCP tests, and 239 passed research tests with 2 protocol-defined skips.
- Workspace lint, build, MCP smoke, package-version consistency, and temporary-directory installation passed.
- CLI, MCP, workspace packages, plugin metadata, and the packed artifact report `0.4.0-alpha.3` consistently.
- Four repeated uncertain local tasks remained advisory `route-lite`, exposed missing verification, and did not enforce an early stop.
- An opaque task with reference resolution disabled returned structured `abstain`, zero routed source files, and a normal exit.
- The clean install kept `.palace/` out of tracked Git state and exposed all ten MCP tools.

The packed candidate has integrity `sha512-rVwwaZMQNBt8sbJV2Al/vo9RWwPn4NMGMOn159DvHDN8j4CPcVzPjm1M+UpkUGaSMbs5KBPH6RrjrKcnJE9qkA==`. The complete machine record is [release-candidate-0.4.0-alpha.3.json](./evidence/release-candidate-0.4.0-alpha.3.json).

## Research Boundary

The post-observation Round 22 replay passed after the one allowed general repair, but it is disclosed regression evidence only. Stable qualification remains zero. Round 23 was frozen against failed alpha.2 and is retired without being used to qualify alpha.3.

## Publication Boundary

No npm package, Git tag, GitHub release, or marketplace default is created by this verification. Alpha.3 may replace npm `next` only after the fresh preregistered routing gates defined for the repaired candidate are completed. npm `latest` remains `0.3.0` until two consecutive fresh rounds pass.
