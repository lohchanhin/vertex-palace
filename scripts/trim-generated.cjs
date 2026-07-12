const fs = require("node:fs");

for (const file of ["plugins/vertex-palace/mcp/server.cjs", "dist/palace.cjs"]) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, content.replace(/[ \t]+$/gm, ""), "utf8");
}
