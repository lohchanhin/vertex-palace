import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function withFixture(name: string, run: (root: string) => Promise<void>): Promise<void> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), `vertex-palace-${name}-`));
  const source = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", name);
  await cp(source, tempRoot, { recursive: true });
  try {
    await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
