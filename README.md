# Vertex Palace

Memory-palace context routing for Codex.

Vertex Palace turns a repository into a local palace of floors, rooms, cabinets, and drawers. Before a coding task, Codex can ask for a route and receive a compact context pack instead of scanning the whole repository.

![AI Agent task comparison](./plugins/vertex-palace/assets/vertex-palace-ai-agent-comparison.png)

## English Overview

Vertex Palace is a local context-routing tool for Codex coding tasks. It organizes a repository into a memory-palace structure of floors, rooms, cabinets, and drawers, so Codex can find the most relevant files and code snippets before fixing bugs, adding features, or understanding modules.

It is designed for large repositories, multi-client projects, and long-lived codebases. You can run `palace index` to build a local index, use `palace route` to find the task path, generate a compact context pack with `palace pack`, and write task memory after the work is done. By default, everything stays inside the local `.palace/` directory: no source upload, no external API calls, and no remote vector database.

## Design Philosophy

- Spatial understanding: turn a repository from a flat file list into a navigable palace that Codex can explore by feature area, dependency, and task intent.
- Route before reading: plan the most relevant path first, then generate a bounded context pack instead of spending tokens on unrelated files.
- Explainable selection: every route includes reasons for choosing a floor, room, drawer, or file, so developers can judge whether Codex is looking in the right place.
- Local-first privacy: indexes, route packs, and task memory are generated locally by default.
- Project memory over time: successful routes, failed routes, client labels, and decisions can be reused by future tasks.

## 简体中文说明

Vertex Palace 是一个面向 Codex 编程任务的本地上下文路由工具。它会把代码仓库整理成“楼层、房间、柜子、抽屉”的空间结构，让 Codex 在开始修 bug、加功能或理解模块前，先找到最相关的文件与代码片段，而不是每次都从整个仓库重新扫描。

它适合大型项目、多客户项目和长期维护型项目：你可以先用 `palace index` 建立本地索引，再用 `palace route` 找到任务路径，用 `palace pack` 生成精简上下文包，并在任务结束后写入成功路径、失败路径和决策记忆。所有数据默认保存在本机 `.palace/` 目录中，不上传源码，也不依赖远程向量数据库。

## 设计理念

- 空间化理解：把仓库从“文件列表”变成可导航的宫殿结构，让 Codex 可以按功能区域、依赖关系和任务目标定位上下文。
- 先路由，再阅读：先规划最可能相关的路径，再生成有限预算内的上下文包，减少无关文件占用 token。
- 可解释的选择：路由结果会说明为什么选择某个房间、抽屉或文件，方便开发者判断 Codex 是否走在正确方向上。
- 本地优先与隐私优先：索引、记忆和上下文包默认都在本地生成，避免把项目源码交给外部服务处理。
- 持续学习项目习惯：任务完成后记录成功路线、失败路线、客户标签和决策原因，让后续任务可以复用项目经验。

## Install

```bash
codex plugin marketplace add lohchanhin/codex-palace --ref v0.1.0
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
  --tag checkout \
  --tag tenant-config \
  --notes "Kept shipping rules configurable."
```

## Privacy

Vertex Palace runs locally by default. It does not upload source code, call external APIs, use embeddings, or create a remote index.

## MVP Scope

- Core data model
- Scanner with ignore rules
- TypeScript, JavaScript, Markdown, JSON, and fallback parsers
- Indexes for nodes, edges, rooms, symbols, directory tree, and hashes
- Route planner with task classification and reasons
- Markdown and JSON context packer
- CLI
- MCP stdio server
- Codex plugin folder, skill, hooks, and marketplace metadata
- Fixture repos and tests
