# Vertex Palace 0.4 Non-Looping Architecture

## Purpose

Version 0.4.0-alpha.2 changes the development objective from repairing one observed repository at a time to enforcing three reusable product contracts: ground the task, expand only for missing evidence, and evaluate distinct truth layers separately. No production rule may name a benchmark repository, issue number, or project path.

## 1. Task Grounding

Every route records `taskGrounding.status`, `taskGrounding.resolutionStatus`, and `decision`.

- `local`: the task contains a local file, a strong code identifier, or vocabulary that matches a product node.
- `resolved`: an otherwise opaque GitHub issue or pull request was grounded from bounded metadata.
- `unresolved`: routing would require guessing, so the decision is `abstain` and the route contains zero source drawers.

At most two GitHub references are resolved. Full URLs and labeled issue/PR references take precedence over bare numbers. Only the GitHub issue API is queried, with a five-second timeout and no retry. Public repositories use anonymous access; private access uses `GH_TOKEN` and then `GITHUB_TOKEN`. Tokens never enter cache, output, or errors. Normalized metadata is capped at 8 KiB and cached for one hour under `.palace/cache/references/`.

`referencePolicy: "off"` disables remote resolution. A forced context mode cannot override abstention.

## 2. Evidence-Gain Expansion

Relation candidates use one preregistered score:

```text
0.45 * taskAffinity
+ 0.30 * relationStrength
+ 0.25 * facetGain
- 0.20 * degreePenalty
- 0.25 * redundancy
```

`taskAffinity` is relative to the highest task score. `degreePenalty` is `min(1, log2(1 + sourceDegree) / 8)`. A candidate must add a missing role, task term, or causal source, or simultaneously have task affinity of at least 0.65 and relation strength of at least 0.75. High-degree candidates cannot enter solely through a relation.

After implementation, focused verification, and every explicitly required role are present, expansion stops when the best remaining gain is below 0.55. Relation expansion adds at most one file for each explicit auxiliary role.

Evidence insufficiency alone no longer escalates to `full-palace`. Without a real cross-stack, tenant, memory-conflict, public-contract, broad-scope, or verification-change risk, the result remains a `route-lite` advisory context capped at 2,400 estimated tokens with `stopEnforced=false`.

## 3. Layered Evaluation

Evaluation separates:

- Core truth: implementation and focused tests.
- Declared auxiliary truth: README, changelog, configuration, or contract files explicitly required by the task or resolved metadata.
- Latent auxiliary truth: files known only from a hidden diff or project convention.

Core and declared auxiliary truth are release gates. Latent auxiliary truth is descriptive and cannot turn an otherwise complete core route into a failure. Confidence calibration uses core coverage. The legacy `changedFiles` input remains supported and maps to core truth when no layered inputs are supplied.

## Research Boundary

Round 21 remains unchanged as a public negative result and regression set. Improvements on its known cases do not qualify 0.4 for stable release. Alpha.2 may move from npm `next` to `latest` only after two fresh preregistered rounds pass without changing targets, oracles, thresholds, or product code after observation.

Agent performance is a separate experiment. Vertex Palace may be released for safer, auditable routing without claiming lower Token use or faster execution. Such a claim requires an order-balanced repeated Agent A/B whose paired 95% bootstrap interval lies completely in the favorable direction.
