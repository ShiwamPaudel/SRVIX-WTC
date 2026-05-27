import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@tursodatabase/serverless/compat";
import { loadLocalEnv, requireEnv } from "./turso-env.mjs";

loadLocalEnv();

const client = createClient({
  url: requireEnv("TURSO_DATABASE_URL"),
  authToken: requireEnv("TURSO_AUTH_TOKEN"),
});

const schemaPath = resolve(process.cwd(), "src/lib/turso/schema.sql");
const schema = readFileSync(schemaPath, "utf8");

await client.executeMultiple(schema);

const requiredColumns = {
  tickets: [
    ["PMSID", "TEXT NOT NULL DEFAULT ''"],
    ["PMSNumber", "TEXT NOT NULL DEFAULT ''"],
  ],
  pms_schedule: [
    ["PMSNumber", "TEXT NOT NULL DEFAULT ''"],
    ["TicketID", "TEXT NOT NULL DEFAULT ''"],
  ],
  push_subscriptions: [
    ["EngineerID", "TEXT NOT NULL DEFAULT ''"],
    ["Role", "TEXT NOT NULL DEFAULT ''"],
    ["UserAgent", "TEXT NOT NULL DEFAULT ''"],
    ["LastSeenAt", "TEXT NOT NULL DEFAULT ''"],
  ],
};

for (const [table, columns] of Object.entries(requiredColumns)) {
  const existing = await client.execute(`PRAGMA table_info(${table})`);
  const existingColumns = new Set(existing.rows.map((row) => String(row.name)));

  for (const [column, definition] of columns) {
    if (!existingColumns.has(column)) {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN "${column}" ${definition}`);
    }
  }
}

await client.execute("UPDATE tickets SET TicketStatus = 'Closed' WHERE TicketStatus IN ('Resolved', 'Closed')");
await client.execute("UPDATE tickets SET TicketStatus = 'Pending' WHERE TicketStatus <> 'Closed'");
await client.execute("UPDATE ticket_logs SET Status = 'Closed' WHERE Status IN ('Resolved', 'Closed')");
await client.execute("UPDATE ticket_logs SET Status = 'Pending' WHERE Status <> 'Closed'");

console.log("Turso schema migration completed.");
