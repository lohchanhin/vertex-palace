# Vertex Palace

Memory-palace context routing for Codex.

Vertex Palace turns a repository into a local palace of floors, rooms, cabinets, and drawers. Its Adaptive mode selects the smallest safe context strategy for each task instead of assuming that a full palace pack is always useful.

OpenAI Build Week work is documented separately in [BUILD_WEEK.md](./BUILD_WEEK.md), including the pre-existing baseline, submission-period additions, Codex/GPT-5.6 collaboration, and judge verification steps.


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
| `bypass` | A small repository and one explicit file make routing overhead unnecessary | No source content is packed; direct inspection is recommended |
| `route-lite` | The task and route are focused with low cross-cutting risk | Loads Primary summaries or symbol snippets; keeps the rest as references |
| `full-palace` | The task crosses layers, changes a public contract, or has uncertain routing | Loads Primary plus bounded Support context |
| `guarded-memory-palace` | Prior decisions, stale behavior, or tenant isolation are relevant | Adds only scoped, recent, budgeted memory with contradiction warnings |

Adaptive mode reports `contextBytes`, `contextEstimatedTokens`, route-tier counts, memory usage, and guardrails in Markdown and JSON. It is designed to reduce unnecessary preloaded context. It does **not** guarantee lower total agent tokens or faster wall-clock time on every task; those outcomes must be measured end to end with repeated, order-balanced trials.

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

Only `guarded-memory-palace` includes relevant entries from `.palace/00-entrance/pitfall-board.md`; unrelated or old memory is omitted.

### Manual Mode: Step By Step

1. Install the plugin:

```bash
codex plugin marketplace add lohchanhin/vertex-palace --ref v0.2.0
```

Use `v0.2.0` or newer for Adaptive Palace. Avoid `v0.1.0` and `v0.1.1`; those early tags had broken MCP install metadata.

2. Or install the CLI directly from npm:

```bash
npm install -g vertex-palace
palace status
```

For one-off use without a global install:

```bash
npx vertex-palace status
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
| `bypass` | 小型仓库且任务明确指向单一文件 | 不预载源码，建议直接检查目标文件 |
| `route-lite` | 任务集中、路线明确、跨层风险低 | 只加载 Primary 摘要或符号片段，其余保留引用 |
| `full-palace` | 跨前后端、公共契约变更或路线不确定 | 加载 Primary 与有限的 Support 上下文 |
| `guarded-memory-palace` | 历史决策、旧行为或客户隔离确实相关 | 只加入有作用域、有时效、有预算并带矛盾检查的记忆 |

Adaptive Palace 的目标是减少不必要的“预载上下文”，不是承诺每个任务的总 Token 与总时间都一定下降。端到端效果必须用相同任务、重复执行、平衡顺序的 A/B 测试判断。

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

只有 `guarded-memory-palace` 会带入 `.palace/00-entrance/pitfall-board.md` 中与当前任务相关且仍在时效内的记录。

### 勤劳用法：自己一步一步跑

1. 安装插件：

```bash
codex plugin marketplace add lohchanhin/vertex-palace --ref v0.2.0
```

请使用 `v0.2.0` 或更新版本来启用 Adaptive Palace。不要再使用 `v0.1.0` 和 `v0.1.1`，这两个早期标签的 MCP 安装元数据有问题。

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
codex plugin marketplace add lohchanhin/vertex-palace --ref v0.2.0
```

Use `v0.2.0` or newer for Adaptive Palace; `v0.1.0` and `v0.1.1` are obsolete because their MCP install metadata was broken.

The plugin launches its MCP server through npm:

```bash
npx -y -p vertex-palace@0.2.0 vertex-palace-mcp-stdio --stdio
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
- TypeScript, JavaScript, Markdown, JSON, and fallback parsers
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
