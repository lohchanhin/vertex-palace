#!/usr/bin/env node
import { Command } from "commander";
import { registerDoctor } from "./commands/doctor";
import { registerIndex } from "./commands/index";
import { registerInit } from "./commands/init";
import { registerMemory } from "./commands/memory";
import { registerOpen } from "./commands/open";
import { registerPack } from "./commands/pack";
import { registerRoute } from "./commands/route";
import { registerStatus } from "./commands/status";

const program = new Command();

program.name("palace").description("Vertex Palace context routing for Codex").version("0.1.0");

registerInit(program);
registerStatus(program);
registerIndex(program);
registerRoute(program);
registerPack(program);
registerOpen(program);
registerDoctor(program);
registerMemory(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
