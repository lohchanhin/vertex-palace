import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, ".palace", "palace.yml");

if (fs.existsSync(configPath)) {
  console.log("Context Palace is initialized. Use palace_status and palace_route before broad repository search.");
} else {
  console.log("Context Palace is not initialized. Run palace_init and palace_index when you want routed context.");
}
