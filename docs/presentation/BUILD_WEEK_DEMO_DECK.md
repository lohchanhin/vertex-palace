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

The initial design insight was spatial: turn a flat, two-dimensional repository
tree into a three-dimensional building. Architectural layers became floors,
functional domains or modules became rooms, and files and symbols occupied
progressively deeper storage levels. The connection to the human memory-palace
technique came next: tasks could follow routes through that building, while
relevant prior mistakes could wait at the entrance.

## Spatial Coordinate Model

| Axis | Stable meaning | Examples |
| --- | --- | --- |
| X | Functional domain or module | Auth, Checkout, Blog |
| Y | Architectural layer or floor | Interface, Implementation, Data, Verification, Runtime |
| Z | Inspection depth | Room overview, file cabinet, symbol drawer, code snippet |

A task route is a path between these addresses. Memory, evidence, confidence,
and the Pitfall Board are metadata attached to places and routes; they are not
additional spatial axes. For example, `checkout / implementation /
shippingQuote()` identifies one bounded context entry point.

## Twelve-Slide Arc

1. Introduce Vertex Palace and the Developer Tools submission.
2. Ground the project in the creator's experience of hour-long tasks, excessive
   token use, repeated reading, and forgotten decisions in growing repositories.
3. Define the building's coordinate system: X for functional domain, Y for
   architectural floor, and Z for inspection depth, with routes and memory
   layered on top.
4. Demonstrate a real `palace context --auto` result.
5. Show how `palace evaluate` measures context reduction, changed-file
   coverage, route focus, and confidence calibration.
6. Show the frozen four-arm A/B design: Control, Route-only, Full Palace, and
   Adaptive, with 16 paired trials and 64 total arms.
7. Compare Adaptive with no-Palace Control using paired medians and 95%
   bootstrap intervals for tool calls, reported tokens, and wall time.
8. Compare Adaptive with always-on Full Palace using the same visual language
   for Palace-owned bytes, reported tokens, and wall time.
9. Separate correctness from efficiency with the validity, public-test, hidden
   oracle, declared-scope, and forbidden-file gates.
10. Present the independent product evidence: 55 automated tests, build and
    TypeScript lint, ten-tool MCP smoke, five successful CI jobs, and clean
    public-distribution verification.
11. Show the learning loop from the 0.2.1 memory omission to the 0.2.2
    regression contract and the 0.2.3 cross-ecosystem release-routing matrix.
12. Give judges the public npm installation and GitHub test path.

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
  correctly scoped arms; public tests and hidden oracle both passed 64/64.
- Adaptive versus Full median: -16,522.5 reported tokens and -6.553 seconds.
- Adaptive versus Full Palace-owned payload: -898.5 bytes with a paired
  interval of [-1,972, -550.5].
- Adaptive versus Control median: +30,147 reported tokens, +10.919 seconds,
  and +4.5 tool calls; only the tool-call interval stayed entirely above zero.
- Adaptive versus Control paired intervals: tool calls [+2.5, +6.5], reported
  tokens [-1,518.5, +39,219], and wall time [-1.433s, +31.043s].
- Adaptive versus Full paired intervals: reported tokens [-38,931, +24,588]
  and wall time [-13.525s, +0.336s]; both cross zero.
- Product gates: 51 Core tests, 2 CLI tests, 2 MCP tests, build, TypeScript
  lint, and the 10-tool MCP smoke passed.
- GitHub Actions run `29687844288` passed all five jobs across Windows, macOS,
  Linux, Node 20, Node 24, and the npm package dry-run.
- Clean tarball and public-registry installs, CLI, MCP initialization,
  annotated tag, registry hash, marketplace ref, and plugin MCP pin passed.

Context-pack reduction is intentionally kept separate from total Codex
session-token usage. The benchmark ran Vertex Palace 0.2.1 and does not prove
universal efficiency gains for later releases.

## Sources

- [`BUILD_WEEK.md`](../../BUILD_WEEK.md)
- [`docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md`](../research/ADAPTIVE_MEMORY_FIX_0_2_2.md)
- [`docs/research/RELEASE_ROUTING_MATRIX_RESULT_0_2_3.md`](../research/RELEASE_ROUTING_MATRIX_RESULT_0_2_3.md)
- [`docs/research/RELEASE_0_2_3_VERIFICATION.md`](../research/RELEASE_0_2_3_VERIFICATION.md)
- [Public benchmark final report](https://github.com/lohchanhin/benchmarks-ab-demo/blob/main/docs/research/ADAPTIVE_V2_2_FINAL.md)
- [Verified five-job GitHub Actions run](https://github.com/lohchanhin/vertex-palace/actions/runs/29687844288)

## Quality Checks

- All twelve exported slides were rendered from the final PPTX and inspected at
  full size.
- The PowerPoint overflow test passed with no out-of-slide content.
- No unresolved placeholders or layout-warning text remains.
- The deck contains editable PowerPoint charts and speaker notes.
