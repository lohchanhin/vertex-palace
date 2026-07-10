# Vertex Palace

Memory-palace context routing for Codex.

Vertex Palace turns a repository into a local palace of floors, rooms, cabinets, and drawers. Before a coding task, Codex can ask for a route and receive a compact context pack instead of scanning the whole repository.


Name note: `记忆宫殿工具`, `记忆宫殿`, `memory palace`, `palace tool`, and the old name `Context Palace` all refer to Vertex Palace. The registered MCP tool names are `palace_status`, `palace_init`, `palace_index`, `palace_route`, `palace_pack`, and `palace_write_memory`; the CLI command is `palace`.

## English Overview

Vertex Palace is a local context-routing tool for Codex coding tasks. It organizes a repository into a memory-palace structure of floors, rooms, cabinets, and drawers, so Codex can find the most relevant files and code snippets before fixing bugs, adding features, or understanding modules.

It is designed for large repositories, multi-client projects, and long-lived codebases. You can run `palace index` to build a local index, use `palace route` to find the task path, generate a compact context pack with `palace pack`, and write task memory after the work is done. By default, everything stays inside the local `.palace/` directory: no source upload, no external API calls, and no remote vector database.

Each route refreshes `.palace/routes/latest-route.json`, `.palace/routes/latest-route.md`, and `.palace/routes/optimized-route.txt`, so the most recent task route does not get stuck on an older task. Each memory write also updates `.palace/memory/latest-task.md`, `.palace/memory/task-log.md`, and `.palace/memory/index.json` while keeping the floor-based archive under `.palace/07-memory/`.

The first floor also has an entrance pitfall board at `.palace/00-entrance/pitfall-board.md`. When a task records `--pitfall` or `--failed-attempt`, Vertex Palace updates this notice board and includes it near the top of future context packs, so Codex sees previous mistakes before reading route drawers.

## Design Philosophy

- Spatial understanding: turn a repository from a flat file list into a navigable palace that Codex can explore by feature area, dependency, and task intent.
- Route before reading: plan the most relevant path first, then generate a bounded context pack instead of spending tokens on unrelated files.
- Explainable selection: every route includes reasons for choosing a floor, room, drawer, or file, so developers can judge whether Codex is looking in the right place.
- Local-first privacy: indexes, route packs, and task memory are generated locally by default.
- Project memory over time: successful routes, failed routes, client labels, and decisions can be reused by future tasks.

## Usage Guide

### Lazy Mode: Ask Your AI Agent

If you just want the agent to handle it, give your AI coding agent this prompt:

```text
Open and read https://github.com/lohchanhin/vertex-palace, install Vertex Palace, then use it in this repository.

Before working, check Vertex Palace status, initialize and index the repository if needed, route my task, generate a minimal context pack, inspect the routed files first, and write task memory after finishing.
```

The agent should read the repository instructions, install the plugin or use the CLI, then follow this workflow:

```text
status -> init/index if needed -> route -> pack -> inspect routed files -> implement -> test -> memory write
```

Before following a route, the agent should read `.palace/00-entrance/pitfall-board.md` when it exists.

### Manual Mode: Step By Step

1. Install the plugin:

```bash
codex plugin marketplace add lohchanhin/vertex-palace --ref v0.1.2
```

Use `v0.1.2` or newer. Avoid `v0.1.0` and `v0.1.1`; those early tags had broken MCP install metadata.

2. Open Codex and install Vertex Palace from `/plugins`.

3. Initialize and index a repository:

```bash
palace init
palace index
palace status
```

4. Before each task, create a route and context pack:

```bash
palace route "fix login refresh token bug" --limit 8 --compact
palace pack "fix login refresh token bug" --budget 6000 --route-limit 8 --max-drawers 4 --compact --out .palace/last-pack.md
```

5. Read the latest task route:

```bash
cat .palace/routes/optimized-route.txt
cat .palace/routes/latest-route.md
```

6. After the task, write memory:

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

7. Check the readable memory ledger:

```bash
cat .palace/memory/latest-task.md
cat .palace/memory/task-log.md
```

### Troubleshooting: Agent Does Not Recognize The Tool

If a Codex thread says it does not know the "memory palace tool" or `记忆宫殿工具`, it usually means the Vertex Palace plugin or MCP server is not loaded in that thread. The Chinese name is an alias; the actual tool names are `palace_status`, `palace_route`, `palace_pack`, and the other `palace_*` MCP tools.

Fix it by installing Vertex Palace from `/plugins`, trusting the plugin when prompted, and starting a new Codex thread or restarting Codex so the skill, hooks, and MCP tools reload. If only the CLI is available, ask the agent to use `palace status`, `palace index`, `palace route`, and `palace pack`.

## 简体中文说明

Vertex Palace 是一个面向 Codex 编程任务的本地上下文路由工具。它会把代码仓库整理成“楼层、房间、柜子、抽屉”的空间结构，让 Codex 在开始修 bug、加功能或理解模块前，先找到最相关的文件与代码片段，而不是每次都从整个仓库重新扫描。

它适合大型项目、多客户项目和长期维护型项目：你可以先用 `palace index` 建立本地索引，再用 `palace route` 找到任务路径，用 `palace pack` 生成精简上下文包，并在任务结束后写入成功路径、失败路径和决策记忆。所有数据默认保存在本机 `.palace/` 目录中，不上传源码，也不依赖远程向量数据库。

每次路由都会刷新 `.palace/routes/latest-route.json`、`.palace/routes/latest-route.md` 和 `.palace/routes/optimized-route.txt`，避免“最近任务路线”停留在旧任务。每次写入记忆也会更新 `.palace/memory/latest-task.md`、`.palace/memory/task-log.md` 和 `.palace/memory/index.json`，同时保留 `.palace/07-memory/` 的楼层归档。

第一层入口还会有一个踩坑告示牌：`.palace/00-entrance/pitfall-board.md`。当任务写入 `--pitfall` 或 `--failed-attempt` 时，Vertex Palace 会更新这个告示牌，并在后续 context pack 的前段显示它，让 Codex 在读路线抽屉前先看到之前踩过的坑。

名称说明：`记忆宫殿工具`、`记忆宫殿`、`memory palace`、`palace tool` 和旧名字 `Context Palace` 都是 Vertex Palace。真正注册到 Codex 的 MCP 工具名是 `palace_status`、`palace_init`、`palace_index`、`palace_route`、`palace_pack` 和 `palace_write_memory`；命令行工具名是 `palace`。

## 设计理念

- 空间化理解：把仓库从“文件列表”变成可导航的宫殿结构，让 Codex 可以按功能区域、依赖关系和任务目标定位上下文。
- 先路由，再阅读：先规划最可能相关的路径，再生成有限预算内的上下文包，减少无关文件占用 token。
- 可解释的选择：路由结果会说明为什么选择某个房间、抽屉或文件，方便开发者判断 Codex 是否走在正确方向上。
- 本地优先与隐私优先：索引、记忆和上下文包默认都在本地生成，避免把项目源码交给外部服务处理。
- 持续学习项目习惯：任务完成后记录成功路线、失败路线、客户标签和决策原因，让后续任务可以复用项目经验。

## 使用说明

### 懒人用法：直接叫 AI Agent 去读、下载、使用

把这段话丢给你的 AI coding agent：

```text
请打开并阅读 https://github.com/lohchanhin/vertex-palace，安装 Vertex Palace，然后在当前项目使用它。

开始任务前，请先检查 Vertex Palace 状态；如果还没初始化或索引过，就先 init/index；然后根据我的任务 route，生成最小 context pack，优先阅读路线推荐文件，完成后把改动文件、测试结果、决策和踩坑写入 memory。
```

它应该照这个流程做：

```text
status -> 需要时 init/index -> route -> pack -> 先读路线文件 -> 执行任务 -> 测试 -> 写入 memory
```

执行 route 前，agent 应该先读 `.palace/00-entrance/pitfall-board.md`，避免重复踩坑。

### 勤劳用法：自己一步一步跑

1. 安装插件：

```bash
codex plugin marketplace add lohchanhin/vertex-palace --ref v0.1.2
```

请使用 `v0.1.2` 或更新版本。不要再使用 `v0.1.0` 和 `v0.1.1`，这两个早期标签的 MCP 安装元数据有问题。

2. 打开 Codex，输入 `/plugins`，安装 Vertex Palace。

3. 在项目里初始化并建立索引：

```bash
palace init
palace index
palace status
```

4. 每次任务前先规划路线和上下文包：

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

如果某个 Codex 线程说不认识“记忆宫殿工具”，通常不是项目坏了，而是那个线程还没有加载 Vertex Palace 插件或 MCP server。中文叫法只是别名，实际工具名是 `palace_status`、`palace_route`、`palace_pack` 等 `palace_*` 工具。

处理方式：先在 Codex 的 `/plugins` 安装并启用 Vertex Palace，按提示信任插件，然后新开一个 Codex 线程或重启 Codex，让 skill、hooks 和 MCP 工具重新加载。如果当前环境只有命令行可用，就让 agent 改用 `palace status`、`palace index`、`palace route` 和 `palace pack`。

## Install

```bash
codex plugin marketplace add lohchanhin/vertex-palace --ref v0.1.2
```

Use `v0.1.2` or newer; `v0.1.0` and `v0.1.1` are obsolete because their MCP install metadata was broken.

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

Codex should route first, pack only the useful drawers, inspect those files, and write memory after the task.

## CLI

```bash
palace init
palace status
palace index
palace route "fix login refresh token bug"
palace pack "fix login refresh token bug" --budget 12000
palace doctor
```

### Token-Saving Workflow

For large repositories, write packs to disk and keep the first pass intentionally small:

```bash
palace route "fix checkout shipping bug" --limit 8 --compact --out .palace/last-route.txt
palace pack "fix checkout shipping bug" --budget 6000 --route-limit 8 --max-drawers 4 --compact --out .palace/last-pack.md
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

## Current Capabilities / 目前能力

- Local memory-palace data model
- Repository scanner with ignore rules
- TypeScript, JavaScript, Markdown, JSON, and fallback parsers
- Indexes for nodes, edges, rooms, symbols, directory tree, hashes, and routes
- Route planner with task classification, confidence, reasons, and excluded areas
- Latest route files: `latest-route.json`, `latest-route.md`, and `optimized-route.txt`
- Markdown and JSON context packer
- Task memory ledger: `latest-task.md`, `task-log.md`, and `index.json`
- Entrance pitfall board: `.palace/00-entrance/pitfall-board.md`
- CLI
- MCP stdio server
- Codex plugin folder, skill, hooks, and marketplace metadata
- Fixture repos and tests
