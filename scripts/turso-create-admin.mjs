import { createClient } from "@tursodatabase/serverless/compat";
import { loadLocalEnv, requireEnv } from "./turso-env.mjs";

loadLocalEnv();

const client = createClient({
  url: requireEnv("TURSO_DATABASE_URL"),
  authToken: requireEnv("TURSO_AUTH_TOKEN"),
});

const email = process.env.ADMIN_EMAIL || "admin@wtc.local";
const password = process.env.ADMIN_PASSWORD || "demo123";
const name = process.env.ADMIN_NAME || "WTC Admin";

await client.execute({
  sql: `
    INSERT INTO users (UserID, Name, Email, PasswordHash, Role, EngineerID, ActiveStatus)
    VALUES ('USR-ADMIN', ?, ?, ?, 'Admin', '', 'Active')
    ON CONFLICT(UserID) DO UPDATE SET
      Name = excluded.Name,
      Email = excluded.Email,
      PasswordHash = excluded.PasswordHash,
      Role = excluded.Role,
      ActiveStatus = excluded.ActiveStatus
  `,
  args: [name, email, password],
});

console.log(`Admin user is ready: ${email}`);
