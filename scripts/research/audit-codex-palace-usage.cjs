#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const home = process.env.USERPROFILE || process.env.HOME;
const codexHome = process.env.CODEX_HOME || path.join(home, ".codex");
const roots = [
  path.join(codexHome, "sessions"),
  path.join(codexHome, "archived_sessions"),
];

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve("docs/research/evidence/codex-palace-usage-audit.json");

const palaceAliasPattern = /\bvertex[\s-]+palace\b|\bcontext[\s-]+palace\b|\bmemory[\s-]+palace\b|\bpalace(?:_[a-z]+)?\b|记忆宫殿|記憶宮殿/iu;
const palaceToolPattern = /(?:^|[^a-z0-9])palace_(?:context|status|init|index|route|pack|evaluate|write_memory)(?:[^a-z0-9]|$)/iu;
const palaceCliPattern = /(?:^|[\s"'`;&|])(?:&\s*)?(?:[a-z]:\\[^\r\n"']*\\)?palace(?:\.cmd|\.ps1|\.exe)?\s+(?:context|status|init|index|route|pack|evaluate|memory)(?:\s|["'`]|$)/iu;
const feedbackPositivePattern = /效果很好|太满意|太滿意|有实质帮助|有實質幫助|确实.{0,8}有帮助|確實.{0,8}有幫助|帮助很大|幫助很大|避免.{0,12}踩坑|(?:^|\s)(?:7(?:\.5)?|8|9|10)\/10\b|8\d\/100\b|really helpful|worked well|saved (?:time|tokens)|reduced repeated/iu;
const feedbackNegativePattern = /路由误判|路由誤判|置信度虚高|置信度虛高|偏题|偏題|遗漏|遺漏|索引.{0,8}过期|索引.{0,8}過期|\bstale\b|太长|太長|截断|截斷|更慢|没有节省|沒有節省|表现.{0,8}糟糕|表現.{0,8}糟糕|无效|無效|识别不到|識別不到|不认识|不認識|not loaded|irrelevant|\bworse\b|\bslower\b/iu;

function walk(root) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) result.push(full);
    }
  }
  return result;
}

function contentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      return part?.text || part?.input_text || part?.output_text || "";
    })
    .join("\n");
}

function isInjectedUserContext(text) {
  return /<recommended_plugins>|# AGENTS\.md instructions|<environment_context>|<skills_instructions>|<app-context>|<permissions instructions>|<plugins_instructions>|<codex_internal_context|The following is the Codex agent history whose request action you are assessing/iu.test(text);
}

function redact(text) {
  return String(text || "")
    .replace(/\b(password|密码|密碼|passwd)\s*(?:is|是|[:=])?\s*\S+/giu, "$1=[REDACTED]")
    .replace(/\b(?:ghp|github_pat|npm)_[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_TOKEN]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_TOKEN]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/giu, "Bearer [REDACTED_TOKEN]")
    .replace(/\b_authToken\s*=\s*[^\s"']+/giu, "_authToken=[REDACTED_TOKEN]")
    .replace(/\b((?:https?|mongodb(?:\+srv)?):\/\/)[^\s:@/]+:[^\s@/]+@/giu, "$1[REDACTED_CREDENTIALS]@")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[REDACTED_IP]")
    .replace(/\s+/g, " ")
    .trim();
}

function snippet(text, limit = 320) {
  const value = redact(text);
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}

function toolText(payload) {
  const candidates = [
    payload?.arguments,
    payload?.input,
    payload?.command,
    payload?.cmd,
    payload?.tool_input,
  ];
  return candidates
    .map((value) => (typeof value === "string" ? value : value ? JSON.stringify(value) : ""))
    .filter(Boolean)
    .join("\n");
}

function outputText(payload) {
  function flatten(value, depth = 0) {
    if (depth > 5 || value == null) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map((item) => flatten(item, depth + 1)).filter(Boolean).join("\n");
    if (typeof value === "object") {
      const preferred = ["text", "output", "result", "content", "data"]
        .map((key) => flatten(value[key], depth + 1))
        .filter(Boolean);
      return preferred.length ? preferred.join("\n") : JSON.stringify(value);
    }
    return String(value);
  }
  const candidates = [payload?.output, payload?.result, payload?.content, payload?.text];
  return candidates.map((value) => flatten(value)).filter(Boolean).join("\n");
}

function callId(payload) {
  return payload?.call_id || payload?.callId || payload?.id || payload?.tool_call_id || null;
}

function classifyOperation(text, name = "") {
  const value = `${name} ${text}`.toLowerCase();
  const cliMatch = value.match(/\bpalace(?:\.cmd|\.ps1|\.exe)?\s+(context|status|init|index|route|pack|evaluate|memory)\b/i);
  if (cliMatch) return cliMatch[1].toLowerCase();
  if (value.includes("palace_write_memory")) return "memory";
  for (const operation of ["context", "status", "init", "index", "route", "pack", "evaluate"]) {
    if (value.includes(`palace_${operation}`)) return operation;
  }
  return "other";
}

function classifyOutcome(text) {
  const value = String(text || "").replace(/\\"/g, '"').replace(/\\n/g, "\n");
  const failure = /not recognized|command not found|not loaded|no matches?|returned 0 matches|cannot find|could not find|enoent|err_module_not_found|failed to|exit[_ ]code["':=\s]+[1-9]|is not available|not available in (?:this|the current)|invalid arguments|timed out|timeout/iu.test(value);
  const success = /# Vertex Palace|Vertex Palace Adaptive Context|Mode:\s*(?:bypass|route-lite|full-palace|guarded-memory-palace)|Route confidence:|Palace Status|Task type:[\s\S]{0,400}\bRoute:|Usage:\s*palace|"mode"\s*:|"routeId"\s*:|"ok"\s*:\s*true|"initialized"\s*:|Memory written|Index(?:ed| complete)|exit[_ ]code["':=\s]+0|Process exited with code 0|Script completed/iu.test(value);
  if (failure && !success) return "failed";
  if (success) return failure ? "mixed" : "succeeded";
  return "unknown";
}

function extractMetrics(text) {
  const value = String(text || "");
  const number = (pattern) => {
    const match = value.match(pattern);
    return match ? Number(match[1].replace(/,/g, "")) : null;
  };
  const word = (pattern) => value.match(pattern)?.[1] || null;
  return {
    mode: word(/Mode:\s*([a-z-]+)/i) || word(/"mode"\s*:\s*"([a-z-]+)"/i),
    routeConfidence: number(/Route confidence:\s*([0-9.]+)/i) ?? number(/"routeConfidence"\s*:\s*([0-9.]+)/i),
    evidenceStatus: word(/Evidence status:\s*([a-z-]+)/i) || word(/"evidenceStatus"\s*:\s*"([a-z-]+)"/i),
    estimatedTokens: number(/Estimated tokens:\s*([0-9,]+)/i) ?? number(/"estimatedTokens"\s*:\s*([0-9,]+)/i),
    payloadBytes: number(/Calls:\s*\d+\s*\|\s*Bytes:\s*([0-9,]+)/i) ?? number(/"bytes"\s*:\s*([0-9,]+)/i),
    memoryIncluded: number(/Memory:\s*([0-9,]+)\s+included/i) ?? number(/"memoryIncluded"\s*:\s*([0-9,]+)/i),
    memoryCandidates: number(/Memory:\s*[0-9,]+\s+included\s*\/\s*([0-9,]+)\s+candidates/i) ?? number(/"memoryCandidates"\s*:\s*([0-9,]+)/i),
    changedFileCoverage: number(/Changed-file coverage:\s*([0-9.]+)/i) ?? number(/"changedFileCoverage"\s*:\s*([0-9.]+)/i),
    routeFocus: number(/Route focus:\s*([0-9.]+)/i) ?? number(/"routeFocus"\s*:\s*([0-9.]+)/i),
  };
}

function isCallPayload(payload) {
  const type = String(payload?.type || "").toLowerCase();
  return type.includes("call") && !type.includes("output");
}

function isOutputPayload(payload) {
  const type = String(payload?.type || "").toLowerCase();
  return type.includes("output") || type.includes("result");
}

function isActualPalaceCall(payload, name, text) {
  if (palaceToolPattern.test(name)) return true;
  const normalizedName = String(name || "").toLowerCase();
  if (["apply_patch", "tool_search", "search", "unknown"].some((part) => normalizedName.includes(part))) return false;
  if (["exec_command", "shell_command", "shell", "local_shell_call"].some((part) => normalizedName.includes(part))) {
    return palaceCliPattern.test(text);
  }
  if (normalizedName === "exec" || normalizedName.endsWith("__exec") || normalizedName === "functions.exec") {
    return /tools\.(?:exec_command|shell_command)\s*\([\s\S]*?\b(?:cmd|command)\s*:\s*["'`]\s*(?:&\s*)?(?:[a-z]:\\[^\r\n"']*\\)?palace(?:\.cmd|\.ps1|\.exe)?\s+(?:context|status|init|index|route|pack|evaluate|memory)\b/iu.test(text);
  }
  return false;
}

function loadTitles() {
  const indexPath = path.join(codexHome, "session_index.jsonl");
  const titles = new Map();
  if (!fs.existsSync(indexPath)) return titles;
  for (const line of fs.readFileSync(indexPath, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line);
      if (item.id) titles.set(item.id, item.thread_name || null);
    } catch {}
  }
  return titles;
}

async function inspectSession(file, titles) {
  const record = {
    sessionId: null,
    title: null,
    file,
    archived: file.includes(`${path.sep}archived_sessions${path.sep}`),
    cwd: null,
    startedAt: null,
    updatedAt: null,
    threadSource: null,
    eventTypes: {},
    payloadTypes: {},
    userMentions: 0,
    assistantMentions: 0,
    explicitUserRequestsToUse: 0,
    positiveFeedback: [],
    negativeFeedback: [],
    assistantEvaluations: [],
    calls: [],
    parseErrors: 0,
  };
  const callsById = new Map();
  const pendingProcesses = new Map();
  const forwardedCallsById = new Map();

  function attachOutput(call, text) {
    call.outcome = classifyOutcome(text);
    call.output = snippet(text, 700);
    call.metrics = { ...call.metrics, ...extractMetrics(text) };
    const processId = String(text).match(/Process running with session ID\s+(\d+)/i)?.[1];
    const cellId = String(text).match(/Script running with cell ID\s+([A-Za-z0-9-]+)/i)?.[1];
    const runningId = processId ? `process:${processId}` : cellId ? `cell:${cellId}` : null;
    if (runningId) pendingProcesses.set(runningId, call);
    return runningId;
  }

  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const isSessionMeta = line.includes('"type":"session_meta"');
    const isTurnContext = line.includes('"type":"turn_context"');
    if (isTurnContext) continue;
    const mentionsPalace =
      line.includes("palace") ||
      line.includes("Palace") ||
      line.includes("PALACE") ||
      line.includes("记忆宫殿") ||
      line.includes("記憶宮殿");
    const rawCallId = line.match(/"(?:call_id|callId|tool_call_id)":"([^"]+)"/)?.[1];
    const referencesKnownCall = rawCallId ? callsById.has(rawCallId) : false;
    const referencesForwardedCall = rawCallId ? forwardedCallsById.has(rawCallId) : false;
    const referencesPendingProcess = pendingProcesses.size > 0 && [...pendingProcesses.keys()].some((key) => {
      const [kind, id] = key.split(":");
      return kind === "cell"
        ? /cell_id|cellId/i.test(line) && line.includes(id)
        : /session_id|sessionId/i.test(line) && line.includes(id);
    });
    if (!isSessionMeta && !mentionsPalace && !referencesKnownCall && !referencesForwardedCall && !referencesPendingProcess) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      record.parseErrors += 1;
      continue;
    }
    record.updatedAt = event.timestamp || record.updatedAt;
    record.eventTypes[event.type || "unknown"] = (record.eventTypes[event.type || "unknown"] || 0) + 1;
    const payload = event.payload || {};
    if (payload.type) record.payloadTypes[payload.type] = (record.payloadTypes[payload.type] || 0) + 1;

    if (event.type === "session_meta") {
      record.sessionId = payload.session_id || payload.id || record.sessionId;
      record.cwd = payload.cwd || record.cwd;
      record.startedAt = payload.timestamp || event.timestamp || record.startedAt;
      record.threadSource = payload.thread_source || record.threadSource;
      continue;
    }
    if (event.type === "turn_context") continue;

    if (payload.type === "message") {
      const text = contentText(payload.content);
      if (!palaceAliasPattern.test(text)) continue;
      if (payload.role === "user") {
        if (isInjectedUserContext(text)) continue;
        record.userMentions += 1;
        if (/使用|套用|先读|先讀|读取|讀取|run|use|apply|route|status|context/iu.test(text)) record.explicitUserRequestsToUse += 1;
        if (feedbackPositivePattern.test(text)) record.positiveFeedback.push({ timestamp: event.timestamp, text: snippet(text) });
        if (feedbackNegativePattern.test(text)) record.negativeFeedback.push({ timestamp: event.timestamp, text: snippet(text) });
      } else if (payload.role === "assistant") {
        record.assistantMentions += 1;
        if (/整体评价|整體評價|主要扣分|实际表现|實際表現|\b\d+(?:\.\d+)?\/10\b|\b\d+\/100\b|Pitfall Board|changed-file coverage|route focus/iu.test(text)) {
          record.assistantEvaluations.push({ timestamp: event.timestamp, text: snippet(text, 1200) });
        }
      }
      continue;
    }

    if (isCallPayload(payload)) {
      const name = payload.name || payload.tool_name || payload.function?.name || "unknown";
      const text = toolText(payload);
      const processEntry = [...pendingProcesses.entries()].find(([key]) => {
        const [kind, id] = key.split(":");
        return kind === "cell"
          ? /cell_id|cellId/i.test(text) && text.includes(id)
          : /session_id|sessionId/i.test(text) && text.includes(id);
      });
      if (processEntry && /write_stdin|stdin|\bwait\b/i.test(name)) {
        const id = callId(payload);
        if (id) forwardedCallsById.set(id, { processId: processEntry[0], call: processEntry[1] });
        continue;
      }
      if (!isActualPalaceCall(payload, name, text)) continue;
      const call = {
        timestamp: event.timestamp,
        callId: callId(payload),
        name,
        operation: classifyOperation(text, name),
        transport: palaceToolPattern.test(name) ? "mcp" : "cli",
        input: snippet(text, 500),
        outcome: "unknown",
        output: null,
        metrics: {},
      };
      record.calls.push(call);
      if (call.callId) callsById.set(call.callId, call);
      continue;
    }

    if (isOutputPayload(payload)) {
      const id = callId(payload);
      const text = outputText(payload);
      const call = id ? callsById.get(id) : null;
      if (call) {
        attachOutput(call, text);
        continue;
      }
      const forwarded = id ? forwardedCallsById.get(id) : null;
      if (!forwarded) continue;
      const runningId = attachOutput(forwarded.call, text);
      if (!runningId) pendingProcesses.delete(forwarded.processId);
      forwardedCallsById.delete(id);
    }
  }
  record.title = titles.get(record.sessionId) || null;
  record.feedbackSummary = {
    positive: record.positiveFeedback.length,
    negative: record.negativeFeedback.length,
  };
  return record;
}

function tally(items, keyFn) {
  const result = {};
  for (const item of items) {
    const key = keyFn(item) ?? "unknown";
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

async function main() {
  const titles = loadTitles();
  const files = roots.flatMap(walk).sort();
  const rawSessions = [];
  for (const file of files) rawSessions.push(await inspectSession(file, titles));
  const grouped = new Map();
  for (const session of rawSessions) {
    const key = session.sessionId || session.file;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(session);
  }
  const sessions = [...grouped.values()].map((parts) => {
    const preferred = parts.find((part) => !part.archived) || parts[0];
    const callMap = new Map();
    const positiveMap = new Map();
    const negativeMap = new Map();
    const assistantEvaluationMap = new Map();
    for (const part of parts) {
      for (const call of part.calls) {
        const key = call.callId || `${call.timestamp}|${call.name}|${call.input}`;
        const existing = callMap.get(key);
        if (!existing || (existing.outcome === "unknown" && call.outcome !== "unknown")) callMap.set(key, call);
      }
      for (const item of part.positiveFeedback) positiveMap.set(`${item.timestamp}|${item.text}`, item);
      for (const item of part.negativeFeedback) negativeMap.set(`${item.timestamp}|${item.text}`, item);
      for (const item of part.assistantEvaluations) assistantEvaluationMap.set(`${item.timestamp}|${item.text}`, item);
    }
    return {
      ...preferred,
      files: parts.map((part) => part.file),
      archived: parts.every((part) => part.archived),
      startedAt: parts.map((part) => part.startedAt).filter(Boolean).sort()[0] || preferred.startedAt,
      updatedAt: parts.map((part) => part.updatedAt).filter(Boolean).sort().at(-1) || preferred.updatedAt,
      userMentions: Math.max(...parts.map((part) => part.userMentions)),
      assistantMentions: Math.max(...parts.map((part) => part.assistantMentions)),
      explicitUserRequestsToUse: Math.max(...parts.map((part) => part.explicitUserRequestsToUse)),
      positiveFeedback: [...positiveMap.values()],
      negativeFeedback: [...negativeMap.values()],
      assistantEvaluations: [...assistantEvaluationMap.values()],
      calls: [...callMap.values()].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))),
      parseErrors: parts.reduce((sum, part) => sum + part.parseErrors, 0),
    };
  });
  const usageSessions = sessions.filter((session) => session.calls.length > 0);
  const calls = usageSessions.flatMap((session) => session.calls.map((call) => ({ ...call, sessionId: session.sessionId })));
  const mentionOnlySessions = sessions.filter((session) => session.calls.length === 0 && (session.userMentions > 0 || session.assistantMentions > 0));
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope: {
      roots,
      sessionFiles: files.length,
      parsedSessions: rawSessions.length,
      uniqueSessions: sessions.length,
      archivedSessions: sessions.filter((session) => session.archived).length,
      parseErrors: sessions.reduce((sum, session) => sum + session.parseErrors, 0),
      note: "System, developer, and turn-context instructions are excluded from usage detection.",
    },
    summary: {
      usageSessions: usageSessions.length,
      mentionOnlySessions: mentionOnlySessions.length,
      totalCalls: calls.length,
      callsByOperation: tally(calls, (call) => call.operation),
      callsByTransport: tally(calls, (call) => call.transport),
      callsByOutcome: tally(calls, (call) => call.outcome),
      usageSessionsByCwd: tally(usageSessions, (session) => session.cwd || "unknown"),
      feedback: {
        positiveSignals: usageSessions.reduce((sum, session) => sum + session.positiveFeedback.length, 0),
        negativeSignals: usageSessions.reduce((sum, session) => sum + session.negativeFeedback.length, 0),
        assistantEvaluations: usageSessions.reduce((sum, session) => sum + session.assistantEvaluations.length, 0),
      },
    },
    sessionInventory: sessions.map((session) => ({
      sessionId: session.sessionId,
      title: session.title,
      cwd: session.cwd,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      threadSource: session.threadSource,
      archived: session.archived,
      palaceCalls: session.calls.length,
      firstPalaceCallAt: session.calls[0]?.timestamp || null,
      lastPalaceCallAt: session.calls.at(-1)?.timestamp || null,
    })),
    usageSessions,
    mentionOnlySessions: mentionOnlySessions.map((session) => ({
      sessionId: session.sessionId,
      title: session.title,
      cwd: session.cwd,
      startedAt: session.startedAt,
      userMentions: session.userMentions,
      assistantMentions: session.assistantMentions,
      positiveFeedback: session.positiveFeedback,
      negativeFeedback: session.negativeFeedback,
    })),
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, scope: result.scope, summary: result.summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
