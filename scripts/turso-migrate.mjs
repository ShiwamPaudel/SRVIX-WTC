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
    ["TicketAcceptedAt", "TEXT NOT NULL DEFAULT ''"],
    ["TicketAcceptedBy", "TEXT NOT NULL DEFAULT ''"],
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
  notifications: [
    ["UserID", "TEXT NOT NULL DEFAULT ''"],
    ["EngineerID", "TEXT NOT NULL DEFAULT ''"],
    ["Role", "TEXT NOT NULL DEFAULT ''"],
    ["URL", "TEXT NOT NULL DEFAULT ''"],
    ["ReadAt", "TEXT NOT NULL DEFAULT ''"],
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

await client.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (UserID)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_notifications_engineer ON notifications (EngineerID)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications (Role)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_leave_requests_engineer ON leave_requests (EngineerID)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests (Status)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_leave_requests_date ON leave_requests (LeaveDate)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_planned_visits_date ON planned_visits (VisitDate)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_planned_visits_engineer ON planned_visits (AssignedEngineer)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_planned_visits_customer ON planned_visits (CustomerID)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_customer_visit_rules_customer ON customer_visit_rules (CustomerID)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_customer_visit_rules_engineer ON customer_visit_rules (AssignedEngineer)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_previousrecords_customer_device ON previousrecords (name_of_customer, device)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_previousrecords_date ON previousrecords (date)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_service_center_movements_installation ON service_center_movements (InstallationID)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_service_center_movements_status ON service_center_movements (Status)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_service_center_tasks_movement ON service_center_tasks (MovementID)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_service_center_tasks_engineer ON service_center_tasks (EngineerID)");
await client.execute("CREATE INDEX IF NOT EXISTS idx_service_center_tasks_status ON service_center_tasks (Status)");

await client.execute("UPDATE tickets SET TicketStatus = 'Closed' WHERE TicketStatus IN ('Resolved', 'Closed')");
await client.execute("UPDATE tickets SET TicketStatus = 'Pending' WHERE TicketStatus <> 'Closed'");
await client.execute("UPDATE ticket_logs SET Status = 'Closed' WHERE Status IN ('Resolved', 'Closed')");
await client.execute("UPDATE ticket_logs SET Status = 'Pending' WHERE Status <> 'Closed'");

console.log("Turso schema migration completed.");
