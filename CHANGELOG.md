# Changelog

## Unreleased

## 0.3.0 - 2026-07-19

### Added

- True auto-bypass for a high-confidence single-file route when a preflight confirms no relevant current memory and no cross-stack, contract, tenant, or broad-scope risk.
- A three-field bypass transport containing only `mode`, `primaryCandidate`, and `reason`.
- Machine-readable execution boundaries for Primary, Support, Deferred, Excluded, Required Evidence, Do Not, Stop Condition, and Conflict Summary.
- A dedicated `scopeRisk` signal and a bounded memory-relevance preflight before automatic mode selection.
- A `verificationChangeRisk` signal that keeps explicitly requested test changes out of single-file bypass mode.
- Structured Python parsing for classes, qualified methods, async functions, imports, and complete indentation-bounded symbol ranges.
- A pinned real-repository validation gate for Zod and Requests using a clean install of the local npm tarball.
- A reproducible `pnpm test:release-candidate` gate that packs and installs the local tarball, exercises a 240-file fixture, validates memory fallback and execution boundaries, and starts the installed MCP server.
- A clean-install dense-memory gate that verifies 50 auditable candidates against both JSON and Markdown context ceilings.

### Changed

- Relevant memory now prevents bypass and selects scoped Full Palace delivery without mechanically converting every memory-bearing task into Guarded Memory mode.
- Public API preservation wording is treated as a routing guardrail, so generic `api` and currency literals such as `0.00` no longer create false route targets.
- Adaptive payload budgeting measures the complete serialized output, then summarizes or defers the lowest-priority loaded drawers until the selected ceiling is satisfied.
- Guarded retrieval ranks and considers at most 50 relevant memory candidates, while retaining an inclusion or machine-readable exclusion reason for every candidate in that bounded set.
- The Codex plugin explicitly stops broad exploration after Primary, Required Evidence, tests, and conflict checks satisfy the delivered stop conditions.
- Mixed feature-and-release routing now allocates implementation, regression, transport, CLI, MCP, plugin, documentation, and package surfaces in rounds, with English and Chinese regression coverage.
- Tenant memory can resolve a client from a unique historical business alias when the task explicitly asks for prior decisions, at least three non-generic alias tokens match, and the winning client leads every alternative by at least two tokens.
- A route entry matching that inferred client becomes the sole Primary while the former static Primary is demoted to Support with an explicit reason.
- Lexical routing now normalizes common code-task morphology, avoids substring intent matches such as `grade` inside `upgrades`, indexes bounded implementation search terms, and reserves route capacity for test-to-implementation relationships.
- Test symbols remain verification context rather than receiving implementation-tier boosts, and symbol-level test names can link focused tests to the methods they exercise.
- Focused bugfix routes now use an implementation anchor, evidence-strength thresholds, destination lexical relevance, verification-first relations, and explicit version coherence instead of filling every available route slot.
- Multi-surface tasks recognize routing quality, validation, MCP, and distribution intent, cannot use focused expansion, and receive a conservative confidence cap based on task breadth.
- Evidence-maintenance tasks now recognize English and Chinese source, precision, protocol, plan, documentation, README, localization, and memory-budget intent, then allocate implementation, test, config, and role-diverse documentation surfaces explicitly.
- Evaluation documentation selection prefers narrative evidence, the current protocol, the project README, and localized counterparts instead of filling the route with old protocols, raw trial JSON, or nested historical READMEs.
- Publication intent now distinguishes an instruction to publish from maintenance of release-candidate evidence, release notes, release checklists, and release reports.
- Evidence/source/config synchronization reserves a verification surface, while bounded bugfix routes that explicitly request regression work require a direct test or spec file instead of treating release smoke scripts as the companion.

### Fixed

- Prevented tasks such as "independently governed launch tenant" from retrieving Aurora history and then excluding it as `scope_mismatch` merely because the literal client name was absent.
- Prevented inferred client context from simultaneously labeling a shared fallback as Primary in the rendered execution boundaries.
- Prevented issue-style tasks from returning only tests while excluding the implementation in real TypeScript and Python repositories.
- Prevented explicit requests to update regression tests from collapsing into a one-file bypass payload.
- Prevented focused routes from expanding through every symbol in a large source file, following weak imports, or mixing explicit version families when same-version evidence exists.
- Prevented dense memory-selection telemetry and execution boundaries from pushing delivered Markdown or JSON beyond the advertised `maxContextTokens` ceiling.
- Prevented explicit repair work from being misclassified as evidence evaluation merely because the task also mentions synchronization or research artifacts.
- Prevented empty normalized non-ASCII entities from matching every source path.
- Prevented documentation updates containing `release-candidate` from being routed as npm publication work.
- Prevented high-scoring release verification scripts from displacing the requested regression test in a small bugfix route.

### Verification

- Four repeated small-local trials in a repository with 240 generated distractor files all selected `bypass`, named the intended `src/format-currency.mjs` target, emitted exactly three JSON fields, and stayed below 80 estimated payload tokens.
- The mixed feature-and-release fixture reached 0.96 changed-file coverage and 0.96 route focus in both English and Chinese task variants.
- A non-study memory-dependent smoke retrieved 2/2 Aurora candidates, excluded 0, emitted `unique_historical_alias_match`, promoted `clients/aurora/article-tokens.mjs` to the only Primary, and demoted the shared token to Support.
- An ambiguous two-client regression keeps both memories excluded as `scope_mismatch`; alias inference does not break tenant isolation when evidence ties.
- These product-contract tests do not yet prove parity with Control tool calls, reported tokens, or wall time; that requires the fresh Control-first benchmark planned for 0.3.1.
- The pinned Zod and Requests gate now requires both target recall and strict target precision to equal 1.000. Both repositories produced exact two-file routes with no unexpected boundary files in two deterministic repetitions; this remains a product gate, not an Agent-performance claim.
- A fixed eight-file evidence-maintenance oracle in `benchmarks-demo` improved from 3/8 coverage and 0.30 focus to 8/8 and 1.00 focus, while route confidence stayed conservatively capped at 0.35. The product's own six-file implementation self-evaluation still reached only 3/6 coverage and 0.30 focus, so multi-module bugfix companions and generated-artifact linkage remain open work.
- A follow-up real benchmark synchronization selected all 8/8 changed files plus the explicitly requested CI workflow: coverage 1.00, focus 0.89, and confidence 0.35. A separate eight-file product self-evaluation reached only 5/8 coverage and 0.50 focus, missing the publication-intent helper, classifier sibling, and generated MCP bundle; sibling and provenance routing therefore remain open.
- In a clean install with 50 relevant memory candidates, JSON delivered 4,050 / 5,000 estimated tokens and Markdown delivered 4,473 / 5,000. Reported bytes matched the serialized outputs, and all 47 excluded candidates retained `selection_limit_reached` reasons.

## 0.2.4 - 2026-07-19

### Added

- Machine-readable memory-selection telemetry for Adaptive context output: candidate and included IDs, included counts, and every excluded memory ID with a stable reason.
- Payload counts for retrieved and excluded memory, plus a readable `Memory Selection` section in Markdown.
- Regression coverage for useful Full Palace memory and the `scope_mismatch`, `expired`, `selection_limit_reached`, and `token_budget_exceeded` exclusion paths.

### Changed

- Guarded memory selection now keeps an auditable record of every retrieved candidate instead of discarding filtered entries before the packer can explain them.
- Tenant-scoped candidates are rejected when an explicitly different client or tenant is named in the task.

### Research

- This release proves memory-delivery fidelity and observability at the product-contract level. It does not claim an end-to-end token, time, or correctness advantage over Control; that requires a new frozen benchmark.

## 0.2.3 - 2026-07-19

### Added

- A dedicated `release` task type with English and Chinese publication intent recognition.
- Cross-ecosystem package-manifest routing for npm, PyPI, Cargo, Go, Maven/Gradle, Composer, Ruby, and .NET projects.
- Reproducible release-routing matrix fixtures for JavaScript monorepos, Codex plugins, Python/PyPI, Chinese release tasks, and negative intent controls.
- Opt-in structured test reporters for the frozen real-repository release task and the cross-ecosystem matrix.

### Changed

- Release routes reserve capacity for implementation, regression tests, package manifests, plugin metadata, release records, MCP, CLI, shared contracts, and CI surfaces.
- Explicit route limits are treated as maxima instead of targets; unused capacity no longer pulls unrelated files into a release route.
- Package-manifest selection is ecosystem-aware, and release test slots require release-related path evidence.
- Release-route confidence remains conservatively capped and is evaluated against observed changed-file coverage.

### Fixed

- Prevented actual npm, Git tag, and plugin publication work from falling through to `unknown`.
- Prevented explanation, review, test-only, and publication-failure tasks from being misclassified as releases.
- Recognized `pyproject.toml` and other non-JavaScript package manifests as release surfaces.
- Preserved the caller's explicit route limit for plugin distribution tasks.

### Research

- The frozen Vertex Palace release task improved from 3/19 changed-file coverage and 0.25 route focus to 12/19 coverage and 1.00 focus, with calibration error reduced from 0.52 to 0.02.
- The preregistered cross-ecosystem matrix passed without lowering thresholds; all scored final routes reached 1.00 focus.
- These routing results do not claim lower total agent tokens or faster wall-clock time.

## 0.2.2 - 2026-07-19

### Fixed

- Preserve relevant, scoped memory when Adaptive mode selects `full-palace` instead of silently disabling the memory section.
- Render Full Palace memory and its current-code-first guardrail in both Markdown and JSON while keeping the final serialized payload inside the selected budget.

### Added

- Regression coverage using the exact Aurora useful-memory task from the public 16-trial Adaptive v2.2 benchmark.
- Memory-fidelity assertions for mode selection, delivered Markdown, delivered JSON, item counts, guardrails, and measured payload bytes.

### Research

- The public [Adaptive v2.2 benchmark](https://github.com/lohchanhin/benchmarks-ab-demo/blob/main/docs/research/ADAPTIVE_V2_2_FINAL.md) found the v0.2.1 omission in all four useful-memory trials. The frozen results remain unchanged; this release fixes the product behavior separately.

## 0.2.1 - 2026-07-19

### Fixed

- Treat preservation-only wording such as "keep the public API stable" as a guardrail instead of evidence that the task changes a public contract.
- Allow small, focused repositories with route confidence from 0.45 upward to use Route Lite instead of escalating mechanically to Full Palace.
- Refresh the Codex marketplace metadata, plugin MCP pin, CLI version, and MCP server version together.

## 0.2.0 - 2026-07-19

### Added

- Adaptive `palace context --auto` mode selection across `bypass`, `route-lite`, `full-palace`, and `guarded-memory-palace`.
- Primary, Support, and Deferred route tiers with per-step confidence and evidence.
- Measured payload metrics for actual context bytes, estimated tokens, route tiers, memory items, and guardrails.
- One canonical context serializer shared by Core, CLI, and MCP, so payload metrics describe the final delivered Markdown or formatted JSON body without a duplicate MCP wrapper.
- Guarded memory retrieval with relevance, scope, age, confidence, risk, contradiction checks, and a 600-token ceiling.
- CLI `--mode` override and equivalent `auto` / `mode` inputs on the `palace_context` MCP tool for repeatable evaluation.

### Changed

- Adaptive route-lite packs load file summaries instead of accidentally expanding file-level snippets into full files.
- Memory is disabled in Adaptive modes unless task risk explicitly selects guarded memory.
- Documentation and plugin guidance now describe efficiency as a measured outcome, not a guaranteed consequence of fewer routed paths.

### Fixed

- Prevented file nodes without line ranges from injecting entire source files into Adaptive route-lite contexts.
- Prevented unrelated recent pitfall entries from being used as fallback memory in guarded packs.

## 0.1.6 - 2026-07-19

### Added

- `palace context` / `palace task` as the single task-entry command that initializes, refreshes, routes, and packs context when needed.
- `palace_context` MCP tool with route and drawer limits for compact agent context.
- End-to-end tests for one-call context setup on a previously uninitialized repository.

### Changed

- Codex plugin, hook, generated guidance, and README now prefer one context call instead of separate status, init, index, route, and pack calls.
- Context packs produced through the task entry point omit excluded-area narration by default.
- MCP smoke coverage now requires the new one-call tool.

### Fixed

- Reduced repeated agent tool calls and retry opportunities exposed by the A/B benchmark.
- Prevented routine task startup from spending context on redundant Palace lifecycle output.

## 0.1.5 - 2026-07-18

### Added

- `palace evaluate` / `palace eval` command for context-efficiency and route-quality measurement.
- `palace_evaluate` MCP tool.
- Persisted Markdown and JSON evaluation reports under `.palace/evaluations/`.
- Changed-file coverage, route focus, and route-confidence calibration.
- Build Week development and judging documentation.
- Windows, macOS, and Linux CI matrix.
- MCP stdio smoke test using Content-Length framed JSON-RPC messages.

### Changed

- Evaluation tasks now route toward the dedicated evaluation subsystem.
- Scanner and router avoid nested repositories, stale rooms, duplicate source entries, and unrelated fixtures more aggressively.

## 0.1.4

- Published the CLI and MCP server through the `vertex-palace` npm package.
- Added the unique `vertex-palace-mcp-stdio` executable to avoid stale local shim collisions.
