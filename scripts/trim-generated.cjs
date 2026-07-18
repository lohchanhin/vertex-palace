const fs = require("node:fs");

for (const file of ["plugins/vertex-palace/mcp/server.cjs", "dist/palace.cjs"]) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, "utf8");
  const trimmed = content.replace(/[ \t]+$/gm, "");
  if (trimmed !== content) writeWithRetry(file, trimmed);
}

function writeWithRetry(file, content) {
  const retryableCodes = new Set(["EACCES", "EBUSY", "EPERM", "UNKNOWN"]);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      fs.writeFileSync(file, content, "utf8");
      return;
    } catch (error) {
      if (attempt === 5 || !retryableCodes.has(error?.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 50);
    }
  }
}
