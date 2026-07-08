import type { Command } from "commander";
import { palaceDoctor } from "@vertex-palace/core";
import { printJson } from "./format";

export function registerDoctor(program: Command): void {
  program
    .command("doctor")
    .description("Check Vertex Palace health")
    .option("-r, --root <path>", "Repository root")
    .action(async (options) => {
      printJson(await palaceDoctor({ root: options.root }));
    });
}
