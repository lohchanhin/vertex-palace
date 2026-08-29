# Adaptive Context Budget Contract Repair

## Status

Implementation commit: `df181ab2395cf9a4e887f64d44aacc5129d7d2e0`

Classification: disclosed regression repair. This is not a new blind qualification round.

## Problem

V5 exposed a contract failure in adaptive context packing. A caller could request a 6,000-token budget, mode selection could correctly keep a narrower 2,400- or 5,000-token ceiling, and the packer could still exit with an error after removing every source drawer because the fixed metadata envelope alone was too large.

That made a bounded mode behave like a failed command. The mode ceilings were not the problem by themselves; the missing behavior was a bounded structured fallback.

## Repair

The packer now tries three deterministic degradation levels: `compact`, `minimal`, and `emergency`.

The fallback preserves task grounding, primary references, bounded deferred references, required evidence, current memory counts, and execution boundaries. It removes source drawers and compresses diagnostic, excluded, support, and excess memory details before allowing the command to fail.

The result exposes machine-readable degradation telemetry:

- reason and degradation level;
- original estimated size and active token ceiling;
- omitted sections;
- retained primary, deferred, memory, and required-evidence counts.

The selected mode remains bounded. This repair does not raise every mode ceiling.

## Real V5 Regression Smoke

The five original candidate failures were rerun from their frozen repository commits with the same task, `--budget 6000`, `--route-limit 8`, JSON output, and references disabled.

| Target | Before | After | Ceiling | Result |
| --- | ---: | ---: | ---: | --- |
| `click-2273-local-complete` | 3627, exit 1 | 1132, exit 0 | 2400 | compact |
| `click-2622-high-connectivity` | 3077, exit 1 | 843, exit 0 | 2400 | compact |
| `cobra-2356-local-complete` | 2814, exit 1 | 810, exit 0 | 2400 | compact |
| `cobra-1956-high-connectivity` | 2659, exit 1 | 739, exit 0 | 2400 | compact |
| `fd-1852-local-complete` | 2538, exit 1 | 879, exit 0 | 2400 | compact |

All five returned structured route results and retained at least one Primary reference. A separate regression also verifies the 5,000-token guarded ceiling in Markdown and JSON.

## Verification

- Five generic oversized-envelope route shapes in both Markdown and JSON.
- Guarded 5,000-token envelope in both Markdown and JSON.
- `pnpm lint` passed.
- `pnpm test` passed, including 277 core tests, CLI/MCP tests, and the preserved research suite.
- `pnpm build` passed, including the package CLI and plugin MCP bundle.

The same work also fixed an adjacent CLI evaluation bug: absent layered truth options now remain `undefined`, so repeated `--changed-file` values are no longer discarded by empty default core arrays.

## Claim Boundary

This repair removes the operational budget blocker. It does not rewrite the negative V5 result, prove better routing accuracy, prove Token or time savings, or qualify a stable release. The remaining semantic-routing failures, especially the Vitest monorepo targets, still require a general mechanism repair and a fresh preregistered qualification.

Raw evidence: [`evidence/adaptive-context-budget-contract-repair.json`](evidence/adaptive-context-budget-contract-repair.json)
