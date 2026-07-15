import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import type { PalaceNode, PalaceRoom } from "@vertex-palace/shared";
import { hashText } from "../scanner/file-hash";
import { stableJson } from "../utils/stable-json";
import { palacePath } from "../utils/path-utils";

export async function buildRooms(nodes: PalaceNode[], root: string, now: string): Promise<PalaceRoom[]> {
  const roomsRoot = path.join(root, ".palace", "rooms");
  await rm(roomsRoot, { recursive: true, force: true });
  await mkdir(roomsRoot, { recursive: true });

  const groups = new Map<string, PalaceNode[]>();
  for (const node of nodes) {
    if (!node.wing || !node.room) continue;
    const key = `${node.floor}/${node.wing}/${node.room}`;
    groups.set(key, [...(groups.get(key) ?? []), node]);
  }

  const rooms: PalaceRoom[] = [];
  for (const [key, roomNodes] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [floor, wing, room] = key.split("/") as [PalaceRoom["floor"], string, string];
    const sourcePaths = [...new Set(roomNodes.map((node) => node.sourcePath))].sort();
    const roomData: PalaceRoom = {
      id: `room_${hashText(key).slice(0, 16)}`,
      palacePath: palacePath(floor, wing, room),
      floor,
      wing,
      room,
      title: `${wing}/${room}`,
      summary: summarizeRoom(wing, room, roomNodes),
      sourcePaths,
      drawers: roomNodes.filter((node) => node.drawer).map((node) => node.id).sort(),
      cabinets: [...new Set(roomNodes.map((node) => node.cabinet).filter(Boolean) as string[])].sort(),
      tags: [...new Set(roomNodes.flatMap((node) => node.tags))].slice(0, 32).sort(),
      entryNodes: roomNodes.filter((node) => ["api", "file", "function", "class"].includes(node.kind)).map((node) => node.id).sort(),
      verificationNodes: roomNodes.filter((node) => node.floor === "05-verification").map((node) => node.id).sort(),
      runtimeNodes: roomNodes.filter((node) => node.floor === "06-runtime").map((node) => node.id).sort(),
      memoryNodes: roomNodes.filter((node) => node.floor === "07-memory").map((node) => node.id).sort(),
      tokenCost: {
        summary: Math.ceil(summarizeRoom(wing, room, roomNodes).length / 4),
        full: roomNodes.reduce((sum, node) => sum + node.tokenCost, 0)
      },
      updatedAt: now
    };
    rooms.push(roomData);
    await writeRoomFiles(root, roomData);
  }

  return rooms.sort((a, b) => a.id.localeCompare(b.id));
}

async function writeRoomFiles(root: string, room: PalaceRoom): Promise<void> {
  const roomRoot = path.join(root, ".palace", "rooms", room.wing, room.room);
  await mkdir(path.join(roomRoot, "drawers"), { recursive: true });
  await writeFile(path.join(roomRoot, "room.yml"), roomYaml(room), "utf8");
  await writeFile(path.join(roomRoot, "overview.md"), roomMarkdown(room), "utf8");
}

function summarizeRoom(wing: string, room: string, nodes: PalaceNode[]): string {
  const paths = [...new Set(nodes.map((node) => node.sourcePath))].slice(0, 8).join(", ");
  const drawers = nodes
    .filter((node) => node.drawer)
    .map((node) => node.drawer)
    .slice(0, 8)
    .join(", ");
  return `Room ${wing}/${room} covers ${nodes.length} nodes. Sources: ${paths || "none"}.${drawers ? ` Drawers: ${drawers}.` : ""}`;
}

function roomYaml(room: PalaceRoom): string {
  return [
    `id: ${room.id}`,
    `palacePath: ${room.palacePath}`,
    `floor: ${room.floor}`,
    `wing: ${room.wing}`,
    `room: ${room.room}`,
    `updatedAt: ${room.updatedAt}`,
    "sourcePaths:",
    ...room.sourcePaths.map((sourcePath) => `  - ${sourcePath}`),
    ""
  ].join("\n");
}

function roomMarkdown(room: PalaceRoom): string {
  return [`# ${room.title}`, "", room.summary, "", "## Sources", "", ...room.sourcePaths.map((sourcePath) => `- ${sourcePath}`), "", "## Room JSON", "", "```json", stableJson(room).trimEnd(), "```", ""].join("\n");
}
