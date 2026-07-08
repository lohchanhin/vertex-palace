# Context Palace

Spatial context routing for Codex.

Context Palace turns a repository into a local palace of floors, rooms, cabinets, and drawers. Before a coding task, Codex can ask for a route and receive a compact context pack instead of scanning the whole repository.

## Install

```bash
codex plugin marketplace add lohchanhin/codex-palace --ref v0.1.0
```

Open Codex:

```text
/plugins
```

Install Context Palace.

## First Use

```text
Use Context Palace to index this repository.
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
Use Context Palace before fixing this bug: fix login refresh token bug
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

## Privacy

Context Palace runs locally by default. It does not upload source code, call external APIs, use embeddings, or create a remote index.

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
