# Held-out Cross-Repository Routing Result (0.4 Alpha)

## Result

**Failed.** Frozen candidate `0b6a0fd92f43a74c983663cd32f937087e3ec923` passed none of the four mechanically selected held-out targets. It must not advance to the Agent end-to-end performance study.

This is the first static routing observation on these repositories and tasks. They are now disclosed development data and cannot be reused as held-out evidence for a tuned successor.

## Frozen Evidence

- Selector protocol and script commit: `2be2dc11673fbdf23112a420048af3a2a27914fb`
- Target manifest commit: `b91dbd14a69f92fa84fa9f4175b1c3c33bd6d342`
- Validation protocol and harness commit: `1fc5caee4b5c60a95246699071c9d5502d8d9e9f`
- Raw evidence commit: `813f09c87cdd7372b24a1c4b530e474bc122b38b`
- Raw evidence: `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha.json`
- Raw evidence SHA-256: `B466582D48A1E2B70ED679BA4ADD7AB5192EF0F3E6A875CB70B7C0C336396606`
- Formal run count: one create-only observation

## Aggregate

| Targets | Passed | Completed trials | Macro coverage | Macro focus | Macro precision | Overconfident trials | Max context | Setup failures |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 4 | 0 | 6/8 | 0.50 | 0.11 | 0.111 | 2 | 2,986 | 0 |

The two incomplete trials are both Click context-instrumentation failures. All eight route evaluations ran and produced the same route per repository; the formal aggregate only counts a trial as completed after both evaluation and context telemetry are processed.

## Target Results

| Repository | Coverage | Focus | Precision | Confidence | Route files | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Fastify | 0.50 | 0.11 | 0.111 | 0.57 | 9 | Failed: exact test missed and route saturated |
| Click | 0.50 | 0.11 | not recorded; post-hoc 0.111 | 0.64 | 9 | Failed: implementation missed; context harness error |
| Cobra | 1.00 | 0.22 | 0.222 | 0.60 | 9 | Failed: complete recall but excessive siblings |
| Marked | 0.00 | 0.00 | 0.000 | 0.34 | 9 | Failed: CLI entry point and focused test both missed; overconfident |

Every repository was fresh immediately after explicit indexing and remained clean in tracked Git state. No failure was caused by repository download, checkout, or indexing setup.

## What The Routes Did

### Fastify

Palace selected `lib/route.js` but missed `test/find-route.test.js`. It filled the route with eight related routing files and generic routing tests. The task used the camelCase identifier `findRoute`, while the focused test path used `find-route`; the current lexical model did not preserve that identity strongly enough.

### Click

Palace selected `tests/test_utils.py` but missed `src/click/_compat.py`, instead favoring broad testing, terminal, and utility modules. The commit subject describes a flaky pager test and Python 3.14t but does not name the compatibility module, making this a difficult but legitimate search problem.

The context instrumentation then raised `TypeError: Cannot read properties of undefined (reading 'primary')` because the harness assumed every context mode returned `executionBoundaries`. This is a harness contract defect, not an environment failure. It does not change the product result: the completed evaluate route already failed coverage and focus gates.

### Cobra

Palace found both `completions.go` and `completions_test.go`, demonstrating useful fallback-language recall. It nevertheless filled all nine route slots with completion-related siblings. Correct recall alone was insufficient because focus and precision were only 0.22.

### Marked

Palace routed toward Markdown parser internals and missed both `bin/main.js` and `test/unit/bin.test.js`. The existing CLI surface heuristic recognizes conventional CLI directories but not a repository `bin` entry point strongly enough. Confidence 0.34 at zero observed coverage was classified as overconfident in both repetitions.

## Main Findings

1. **Seen-target success did not generalize.** The preceding bilingual regression passed 9/9 candidate targets, but the first held-out set passed 0/4.
2. **Route limit still behaves like a quota.** Every held-out route contained exactly nine files. This created severe sibling dilution even when the correct implementation and test were already present.
3. **Focused test pairing is weak across naming conventions.** CamelCase identifiers, hyphenated test paths, and broad utility test suites were not paired reliably.
4. **Repository entry-point conventions are incomplete.** `bin/main.js` was not treated as a strong CLI implementation candidate.
5. **Fallback parsing can recall but not focus.** Cobra reached 2/2 changed files, yet lexical sibling expansion overwhelmed route precision.
6. **Confidence safety still has a held-out failure.** Marked produced zero coverage with confidence 0.34.
7. **The validation contract also needs hardening.** Context telemetry must support bypass and other compact response shapes without assuming `executionBoundaries` exists.

## Interpretation Limits

- Each task uses an unedited Git commit subject, so task observability varies. Click is notably under-specified compared with the implementation diff.
- There are only four repositories, and two use JavaScript. This is a first held-out signal, not a population estimate.
- Static route failure is enough to reject promotion, but it does not directly measure final Agent task performance.
- Timing remains diagnostic only; no Token or speed claim is supported.

## Development Direction

The next candidate should address mechanisms rather than repository names:

1. Split and normalize camelCase, PascalCase, snake_case, and hyphenated identifiers consistently between task text, symbols, and paths.
2. Make route limit a ceiling with a score-drop or evidence-sufficiency stop rule instead of filling every slot.
3. Pair implementation and focused tests using normalized basename concepts and stronger import or co-consumer evidence.
4. Recognize `bin`, executable entry points, and repository-specific command surfaces as CLI implementations.
5. Improve fallback-language structure enough to distinguish a focused file pair from same-keyword siblings.
6. Cap confidence when no direct implementation/test pair or requested entry-point surface is found.
7. Normalize all context response modes in the validation harness before the next formal study.

These four tasks may be used for development regression from now on. A successor requires a newly selected, untouched repository pool and a new preregistered held-out study before any Agent A/B benchmark begins.

