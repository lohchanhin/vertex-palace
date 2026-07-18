const { spawn } = require("node:child_process");
const path = require("node:path");
const { version } = require("../package.json");

const serverPath = path.resolve(process.argv[2] || "plugins/vertex-palace/mcp/server.cjs");
const child = spawn(process.execPath, [serverPath, "--stdio"], {
  stdio: ["pipe", "pipe", "pipe"]
});
const responses = new Map();
let buffer = Buffer.alloc(0);
let finished = false;

const timeout = setTimeout(() => fail(new Error("Timed out waiting for MCP initialize and tools/list responses.")), 15000);

child.stderr.on("data", (chunk) => process.stderr.write(chunk));
child.on("error", fail);
child.on("close", (code) => {
  if (!finished) fail(new Error(`MCP server exited before verification completed (code ${code ?? "unknown"}).`));
});
child.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (const message of readMessages()) {
    responses.set(message.id, message);
  }
  if (responses.has(1) && responses.has(2)) verify();
});

child.stdin.write(frame({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "vertex-palace-smoke", version: "1.0.0" }
  }
}));
child.stdin.write(frame({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }));

function frame(message) {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}

function readMessages() {
  const messages = [];
  while (true) {
    const separator = buffer.indexOf("\r\n\r\n");
    if (separator < 0) break;
    const headers = buffer.slice(0, separator).toString("utf8");
    const lengthMatch = /Content-Length:\s*(\d+)/i.exec(headers);
    if (!lengthMatch) {
      buffer = buffer.slice(separator + 4);
      continue;
    }
    const length = Number(lengthMatch[1]);
    const start = separator + 4;
    const end = start + length;
    if (buffer.length < end) break;
    messages.push(JSON.parse(buffer.slice(start, end).toString("utf8")));
    buffer = buffer.slice(end);
  }
  return messages;
}

function verify() {
  if (finished) return;
  const initialized = responses.get(1);
  const tools = responses.get(2);
  const names = tools?.result?.tools?.map((tool) => tool.name) ?? [];

  if (initialized?.result?.serverInfo?.version !== version) {
    fail(new Error(`MCP version mismatch: expected ${version}, received ${initialized?.result?.serverInfo?.version ?? "none"}.`));
    return;
  }
  if (!names.includes("palace_status") || !names.includes("palace_evaluate")) {
    fail(new Error(`MCP tools/list is missing required tools: ${names.join(", ") || "none"}.`));
    return;
  }

  finished = true;
  clearTimeout(timeout);
  process.stdout.write(`MCP smoke test passed for Vertex Palace ${version} (${names.length} tools).\n`);
  child.stdin.end();
  child.kill();
}

function fail(error) {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  child.kill();
  process.exitCode = 1;
}
