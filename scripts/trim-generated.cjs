const fs = require("node:fs");

for (const file of ["plugins/vertex-palace/mcp/server.cjs"]) {
  const content = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, content.replace(/[ \t]+$/gm, ""), "utf8");
}
