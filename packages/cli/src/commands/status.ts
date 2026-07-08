import type { Command } from "commander";
import { palaceStatus } from "@context-palace/core";
import { printJson } from "./format";

export function registerStatus(program: Command): void {
  program
    .command("status")
    .description("Show Context Palace status")
    .option("-r, --root <path>", "Repository root")
    .action(async (options) => {
      printJson(await palaceStatus({ root: options.root }));
    });
}
