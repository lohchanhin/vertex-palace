# Room Inventory Schema 0.5

Status: Phase 0 contract frozen. Production object routing is not enabled.

## Purpose

Room Inventory promotes functions, methods, classes, types, constants, endpoints, and focused tests from line-addressed drawers into lightweight first-class objects inside a Palace room. It extends the existing node graph instead of creating a second graph or one Markdown file per symbol.

The spatial mapping is:

| Palace location | Repository meaning |
| --- | --- |
| Floor | Architectural layer such as interface, implementation, data, or verification |
| Room | Feature, package, or bounded product area |
| Cabinet | Source file |
| Owner | Class, namespace, module, or object literal |
| Object | Function, def, method, type, constant, endpoint, or test |
| Relation | Calls, contains, tests, implements, reads, or writes |

## Existing Foundation

Vertex Palace 0.4 already parses `function`, `class`, `interface`, `type`, `const`, and `method` symbols and can pack a `full_symbol` drawer. Phase 0 does not replace that parser output. It adds an optional metadata contract and a pure identity builder for later index integration.

## Object Metadata

`PalaceObjectMetadata` contains:

- `objectKind` and `qualifiedName` for exact identity.
- Optional `ownerName`, visibility, and normalized modifiers.
- `parser` and `parserConfidence` for provenance and safety.
- Identity version, declaration key, signature shape, and semantic hash.
- Optional relation confidence, reserved for a later relation phase.

The metadata is optional on both `ParsedSymbol` and `PalaceNode`. Existing indexes and clients remain valid when it is absent.

## Identity Contract

The declaration key excludes source line numbers. It is derived from normalized language, normalized source path, object kind, qualified name, and normalized signature shape. Therefore inserting unrelated lines before a declaration does not change its declaration key.

The semantic hash excludes source path and object name. It is derived from language, object kind, and the comment-free, whitespace-normalized implementation remaining after the leading declaration signature is removed. It is a relocation candidate, not proof of identity. A future alias may be created only when the semantic match is unique inside a bounded evidence scope. Ambiguous matches remain stale.

Phase 0 guarantees line-shift stability in the frozen fixtures. It does not yet guarantee automatic move or rename recovery in production indexes.

## Parser Provenance

The initial parser labels are:

- `ts-morph` for TypeScript and JavaScript AST extraction.
- `python-structural` for the existing indentation-aware Python parser.
- `fallback-structural` for current Go and Rust structural extraction.
- `unknown` when provenance cannot be established.

Confidence describes parser evidence, not route correctness. Low-confidence objects cannot later authorize a forced stop without independent evidence.

## Compatibility Boundary

Phase 0 must keep all four Palace modes, existing node IDs, CLI and MCP inputs, route order, and packing behavior unchanged. It does not bump the persisted Palace schema because no new metadata is written by the production indexer.

The implementation intentionally does not call the new identity builder from `buildNodes`. Integration belongs to a later phase with migration and regression evidence.

## Storage Boundary

Room Inventory will reuse the existing node and edge graph. It will not generate one file per object. The future relation index is capped at 32 retained high-value outgoing edges per object, with overflow telemetry, so high-degree utilities cannot cause unbounded graph growth.

## Frozen Fixtures

The machine fixture contract is `packages/core/test/fixtures/room-inventory/contract.json`, SHA-256 `e7b62cc10e821f2adedead527fa77dc158be4866f6aab4b3724afef06d9ec460`.

It covers TypeScript, JavaScript, Python, Go, and Rust. Each case must be discovered by the current parser and must retain the same declaration key and semantic hash after unrelated lines are inserted before the object.

## Claim Boundary

This contract establishes a compatible vocabulary and deterministic identity primitive. It does not establish production object routing, relation accuracy, context reduction, Agent correctness, Token savings, or speed improvements.
