# Vertex Palace Build Week Demo Narration

Target: public demo video under three minutes.

Voice: `en-US-AndrewNeural` at `+10%` rate.

## 1. The problem

Codex became too useful for me to stop using. But as my projects grew, a single task could take more than an hour, repeatedly scanning the same repository and consuming an unreasonable amount of context. I built Vertex Palace around one practical question: can an agent receive the right context without reading everything?

## 2. The idea

The inspiration came from turning flat, two-dimensional repository data into a navigable, three-dimensional memory palace. Directory location becomes the X axis, business function the Y axis, and dependencies the Z axis. Domains become floors, functional areas become rooms, and files, symbols, tests, and memories become drawers. For each task, Palace plans a route and delivers a small, explainable context pack.

## 3. How it was built and studied

But a shorter route is only a hypothesis, so I designed a public research process. I used Codex with G P T five point six to build the command-line interface, M C P server, plugin, tests, and benchmark harness. Then I froze protocols before results, preserved failed runs, found mechanisms, changed the product, and tested again.

## 4. Study one

In the first formal study, sixty out of sixty agent arms were correct. Full Palace also rejected stale memory in every stale-memory run. But compared with Control, it used a median sixty-seven thousand two hundred twenty-three more reported tokens, eight point five more tool calls, and about thirty extra seconds. The first conclusion was uncomfortable but useful: Palace was safe, but too heavy.

## 5. Study two

Study two introduced Adaptive Palace, choosing among route-lite, full context, and guarded memory. All sixty-four arms were valid and correct. Adaptive reduced Palace's own output, but it still did not prove a universal end-to-end advantage over pure Codex. More importantly, the study exposed a memory-fidelity bug: required useful memories were missed in four out of four cases. We published that failure too.

## 6. Generation three

That negative result changed the engineering direction. Generation three focuses on causes: true bypass for simple tasks, complete and explainable memory selection, stop conditions that limit unnecessary exploration, and stronger type and task-intent routing. Validation is expanding to real issues, real Git commits, real tests, TypeScript and Python repositories, hidden oracles, and public failure records. Correctness comes first, modification scope second, and token efficiency only after both. The new question is whether Adaptive Palace can beat pure Codex without hiding information or weakening correctness.

## 7. Open source

Vertex Palace is open source, and the benchmark process is public. Visit the product repository for source code, architecture, releases, and installation. Visit the research repository for protocols, raw trials, negative results, and reproducible evidence. Build it. Test it. Publish the evidence.
