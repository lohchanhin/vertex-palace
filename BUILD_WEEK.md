# OpenAI Build Week

Vertex Palace is entering the Developer Tools track as a local context-routing and project-memory tool for Codex.

## Eligibility Timeline

Vertex Palace existed before the OpenAI Build Week submission period. The pre-existing baseline is:

- Tag: `v0.1.4`
- Commit: `462bf56ad55e1a9394d72f249c2b905ee01e8f45`
- Baseline capabilities: repository indexing, task routes, context packs, task memory, CLI, MCP, and Codex plugin packaging

Only the work added after the submission period began is presented as Build Week work.

## Submission-Period Work

### Routing and indexing reliability

Commit `ce26cd66f99019a45e97787ffe1bdfe659541454` added stricter nested-repository ignores, stale room cleanup, more diverse route selection, fixture filtering, task-intent improvements, pitfall relevance changes, and regression tests.

### Measurable route evaluation

Version 0.1.5 adds `palace evaluate` and the `palace_evaluate` MCP tool. The evaluator:

- compares estimated tokens for all indexed repository text with the actual context pack
- calculates changed-file coverage and route focus from files supplied after the task
- compares predicted route confidence with observed coverage
- labels confidence as well-calibrated, overconfident, underconfident, or unverified
- saves reproducible Markdown and JSON reports in `.palace/evaluations/`

This feature addresses a concrete limitation found during large-project use: a plausible-looking route and a high confidence value do not prove that the route included the files that ultimately mattered.

### Cross-ecosystem release routing

Version 0.2.3 adds a dedicated release task type after the tool misclassified
its own 0.2.2 publication task as `unknown`. The frozen real-repository baseline
found only 3/19 changed files with 0.25 route focus and 0.52 overconfidence
error. The corrected route reached 12/19 coverage, 1.00 focus, and 0.02
calibration error.

A protocol committed before matrix execution then tested JavaScript monorepo,
Codex plugin, Python/PyPI, and Chinese release scenarios plus publication
failure, explanation, review, test-only, and deployment controls. The final
matrix passed without lowering thresholds, and all scored routes reached 1.00
focus. Rejected intermediate results remain in the repository research record.
This study measures routing quality and does not claim lower total agent tokens
or faster wall-clock time.

## Codex And GPT-5.6 Collaboration

The submission-period work was developed with Codex using GPT-5.6. Codex was used to:

- run Vertex Palace against its own repository before implementation
- inspect the minimal routed context and expand only when the route omitted required CLI, MCP, and shared contracts
- translate real large-project feedback into measurable behavior and regression tests
- identify that the public npm/plugin pin still referenced the pre-submission baseline
- design the evaluation contract, implement the cross-package feature, and verify CLI and MCP behavior

Human product and engineering decisions included:

- keeping evaluation deterministic and local instead of adding a remote model or vector database
- treating changed-file coverage as observed evidence, not as a replacement for tests or runtime verification
- reporting route focus separately because useful dependency files may be routed without being edited
- refusing to publish a new plugin pin until the corresponding npm package exists and passes clean-install tests

The Devpost submission will include the `/feedback` Session ID from the primary Build Week development task.

## Demo Presentation

The English Build Week presentation is available at
[`outputs/vertex-palace-build-week-demo.pptx`](./outputs/vertex-palace-build-week-demo.pptx).
It is structured for an under-three-minute narrated video and includes speaker
notes for the live CLI recording transition. The verified claims, slide arc,
and recording guidance are documented in
[`docs/presentation/BUILD_WEEK_DEMO_DECK.md`](./docs/presentation/BUILD_WEEK_DEMO_DECK.md).

## Judge Quick Test

Install the public competition release, then run it in the repository you want to evaluate:

```bash
npm install -g vertex-palace@0.2.3
palace --version
palace context "improve route confidence calibration" --auto --format json
palace evaluate "improve route confidence calibration" --changed-file packages/core/src/evaluation/evaluate-route.ts
```

The evaluation command prints a report and saves:

```text
.palace/evaluations/latest-evaluation.md
.palace/evaluations/latest-evaluation.json
```

The Codex plugin is pinned to the same npm release, so judges do not need to rebuild the project.

## Verification Gates

- All workspace tests pass.
- TypeScript no-emit checks pass.
- The root CLI bundle builds.
- The bundled MCP server answers framed JSON-RPC `initialize` and `tools/list` requests.
- The npm tarball is installed and exercised from a clean temporary directory before publishing.
- The plugin MCP pin matches the published competition release.
