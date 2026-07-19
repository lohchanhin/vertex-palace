# Vertex Palace Build Week Demo Deck

The presentation in
[`outputs/vertex-palace-build-week-demo.pptx`](../../outputs/vertex-palace-build-week-demo.pptx)
is the first production stage for the public OpenAI Build Week demo video.

## Communication Goal

The deck is designed to show judges that Vertex Palace is a working,
installable context-routing and project-memory layer for Codex. Its strongest
supported value is auditable focus and safer project history, not a universal
claim that every task uses fewer end-to-end tokens or finishes faster.

## Creator Motivation

Vertex Palace began with a recurring problem in the creator's own large
projects: a single issue could take more than an hour, while token usage grew
sharply as the agent repeatedly rediscovered repository structure and earlier
decisions. The deck presents this as the personal reason for building the tool,
not as a universal benchmark result.

The design inspiration came from the human memory-palace technique: organize
knowledge by place, follow a route to retrieve it, and surface relevant prior
mistakes before acting. Vertex Palace translates that idea into floors, rooms,
routes, context packs, and an entrance Pitfall Board for code repositories.

## Eight-Slide Arc

1. Introduce Vertex Palace and the Developer Tools submission.
2. Ground the project in the creator's experience of hour-long tasks, excessive
   token use, repeated reading, and forgotten decisions in growing repositories.
3. Show how the human memory palace inspired the repository-to-index-to-
   adaptive-context-to-task route.
4. Demonstrate a real `palace context --auto` result.
5. Show how `palace evaluate` measures context reduction, changed-file
   coverage, route focus, and confidence calibration.
6. Present the preregistered 64-arm exploratory benchmark without overstating
   its findings.
7. Connect benchmark failures to the 0.2.2 memory-fidelity fix and the 0.2.3
   release-routing work completed with Codex and GPT-5.6.
8. Give judges the public npm installation and GitHub test path.

## Recording Guidance

Slide 4 contains a static rendering of verified local CLI output. In the final
video, transition from that slide into a 35-to-45-second screen recording of
the same command, then return to the deck. Keep the complete video below three
minutes and explicitly explain what was built and how Codex and GPT-5.6 were
used.

## Verified Evidence Used

- Live 0.2.3 context result: `guarded-memory-palace`, route confidence `0.81`,
  1,165 estimated payload tokens, three memory items, and one guardrail.
- Live route evaluation: 87,622 indexed estimated tokens, 8,900 context-pack
  tokens, 89.8% reduction, 100% declared changed-file coverage, and 30% route
  focus.
- Adaptive v2.2 exploratory study: 16 trials and 64/64 valid, successful,
  correctly scoped arms.
- Adaptive versus Full median: -16,522.5 reported tokens and -6.553 seconds.
- Adaptive versus Control median: +30,147 reported tokens and +10.919 seconds.

Context-pack reduction is intentionally kept separate from total Codex
session-token usage. The benchmark ran Vertex Palace 0.2.1 and does not prove
universal efficiency gains for later releases.

## Sources

- [`BUILD_WEEK.md`](../../BUILD_WEEK.md)
- [`docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md`](../research/ADAPTIVE_MEMORY_FIX_0_2_2.md)
- [`docs/research/RELEASE_ROUTING_MATRIX_RESULT_0_2_3.md`](../research/RELEASE_ROUTING_MATRIX_RESULT_0_2_3.md)
- [Public benchmark final report](https://github.com/lohchanhin/benchmarks-ab-demo/blob/main/docs/research/ADAPTIVE_V2_2_FINAL.md)

## Quality Checks

- All eight exported slides were rendered from the final PPTX and inspected at
  full size.
- The PowerPoint overflow test passed with no out-of-slide content.
- No unresolved placeholders or layout-warning text remains.
- The deck contains editable PowerPoint charts and speaker notes.
