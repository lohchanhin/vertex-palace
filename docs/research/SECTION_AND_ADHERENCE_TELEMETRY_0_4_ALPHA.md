# Section and Agent-Adherence Telemetry (0.4.0-alpha)

Status: post-v3 engineering validation. This is not a published v3 outcome and does not establish end-to-end efficiency.

## Why this exists

Whole-payload bytes could show that a context pack was large, but not which part caused the cost. Trial transcripts could count total tool calls, but not whether the Agent reopened delivered source, crossed a route boundary without evidence, or continued after verification.

## Product telemetry

Adaptive Markdown and JSON payloads now report bytes and estimated tokens for:

- task
- mode explanation
- primary, support, deferred, and excluded context
- memory and guardrails
- required evidence
- do-not rules, stop conditions, and conflict summary

The accounting invariant is exact for UTF-8 bytes:

```text
sum(section bytes) + serializationOverheadBytes = contextBytes
```

`serializationOverheadBytes` includes headings, JSON keys and punctuation, payload telemetry itself, recommended execution text, and other serialized structure not assigned to a semantic section. Estimated tokens remain the local deterministic estimator, not provider billing data.

## Benchmark telemetry

The benchmark transcript parser now records:

- delivered full paths reopened
- deferred paths opened before conflict evidence
- excluded paths opened
- calls before the first edit
- calls after tests passed
- calls after the stop condition was observable
- whether verification was batched
- repeated task restatements

These are ordered-transcript heuristics. They inspect named paths, command classes, exit status, output failure signals, and final Git checks. They are not an operating-system file-access trace and must not be described as actual file-read counts.

## Verification boundary

The regression suite checks exact Markdown and JSON byte accounting and synthetic ordered transcripts for every adherence field. Formal v4 Agent trials remain blocked until the v4 protocol, fixtures, oracle, plan, freeze gate, and blinding design receive human review.
