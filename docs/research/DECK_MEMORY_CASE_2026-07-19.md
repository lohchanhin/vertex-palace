# Deck Memory Case: A Prior Lesson Changed the Next Task

Date: 2026-07-19

## Question

Can Vertex Palace demonstrate project continuity without claiming an unproven
Token or wall-time improvement?

## Task

The active task was to revise the OpenAI Build Week presentation so judges
could see the supported value of structured routing, project memory, pitfall
prevention, and auditable context before the benchmark limitations.

The command was:

```powershell
palace context "Edit the Build Week presentation files docs/presentation/BUILD_WEEK_DEMO_DECK.md and outputs/vertex-palace-build-week-demo.pptx so the deck visibly proves structured routing, project memory, pitfall prevention, and auditable context before showing benchmark limits" --auto --format json
```

## Observed Result

Vertex Palace selected `guarded-memory-palace` because the task depended on
prior decisions and pitfalls.

| Field | Observed value |
| --- | --- |
| Mode confidence | 0.88 |
| Route confidence | 0.78 |
| Route ID | `route_5c04653effbb6b8c` |
| Delivered payload | 8,978 bytes / 2,245 estimated tokens |
| Memory items | 3 |
| Guardrails | 2 |

The entrance Pitfall Board also contained this directly relevant lesson from a
prior presentation task:

> Do not present the Adaptive-Control overhead chart by itself: it makes Vertex
> Palace look universally unnecessary. Pair it with the synthetic-task
> boundary, the rejection of always-on use, the selective-mode response, and an
> explicit statement that the response is not yet confirmatory performance
> evidence.

## Decision Changed

That prior lesson changed the starting plan for the next revision:

- Place structured routing, scoped memory, pitfall prevention, and the task
  receipt before the A/B benchmark.
- Add this real deck-revision case as visible evidence of project continuity.
- Keep the benchmark charts, but frame them as the boundary of the acceleration
  claim rather than the verdict on the entire product.
- Preserve the current-code-first guardrail and avoid claiming that memory is
  automatically correct.

## Honest Limitation

This case demonstrates that a recorded lesson changed a later agent's starting
decision. It does not demonstrate lower end-to-end Token use or faster task
completion.

The same run also showed a routing limitation: the primary source result was an
implementation file, while the presentation document appeared only as support
and the binary PowerPoint was not routed. The remembered presentation pitfall
therefore instructed the agent to inspect the known deck paths directly. This
is useful continuity, but it is not perfect source routing.

## After-Task Evaluation

After the presentation, narrative document, and this research record changed,
the original route was evaluated against all three files:

| Field | Result |
| --- | --- |
| Evaluation ID | `evaluation_551e86b873dda6bb` |
| Indexed repository estimate | 91,102 tokens |
| Context pack estimate | 4,787 tokens |
| Context-pack reduction | 94.7% |
| Changed-file coverage | 33% (1 of 3) |
| Route focus | 10% |
| Calibration | overconfident (0.78 predicted vs 0.33 observed) |

The route matched `docs/presentation/BUILD_WEEK_DEMO_DECK.md` and missed both
`docs/research/DECK_MEMORY_CASE_2026-07-19.md` and the binary
`outputs/vertex-palace-build-week-demo.pptx`.

This result does not support a routing-accuracy claim. It supports the narrower
auditability claim: Vertex Palace compared its selected context with the actual
work, exposed the missed files, and rejected its own confidence calibration.

## Why This Matters

The observable product value in this case is not speed. It is a traceable link
between a previous failure mode and a better starting decision in the next
task. That link can be inspected, challenged against current code and tests,
and recorded again after completion.
