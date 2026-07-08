import type { DirectoryTreeNode } from "@context-palace/shared";

export function buildDirectoryMap(paths: string[]): DirectoryTreeNode {
  const root: DirectoryTreeNode = { name: ".", path: ".", type: "directory", children: [] };

  for (const filePath of [...paths].sort()) {
    const parts = filePath.split("/");
    let current = root;
    let accumulated = "";
    parts.forEach((part, index) => {
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      const type = index === parts.length - 1 ? "file" : "directory";
      current.children ??= [];
      let child = current.children.find((item) => item.name === part && item.type === type);
      if (!child) {
        child = { name: part, path: accumulated, type, children: type === "directory" ? [] : undefined };
        current.children.push(child);
        current.children.sort((a, b) => `${a.type}:${a.name}`.localeCompare(`${b.type}:${b.name}`));
      }
      current = child;
    });
  }

  return root;
}
