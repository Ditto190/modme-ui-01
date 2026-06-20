const fs = require("fs");
const path = "workspace.code-workspace";
try {
  const s = fs.readFileSync(path, "utf8");
  JSON.parse(s);
  console.log("PARSE_OK");
} catch (e) {
  console.error("PARSE_ERR", e.message);
  process.exit(1);
}
