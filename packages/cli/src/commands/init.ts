import type { Command } from "commander";
import { palaceInit } from "@vertex-palace/core";
import { printJson } from "./format";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Initialize .palace in the current repository")
    .option("-r, --root <path>", "Repository root")
    .action(async (options) => {
      printJson(await palaceInit({ root: options.root }));
    });
}
