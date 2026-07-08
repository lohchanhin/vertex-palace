import type { Command } from "commander";
import { palaceIndex } from "@vertex-palace/core";
import { printJson } from "./format";

export function registerIndex(program: Command): void {
  program
    .command("index")
    .description("Scan and index the repository")
    .option("-r, --root <path>", "Repository root")
    .action(async (options) => {
      printJson(await palaceIndex({ root: options.root }));
    });
}
