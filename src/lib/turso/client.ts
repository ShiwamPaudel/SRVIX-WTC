import "server-only";

import { createClient } from "@tursodatabase/serverless/compat";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for Turso database access`);
  }
  return value;
}

export const turso = createClient({
  url: requireEnv("TURSO_DATABASE_URL"),
  authToken: requireEnv("TURSO_AUTH_TOKEN"),
});
