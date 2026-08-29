# Room Inventory 0.5: Phase 1 Index Integration

Status: verified on the frozen development fixtures. Object-first production routing remains disabled.

## Purpose

Phase 1 connects the frozen Room Inventory identity contract to the existing parser and node index. It answers a narrow engineering question: can Vertex Palace persist function-, method-, class-, type-, and constant-level metadata without changing the 0.4 route surface?

This phase does not claim better routing, lower Token use, faster Agents, or Round 26 qualification.

## Activation

The integration is default-off. It can be enabled for development indexing with:

```text
VERTEX_PALACE_EXPERIMENTAL_ROOM_INVENTORY=1
```

The internal `indexPalace` and `parseFile` APIs also accept an explicit `roomInventory` option for deterministic tests. An explicit option overrides the environment. CLI and MCP schemas are unchanged in Phase 1.

## Data Path

1. Existing parsers discover symbols exactly as before.
2. A central metadata adapter enriches supported symbols only when the switch is enabled.
3. `buildNodes` copies optional metadata to the existing symbol node.
4. Existing node IDs, Palace addresses, summaries, tags, token cost, edges, rooms, and packing inputs are not recalculated from the metadata.

No object edge, object-first score, forced stop, or new Markdown file per object is introduced.

## Supported Development Languages

| Language | Provenance | Confidence | Export evidence |
| --- | --- | ---: | --- |
| TypeScript / JavaScript | `ts-morph` | 1.00 | explicit module export or exported owner |
| Python | `python-structural` | 0.75 | no explicit export claim in Phase 1 |
| Go | `fallback-structural` | 0.65 | exported declaration-name casing |
| Rust | `fallback-structural` | 0.65 | explicit `pub` declaration |

Unsupported languages retain their existing parsed symbols without Room Inventory metadata.

## Development Fixture Result

The frozen five-language fixture produced these deterministic index observations:

| Metric | Default | Room Inventory enabled |
| --- | ---: | ---: |
| Files | 6 | 6 |
| Nodes | 22 | 22 |
| Edges | 36 | 36 |
| Symbol nodes | 11 | 11 |
| Object metadata records | 0 | 8 |
| Index bytes | 67,746 | 75,386 |

The index-size multiplier was `1.1128`. Existing node routing-field projection agreement was `1.00`, and declaration-key plus semantic-hash retention after unrelated line shifts was `1.00` for all five frozen target objects.

These measurements are fixture evidence only. They do not satisfy the fresh-target, balanced, repeated conditions required by Round 26.

## Compatibility Boundary

- The default remains disabled.
- Existing Palace modes and persisted schema version remain unchanged.
- Existing indexes remain readable because `object` is optional.
- Existing node IDs and route inputs are unchanged.
- CLI and MCP input schemas are unchanged.
- Production routing does not read the new metadata yet.

## Next Phase

Phase 2 may build bounded object relations and an experimental object-first candidate. It must preserve the frozen 32-edge cap, treat parser confidence as provenance rather than route confidence, and pass regression evidence before Round 26 target selection begins.
