// @ts-expect-error
import { mock } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// @ts-expect-error
mock.module("server-only", () => {
  return {};
});

// Load environment variables from database/.env
try {
  const envPath = resolve(import.meta.dirname, "../../database/.env");
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
} catch (e) {
  console.error("Failed to load .env", e);
}

async function main() {
  const { database } = await import("@repo/database");
  const events = await database.telemetryEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log(events);
}
main()
  .catch(console.error)
  .finally(() => process.exit(0));
