# Multi-Surface Routing for 0.4 Alpha

## Claim boundary

This stage evaluates route selection against a synthetic, fixed changed-file
oracle. It does not run a complete Codex Agent task and does not establish
lower reported tokens, wall time, or tool calls. The result is evidence about
route coverage and focus only.

Machine evidence:
[advisory-multi-surface-routing-0.4-alpha.json](./evidence/advisory-multi-surface-routing-0.4-alpha.json)

Baseline product source: `72d1ffe3deaa2f2847d669b93e01e87ee6337453`

## Why this stage exists

The preceding advisory-safety implementation changed 18 files. Palace's
post-change self-evaluation matched only the two central implementation files,
for `2/18` changed-file coverage. It missed shared types, focused tests,
bilingual records, release verification scripts, test configuration, and the
rebuilt MCP artifact. That real result is the trigger for this stage, but it is
not directly compared with the smaller synthetic oracle below.

## Fixed task and oracle

The fixture uses one unchanged task asking for coordinated work across mode
selection, context packing, a shared contract, focused tests, bilingual
research documents, release verification scripts, test configuration, and a
generated MCP artifact.

The oracle contains 11 files across those roles. The repository also contains
competing historical documents, unrelated verify and smoke scripts, an
integration-only test config, a generic router test, and the tsup provenance
configuration. The route limit remains 12; the test cannot pass by opening the
whole fixture.

## Result

| Stage | Matched | Route files | Coverage | Focus | Confidence | Main error |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Baseline red test | 9/11 | 12 | 0.82 | 0.75 | not captured | Missed test config and one requested verification script |
| Final | 11/11 | 12 | 1.00 | 0.92 | 0.35 | One historical document remains |

The final route retained both implementation concepts, both focused tests,
both requested verification scripts, the shared contract, the test-runner
configuration, the English and Simplified Chinese document pair, and the
generated MCP bundle. The one route-only file is an older research document.

Confidence remains capped at `0.35` for a broad multi-surface task. Against
this oracle it is underconfident by `0.65`. This stage therefore improves
selection but does not claim confidence calibration is solved.

## Real-repository self-evaluation

The built CLI was then evaluated against the seven files actually changed in
this stage. This is a second oracle, separate from the synthetic fixture.

| Iteration | Matched | Route files | Coverage | Focus | Missed file |
| --- | ---: | ---: | ---: | ---: | --- |
| Role allocation | 6/7 | 12 | 0.86 | 0.50 | Current English report |
| Current bilingual pair | 6/7 | 12 | 0.86 | 0.50 | `publication-intent.ts` |
| Explicit implementation concept | 7/7 | 12 | 1.00 | 0.58 | None |

The final route found every actual implementation, test, document, evidence,
and generated-artifact change. Five route-only files remain, including the old
0.3.0 report and evidence plus three related router modules. Recall reached the
target, while precision remains the next problem.

The final static pack estimate was 3,804 tokens from a repository index of
227,958 estimated text tokens, a 98.3% reduction. This is scanner and pack
accounting only, not measured Agent usage or billing.

## Product changes

- Multi-concept implementation work receives bounded per-concept capacity.
- Direct test companions and requested verification scripts use separate
  quotas, so verify and smoke roles do not displace focused tests.
- Verification scripts are ranked by task-to-path affinity after role
  diversity is applied.
- Test-runner configuration outranks unrelated build configuration when the
  task explicitly requests test configuration.
- Bilingual documentation reserves an English/localized pair and prefers the
  same filename in both locations.
- Surface promotion preserves stronger provenance reasons already discovered
  through `changed_with`, `configures`, or other route relations.
- A release-verification script is treated as a referenced artifact, not as a
  request to publish, unless the task also asks for npm, registry, tag, or
  version actions.

## Verification and remaining work

The focused router suite passed `30/30`. The full workspace passed `109/109`:
105 core, 2 CLI, and 2 MCP tests. Type checking, lint, build, the 10-tool MCP
smoke test, and clean release-candidate validation also passed.

The next gate is to reduce route-only siblings without losing `7/7` recall,
then add cross-repository fixtures and calibrate broad-task confidence against
observed coverage. Static route improvement still must not be reported as
end-to-end Agent acceleration.
