#!/usr/bin/env node
import { callTool } from "./tools/call-tool";
import { toolDefinitions } from "./tools/definitions";

type JsonRpcMessage = {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

let buffer = Buffer.alloc(0);

process.stdin.on("data", (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (const message of readMessages()) {
    void handleMessage(message);
  }
});

process.stdin.resume();

function readMessages(): JsonRpcMessage[] {
  const messages: JsonRpcMessage[] = [];
  while (true) {
    const separator = buffer.indexOf("\r\n\r\n");
    if (separator === -1) break;
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
    const body = buffer.slice(start, end).toString("utf8");
    buffer = buffer.slice(end);
    messages.push(JSON.parse(body) as JsonRpcMessage);
  }
  return messages;
}

async function handleMessage(message: JsonRpcMessage): Promise<void> {
  if (!message.id && message.id !== 0) return;
  try {
    switch (message.method) {
      case "initialize":
        sendResult(message.id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "vertex-palace", version: "0.1.2" }
        });
        break;
      case "tools/list":
        sendResult(message.id, { tools: toolDefinitions });
        break;
      case "tools/call": {
        const params = message.params ?? {};
        const name = typeof params.name === "string" ? params.name : "";
        const args = params.arguments && typeof params.arguments === "object" ? (params.arguments as Record<string, unknown>) : {};
        const result = await callTool(name, args);
        sendResult(message.id, {
          content: [
            {
              type: "text",
              text: typeof result === "string" ? result : JSON.stringify(result, null, 2)
            }
          ]
        });
        break;
      }
      default:
        sendError(message.id, -32601, `Method not found: ${message.method ?? "unknown"}`);
    }
  } catch (error) {
    sendError(message.id, -32000, error instanceof Error ? error.message : String(error));
  }
}

function sendResult(id: string | number | null | undefined, result: unknown): void {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id: string | number | null | undefined, code: number, message: string): void {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function send(message: unknown): void {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}
