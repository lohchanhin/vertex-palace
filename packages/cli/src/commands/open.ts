import type { Command } from "commander";
import { palaceOpen } from "@vertex-palace/core";

export function registerOpen(program: Command): void {
  program
    .command("open")
    .description("Open a palace node by node id or palace path")
    .argument("<target>", "Node id or palace path")
    .option("-r, --root <path>", "Repository root")
    .option("-l, --load-level <level>", "summary, signature, snippet, full_symbol, full_file, or defer", "summary")
    .action(async (target: string, options) => {
      const output = await palaceOpen({
        root: options.root,
        nodeId: target.startsWith("node_") ? target : undefined,
        palacePath: target.startsWith("node_") ? undefined : target,
        loadLevel: options.loadLevel
      });
      process.stdout.write(output.content.endsWith("\n") ? output.content : `${output.content}\n`);
    });
}
