# Vertex Palace

Memory-palace context routing for Codex.

Vertex Palace turns a repository into a local palace of floors, rooms, cabinets, and drawers. Its Adaptive mode selects the smallest safe context strategy for each task instead of assuming that a full palace pack is always useful.

OpenAI Build Week work is documented separately in [BUILD_WEEK.md](./BUILD_WEEK.md), including the pre-existing baseline, submission-period additions, Codex/GPT-5.6 collaboration, and judge verification steps.

**Release status:** npm `latest` is currently `0.2.3`. Version `0.3.0` is a source release candidate and has not been published or tagged. Do not install the `v0.2.4` plugin tag: its npm pin was never published. The public commands below remain pinned to `0.2.3` until the 0.3 research gates and user-approved npm browser/device verification are complete.

**发布状态：** npm 的 `latest` 目前仍是 `0.2.3`。`0.3.0` 只是源码候选版，尚未发布 npm，也尚未建立 Git tag。不要安装 `v0.2.4` 插件标签，因为它指向的 npm 版本并未发布。以下公开安装命令会继续固定在 `0.2.3`，直到 0.3 研究门禁完成并由使用者通过浏览器或设备验证确认发布。

Name note: `记忆宫殿工具`, `记忆宫殿`, `memory palace`, `palace tool`, and the old name `Context Palace` all refer to Vertex Palace. The preferred MCP entry is `palace_context`; the preferred CLI entry is `palace context`. Lower-level `palace_status`, `palace_index`, `palace_route`, and `palace_pack` remain available for diagnosis and manual control.

## English Overview

Vertex Palace is a local context-routing tool for Codex coding tasks. It organizes a repository into a memory-palace structure of floors, rooms, cabinets, and drawers, so Codex can find the most relevant files and code snippets before fixing bugs, adding features, or understanding modules.

It is designed for large repositories, multi-client projects, and long-lived codebases. Run `palace context "<task>" --auto` once to initialize or refresh the local index, plan the route, select a context mode, and report the delivered payload. Write task memory after the work is done. By default, everything stays inside the local `.palace/` directory: no source upload, no external API calls, and no remote vector database.

Each route refreshes `.palace/routes/latest-route.json`, `.palace/routes/latest-route.md`, and `.palace/routes/optimized-route.txt`, so the most recent task route does not get stuck on an older task. Each memory write also updates `.palace/memory/latest-task.md`, `.palace/memory/task-log.md`, and `.palace/memory/index.json` while keeping the floor-based archive under `.palace/07-memory/`.

The first floor also has an entrance pitfall board at `.palace/00-entrance/pitfall-board.md`. When a task records `--pitfall` or `--failed-attempt`, Vertex Palace updates this notice board. Adaptive mode loads memory only for tasks with relevant history, stale-behavior, or tenant-isolation risk, and limits it by scope, age, confidence, and token budget.

## Design Philosophy

- Spatial understanding: turn a repository from a flat file list into a navigable palace that Codex can explore by feature area, dependency, and task intent.
- Correctness before compression: bypass Palace when direct inspection is safer, and widen context when cross-stack or contract risk is detected.
- Route before reading: plan the most relevant path first, then load primary context while keeping support and deferred references available on demand.
- Explainable selection: every route includes reasons for choosing a floor, room, drawer, or file, so developers can judge whether Codex is looking in the right place.
- Measured payloads: report actual output bytes, estimated context tokens, route tiers, memory items, and guardrails instead of treating fewer file paths as proof of efficiency.
- Local-first privacy: indexes, route packs, and task memory are generated locally by default.
- Project memory over time: successful routes, failed routes, client labels, and decisions can be reused by future tasks.

## Adaptive Palace

`palace context --auto` chooses one of four explainable modes:

| Mode | Selected when | Context behavior |
| --- | --- | --- |
| `bypass` | One high-confidence Primary file, no relevant memory, and no cross-stack, contract, tenant, or broad-scope risk | Returns only mode, Primary candidate, and reason; no source content is packed |
| `route-lite` | The task and route are focused with low cross-cutting risk | Loads Primary summaries or symbol snippets; keeps the rest as references |
| `full-palace` | The task crosses layers, changes a public contract, or has uncertain routing | Loads Primary plus bounded Support context and relevant scoped memory when available |
| `guarded-memory-palace` | Prior decisions, stale behavior, or tenant isolation are explicitly relevant | Prioritizes scoped, recent, budgeted memory with contradiction warnings |

Adaptive mode reports `contextBytes`, `contextEstimatedTokens`, route-tier counts, memory usage, and guardrails in Markdown and JSON. It is designed to reduce unnecessary preloaded context. It does **not** guarantee lower total agent tokens or faster wall-clock time on every task; those outcomes must be measured end to end with repeated, order-balanced trials.

For non-bypass modes, the 0.3.0 candidate treats `maxContextTokens` as a delivery contract: it measures the complete serialized Markdown or JSON, including memory telemetry and execution boundaries, then summarizes or defers lower-priority source drawers until the output fits. A clean-install fixture with 50 relevant memory candidates delivered 4,050 / 5,000 estimated tokens as JSON and 4,473 / 5,000 as Markdown, with exact byte telemetry and an exclusion reason for every considered memory. See the bilingual [context-ceiling incident record](./docs/research/ADAPTIVE_CONTEXT_CEILING_0_3_0.md) and [machine-readable package evidence](./docs/research/evidence/release-candidate-0.3.0.json). These are product-contract results, not proof of lower end-to-end Agent tokens.

The 0.3.0 source candidate adds True Adaptive Bypass and explicit execution boundaries. Bypass no longer requires the task to spell out a filename: after routing, a lightweight memory preflight must confirm zero relevant current memory, and the route must identify one high-confidence Primary file without cross-stack, contract, tenant, or broad-scope risk. Its delivered body contains only `mode`, `primaryCandidate`, and `reason`. Non-bypass output includes Primary, Support, Deferred, Excluded, Required Evidence, Do Not, Stop Condition, Conflict Summary, and an estimated context ceiling so the agent knows when to stop exploring.

The same candidate adds structured Python class, method, async-function, import, and symbol-range indexing; searchable implementation terms; and symbol-level test-to-source relationships. Explicit requests to add or update tests now set `verificationChangeRisk` and cannot collapse into single-file bypass. The pinned [Zod and Requests validation](./docs/research/REAL_REPOSITORY_VALIDATION_0_3_0.md) produced exact implementation-plus-test routes in two deterministic repetitions per repository, with target recall and strict target precision both at 1.000. It is a packaging and routing gate, not an end-to-end Agent performance claim.

Evidence-maintenance routing now recognizes source, test, plan/config, protocol, root README, and localized documentation as separate delivery surfaces. Against a fixed eight-file oracle in `benchmarks-demo`, the same task progressed from 3/8 changed-file coverage and 0.30 focus to 8/8 and 1.00 focus, with confidence capped at 0.35. The [bilingual research record](./docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md) preserves every intermediate result and the remaining negative self-evaluation: this product change still does not prove lower Agent tokens or wall time.

A follow-up now separates references to release-candidate evidence from actual npm publication actions and guarantees a direct test/spec companion when a bounded bugfix explicitly requests regression work. The real benchmark synchronization selected all 8/8 changed files plus CI (focus 0.89), but the product's own eight-file self-evaluation selected only 5/8 and still missed a classifier sibling and the generated MCP bundle. The same [research record](./docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md) and [follow-up machine evidence](./docs/research/evidence/release-artifact-routing-0.3.0.json) keep those positive and negative results together.

Version 0.2.4 makes memory filtering auditable. Adaptive JSON now includes `memoryTelemetry` with `memoryCandidates`, `memoryIncluded`, candidate and included IDs, and `memoryExcluded` entries whose reasons are one of `scope_mismatch`, `expired`, `selection_limit_reached`, or `token_budget_exceeded`. Markdown shows the same counts and exclusions under `Memory Selection`, while the existing `memory` array remains compatible.

Version 0.2.2 preserves relevant memory when Adaptive selects `full-palace`. This fixes the omission reproduced in all four useful-memory trials of the public [Adaptive v2.2 benchmark](https://github.com/lohchanhin/benchmarks-ab-demo/blob/main/docs/research/ADAPTIVE_V2_2_FINAL.md); the frozen v0.2.1 research results remain unchanged. The [0.2.2 remediation record](https://github.com/lohchanhin/vertex-palace/blob/main/docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md) documents the root cause and clean-install evidence.

Version 0.2.3 adds a dedicated release-task route across implementation, tests, package manifests, plugin metadata, MCP, CLI, shared contracts, CI, and release records. It recognizes npm, PyPI, Cargo, Go, Maven/Gradle, Composer, Ruby, and .NET manifests while keeping explain, review, test-only, and publish-failure intent separate. The frozen [baseline](./docs/research/RELEASE_ROUTING_BASELINE_0_2_2.md), [real-repository result](./docs/research/RELEASE_ROUTING_RESULT_0_2_3.md), and [cross-ecosystem matrix](./docs/research/RELEASE_ROUTING_MATRIX_RESULT_0_2_3.md) preserve both failed intermediate results and final evidence. This routing study does not claim lower total agent tokens or faster wall-clock time.

## Usage Guide

### Lazy Mode: Ask Your AI Agent

If you just want the agent to handle it, give your AI coding agent this prompt:

```text
Open and read https://github.com/lohchanhin/vertex-palace, install Vertex Palace, then use it in this repository.

Before working, call palace_context once with my exact task and auto=true (or run palace context --auto if only the CLI is available). Follow the selected mode, expand only when evidence requires it, evaluate the route against the files actually changed, and write task memory after finishing.
```

The agent should read the repository instructions, install the plugin or use the CLI, then follow this workflow:

```text
adaptive context (one call) -> inspect Primary -> expand Deferred only when needed -> implement -> test -> evaluate -> memory write
```

`full-palace` and `guarded-memory-palace` can include relevant entries from `.palace/00-entrance/pitfall-board.md`; guarded mode is selected when memory risk is explicit and adds stricter contradiction warnings. Unrelated or old memory is omitted.

### Manual Mode: Step By Step

1. Install the plugin:

```bash
codex plugin marketplace add lohchanhin/vertex-palace --ref v0.2.3
```

`v0.2.3` is the latest fully published plugin/CLI pair. The 0.3.0 source candidate contains True Bypass and execution boundaries but is not installable from npm yet. Avoid `v0.1.0`, `v0.1.1`, and the incomplete `v0.2.4` plugin tag.

2. Or install the CLI directly from npm:

```bash
npm install -g vertex-palace@0.2.3
palace status
```

For one-off use without a global install:

```bash
npx -y -p vertex-palace@0.2.3 palace status
```

3. Open Codex and install Vertex Palace from `/plugins`.

4. Prepare task context in one call:

```bash
palace context "fix login refresh token bug" --auto --budget 6000 --route-limit 8 --max-drawers 4 --out .palace/last-pack.md
```

5. Use the lower-level commands only when diagnosing or manually controlling the route:

```bash
palace route "fix login refresh token bug" --limit 8 --compact
palace pack "fix login refresh token bug" --budget 6000 --route-limit 8 --max-drawers 4 --compact --out .palace/last-pack.md
```

6. Read the latest task route:

```bash
cat .palace/routes/optimized-route.txt
cat .palace/routes/latest-route.md
```

7. After the task, write memory:

```bash
palace memory write \
  --task "fix login refresh token bug" \
  --outcome success \
  --changed-file src/auth/token.service.ts \
  --test "pnpm test|passed|auth tests passed" \
  --decision "Kept refresh token validation in the auth service." \
  --pitfall "Do not trust stale optimized-route.txt before checking latest-route.md." \
  --tag auth \
  --tag token \
  --notes "Route was accurate; auth controller and token service were the key files."
```

8. Check the readable memory ledger:

```bash
cat .palace/memory/latest-task.md
cat .palace/memory/task-log.md
```

### Troubleshooting: Agent Does Not Recognize The Tool

If a Codex thread says it does not know the "memory palace tool" or `记忆宫殿工具`, it usually means the Vertex Palace plugin or MCP server is not loaded in that thread. The Chinese name is an alias; the preferred MCP tool is `palace_context`.

Fix it by installing Vertex Palace from `/plugins`, trusting the plugin when prompted, and starting a new Codex thread or restarting Codex so the skill, hooks, and MCP tools reload. If only the CLI is available, ask the agent to run `palace context "<task>" --auto`.

## 简体中文说明

Vertex Palace 是一个面向 Codex 编程任务的本地上下文路由工具。它会把代码仓库整理成“楼层、房间、柜子、抽屉”的空间结构，让 Codex 在开始修 bug、加功能或理解模块前，先找到最相关的文件与代码片段，而不是每次都从整个仓库重新扫描。

它适合大型项目、多客户项目和长期维护型项目：每次任务只要运行一次 `palace context "<任务>" --auto`，工具会自动初始化或刷新索引、规划路线、选择最小安全模式，并报告实际送出的上下文负载。任务结束后再写入成功路径、失败路径和决策记忆。所有数据默认保存在本机 `.palace/` 目录中，不上传源码，也不依赖远程向量数据库。

每次路由都会刷新 `.palace/routes/latest-route.json`、`.palace/routes/latest-route.md` 和 `.palace/routes/optimized-route.txt`，避免“最近任务路线”停留在旧任务。每次写入记忆也会更新 `.palace/memory/latest-task.md`、`.palace/memory/task-log.md` 和 `.palace/memory/index.json`，同时保留 `.palace/07-memory/` 的楼层归档。

第一层入口还会有一个踩坑告示牌：`.palace/00-entrance/pitfall-board.md`。当任务写入 `--pitfall` 或 `--failed-attempt` 时，Vertex Palace 会更新这个告示牌。Adaptive 模式只有在任务确实涉及历史决策、旧行为或客户隔离风险时才读取记忆，并按作用域、时间、置信度和 Token 预算筛选。

名称说明：`记忆宫殿工具`、`记忆宫殿`、`memory palace`、`palace tool` 和旧名字 `Context Palace` 都是 Vertex Palace。建议优先使用 MCP 工具 `palace_context`，命令行对应 `palace context`；status、index、route、pack 等底层命令继续保留给排障和手动控制。

## 设计理念

- 空间化理解：把仓库从“文件列表”变成可导航的宫殿结构，让 Codex 可以按功能区域、依赖关系和任务目标定位上下文。
- 正确性优先：明确单文件任务可以绕过 Palace，跨层或契约风险则主动扩大上下文。
- 先路由，再阅读：先规划最可能相关的路径，只加载 Primary 内容，把 Support 与 Deferred 保留为按需引用。
- 可解释的选择：路由结果会说明为什么选择某个房间、抽屉或文件，方便开发者判断 Codex 是否走在正确方向上。
- 实际量测：输出真实字节数、估算 Context Token、路线层级、记忆数量和护栏数量，不再用“路径较少”直接等同“效率较高”。
- 本地优先与隐私优先：索引、记忆和上下文包默认都在本地生成，避免把项目源码交给外部服务处理。
- 持续学习项目习惯：任务完成后记录成功路线、失败路线、客户标签和决策原因，让后续任务可以复用项目经验。

## 自适应模式

`palace context --auto` 会选择四种模式之一：

| 模式 | 适用情境 | 上下文行为 |
| --- | --- | --- |
| `bypass` | 路线高信心只指向一个 Primary 文件，而且没有相关记忆、跨层、契约、客户或广范围风险 | 只返回模式、Primary 候选与原因，不预载源码 |
| `route-lite` | 任务集中、路线明确、跨层风险低 | 只加载 Primary 摘要或符号片段，其余保留引用 |
| `full-palace` | 跨前后端、公共契约变更或路线不确定 | 加载 Primary、有限的 Support，以及可用时与任务相关的范围化记忆 |
| `guarded-memory-palace` | 历史决策、旧行为或客户隔离明确相关 | 优先加入有作用域、有时效、有预算并带矛盾检查的记忆 |

Adaptive Palace 的目标是减少不必要的“预载上下文”，不是承诺每个任务的总 Token 与总时间都一定下降。端到端效果必须用相同任务、重复执行、平衡顺序的 A/B 测试判断。

对于非 bypass 模式，0.3.0 候选版把 `maxContextTokens` 当成实际交付契约：完整序列化 Markdown 或 JSON 后再测量，其中包括记忆筛选 telemetry 与执行边界；若超出上限，就先把低优先级源码降为摘要，再延后到 Deferred。干净安装测试使用 50 条相关记忆候选，JSON 实际交付 4,050 / 5,000 estimated tokens，Markdown 为 4,473 / 5,000；报告字节与真实输出完全一致，50 条被考虑的记忆都有纳入或排除原因。详见双语的 [context ceiling 事故与修复记录](./docs/research/ADAPTIVE_CONTEXT_CEILING_0_3_0.md)和[机器可读安装包证据](./docs/research/evidence/release-candidate-0.3.0.json)。这属于产品契约验证，不代表端到端 Agent 已经更省 Token。

0.3.0 源码候选版新增真正的 Adaptive Bypass 与明确执行边界。任务不必先写出文件名：路由必须高信心只找到一个 Primary 文件，轻量记忆预检必须确认没有相关且仍有效的历史记录，同时不能有跨层、公共契约、客户隔离或广范围风险。Bypass 实际交付内容只有 `mode`、`primaryCandidate` 与 `reason`。其他模式会输出 Primary、Support、Deferred、Excluded、Required Evidence、Do Not、Stop Condition、Conflict Summary 与 Context 上限，告诉 Agent 哪些证据必须看、哪些区域不要碰，以及何时停止继续搜索。

同一候选版的 [Zod 与 Requests 固定仓库验证](./docs/research/REAL_REPOSITORY_VALIDATION_0_3_0.md)各重复两次，均只返回已知实现与对应测试两个文件，目标召回率与严格目标精度都为 `1.000`。这只是一项打包与路由门槛，不代表端到端 Agent 已经更快或更省 Token；宽范围任务的跨表面覆盖仍需继续改进。

证据维护路线现在会把源码、测试、计划/config、协议、根 README 与本地化文档视为不同交付表面。在 `benchmarks-demo` 的固定八文件 oracle 上，同一任务由 3/8 changed-file coverage、0.30 focus 提升到 8/8、1.00 focus，路线置信度仍保守封顶在 0.35。双语的[多表面证据路由研究记录](./docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md)保留全部中间失败和产品自身仍只有 3/6 的负面结果；这项修正仍不等于 Agent 总 Token 或总时间已经下降。

后续修正已经把“引用发布候选证据”与“真的执行 npm 发布”分开；当小预算 bugfix 明确要求回归测试时，也必须保留真正的 test/spec 文件，不能只用 release smoke 脚本代替。真实 benchmark 同步任务命中 8/8 改动文件并额外带上 CI，focus 为 0.89；但产品自身八文件自评仍只有 5/8，分类兄弟模块和生成的 MCP bundle 仍会遗漏。正反结果都保留在同一份[研究记录](./docs/research/MULTI_SURFACE_EVIDENCE_ROUTING_0_3_0.md)与[后续机器证据](./docs/research/evidence/release-artifact-routing-0.3.0.json)中。

0.2.4 让记忆筛选过程可以审计。Adaptive JSON 会输出 `memoryTelemetry`，包括检索候选数量、纳入数量、候选与纳入 ID，以及每条被排除记忆的机器可读原因：`scope_mismatch`、`expired`、`selection_limit_reached` 或 `token_budget_exceeded`。Markdown 的 `Memory Selection` 会显示相同结果，既有 `memory` 数组仍保持兼容。

0.2.2 修复了 Adaptive 选择 `full-palace` 时遗漏相关记忆的问题。这个缺陷由公开的 [Adaptive v2.2 基准研究](https://github.com/lohchanhin/benchmarks-ab-demo/blob/main/docs/research/ADAPTIVE_V2_2_FINAL.md)在四组 useful-memory trial 中稳定复现；冻结的 v0.2.1 研究结果不会被改写。[0.2.2 修复记录](https://github.com/lohchanhin/vertex-palace/blob/main/docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md)公开根因与 clean-install 证据。

0.2.3 新增专门的发布任务路线，会同时覆盖实现、回归测试、package manifest、plugin metadata、MCP、CLI、shared contract、CI 和发布记录。它支持 npm、PyPI、Cargo、Go、Maven/Gradle、Composer、Ruby 与 .NET manifest，并把说明、审核、仅测试和发布失败任务与真正发布动作分开。冻结的[基线](./docs/research/RELEASE_ROUTING_BASELINE_0_2_2.md)、[真实仓库结果](./docs/research/RELEASE_ROUTING_RESULT_0_2_3.md)和[跨生态矩阵](./docs/research/RELEASE_ROUTING_MATRIX_RESULT_0_2_3.md)都保留失败中间结果与最终证据；这项路由研究不宣称总 Token 或总时间一定下降。

## 使用说明

### 懒人用法：直接叫 AI Agent 去读、下载、使用

把这段话丢给你的 AI coding agent：

```text
请打开并阅读 https://github.com/lohchanhin/vertex-palace，安装 Vertex Palace，然后在当前项目使用它。

开始任务前，请针对我的完整任务调用一次 palace_context，并设置 auto=true；如果当前只有命令行，就运行 palace context --auto。按照工具选择的模式行动，只有代码或测试证据需要时才展开 Deferred；完成后评估路线，并把改动文件、测试结果、决策和踩坑写入 memory。
```

它应该照这个流程做：

```text
adaptive context（单次调用）-> 先读 Primary -> 证据需要时再展开 Deferred -> 执行任务 -> 测试 -> evaluate -> 写入 memory
```

`full-palace` 与 `guarded-memory-palace` 都可以带入 `.palace/00-entrance/pitfall-board.md` 中与当前任务相关且仍在时效内的记录；当任务明确涉及记忆风险时会选择 guarded 模式，并加入更严格的矛盾检查。

### 勤劳用法：自己一步一步跑

1. 安装插件：

```bash
codex plugin marketplace add lohchanhin/vertex-palace --ref v0.2.3
```

`v0.2.3` 是目前最后一个 npm 与插件都完整发布的版本。0.3.0 源码候选版已经包含 True Bypass 与停止边界，但目前还不能从 npm 安装。不要使用 `v0.1.0`、`v0.1.1`，也不要使用 npm pin 未发布的 `v0.2.4` 插件标签。

2. 打开 Codex，输入 `/plugins`，安装 Vertex Palace。

3. 每次任务前用一个命令准备上下文：

```bash
palace context "fix login refresh token bug" --auto --budget 6000 --route-limit 8 --max-drawers 4 --out .palace/last-pack.md
```

4. 只有排障或需要手动控制时，才分别执行底层命令：

```bash
palace route "fix login refresh token bug" --limit 8 --compact
palace pack "fix login refresh token bug" --budget 6000 --route-limit 8 --max-drawers 4 --compact --out .palace/last-pack.md
```

5. 查看最新路线：

```bash
cat .palace/routes/optimized-route.txt
cat .palace/routes/latest-route.md
```

6. 任务完成后写入记忆：

```bash
palace memory write \
  --task "fix login refresh token bug" \
  --outcome success \
  --changed-file src/auth/token.service.ts \
  --test "pnpm test|passed|auth tests passed" \
  --decision "refresh token validation 保留在 auth service。" \
  --pitfall "不要在确认 latest-route.md 前盲目信任旧的 optimized-route.txt。" \
  --tag auth \
  --tag token \
  --notes "路线准确，auth controller 和 token service 是关键文件。"
```

7. 查看长期记忆：

```bash
cat .palace/memory/latest-task.md
cat .palace/memory/task-log.md
```

### 排障：AI Agent 说不认识“记忆宫殿工具”

如果某个 Codex 线程说不认识“记忆宫殿工具”，通常不是项目坏了，而是那个线程还没有加载 Vertex Palace 插件或 MCP server。中文叫法只是别名，建议它查找并调用 `palace_context`。

处理方式：先在 Codex 的 `/plugins` 安装并启用 Vertex Palace，按提示信任插件，然后新开一个 Codex 线程或重启 Codex，让 skill、hooks 和 MCP 工具重新加载。如果当前环境只有命令行可用，就让 agent 运行 `palace context "<任务>" --auto`。

## Install

Install the CLI from npm:

```bash
npm install -g vertex-palace
palace status
```

Run it without a global install:

```bash
npx vertex-palace status
```

Install the Codex plugin:

```bash
codex plugin marketplace add lohchanhin/vertex-palace --ref v0.2.3
```

Use `v0.2.3` until the 0.3.0 source candidate is published to npm and tagged. Do not use the incomplete `v0.2.4` plugin tag.

The plugin launches its MCP server through npm:

```bash
npx -y -p vertex-palace@0.2.3 vertex-palace-mcp-stdio --stdio
```

Open Codex:

```text
/plugins
```

Install Vertex Palace.

## First Use

```text
Use Vertex Palace to index this repository.
```

This creates:

```text
.palace/
  palace.yml
  indexes/
  rooms/
  routes/
  07-memory/
```

## Normal Use

```text
Use Vertex Palace before fixing this bug: fix login refresh token bug
```

Codex should call `palace_context` once with `auto: true`, follow the selected mode, inspect Primary context first, and write memory after the task.

## CLI

```bash
palace init
palace status
palace index
palace context "fix login refresh token bug" --auto --budget 6000
palace route "fix login refresh token bug"
palace pack "fix login refresh token bug" --budget 12000
palace evaluate "fix login refresh token bug" \
  --changed-file src/auth/token.service.ts \
  --changed-file tests/auth.test.ts
palace doctor
```

### Route Evaluation

Vertex Palace 0.1.5 adds `palace evaluate` (alias: `palace eval`). It measures whether the route was actually useful instead of trusting route confidence alone:

- estimated tokens for all indexed repository text versus the generated context pack
- token reduction and repository-to-pack ratio
- changed-file coverage and route focus
- confidence calibration, including explicit overconfidence warnings
- persisted Markdown and JSON reports under `.palace/evaluations/`

Run it after a task and provide the files that were really changed:

```bash
palace evaluate "fix checkout shipping bug" \
  --changed-file frontend/app/checkout/page.tsx \
  --changed-file backend/src/shipping/quote.service.ts
```

Without `--changed-file`, the command still measures context efficiency but marks route quality and confidence calibration as `unverified`.

### Adaptive Context Workflow

For large repositories, let Adaptive Palace choose the first-pass scope and inspect its measured payload:

```bash
palace context "fix checkout shipping bug" --auto --budget 6000 --route-limit 8 --max-drawers 4 --out .palace/last-pack.md
```

For multi-client repositories, isolate task memory with a client label:

```bash
palace memory write \
  --client imishang \
  --task "fix checkout shipping bug" \
  --outcome success \
  --changed-file frontend/app/checkout/page.tsx \
  --test "pnpm test|passed|checkout tests passed" \
  --tag checkout \
  --tag tenant-config \
  --notes "Kept shipping rules configurable."
```

## Privacy

Vertex Palace runs locally by default. It does not upload source code, call external APIs, use embeddings, or create a remote index.

## Supported Platforms

- Node.js 20 or newer
- Windows, macOS, and Linux are covered by the repository CI matrix
- Windows is additionally verified through local CLI, npm package, and MCP stdio smoke tests
- Codex plugin users should start a new task or restart Codex after installing or updating the plugin so its skill and MCP tools reload

## Current Capabilities / 目前能力

- Local memory-palace data model
- Repository scanner with ignore rules
- TypeScript, JavaScript, Python, Markdown, JSON, and fallback parsers
- Indexes for nodes, edges, rooms, symbols, directory tree, hashes, and routes
- Route planner with task classification, confidence, reasons, and excluded areas
- Adaptive selector with `bypass`, `route-lite`, `full-palace`, and `guarded-memory-palace`
- Primary, Support, and Deferred route tiers with measured payload metrics
- Latest route files: `latest-route.json`, `latest-route.md`, and `optimized-route.txt`
- Markdown and JSON context packer
- One-call `palace_context` / `palace context --auto` workflow with automatic initialization, fresh indexing, mode selection, and bounded packing
- Route evaluation reports with Token reduction, changed-file coverage, route focus, and confidence calibration
- Task memory ledger: `latest-task.md`, `task-log.md`, and `index.json`
- Entrance pitfall board: `.palace/00-entrance/pitfall-board.md`
- Guarded memory retrieval with scope, age, confidence, risk, contradiction checks, and a 600-token ceiling
- CLI
- MCP stdio server
- Codex plugin folder, skill, hooks, and marketplace metadata
- Fixture repos and tests
