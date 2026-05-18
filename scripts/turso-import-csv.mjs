import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@tursodatabase/serverless/compat";
import { loadLocalEnv, requireEnv } from "./turso-env.mjs";

loadLocalEnv();

const client = createClient({
  url: requireEnv("TURSO_DATABASE_URL"),
  authToken: requireEnv("TURSO_AUTH_TOKEN"),
});

const importDir = resolve(process.cwd(), "data/import");

const imports = [
  {
    table: "customers",
    primaryKey: "CustomerID",
    files: ["Customers.csv", "customers.csv"],
    columns: [
      "CustomerID",
      "NameOfCustomer",
      "Province",
      "District",
      "Address",
      "CustomerType",
      "HospitalName",
      "Department",
      "ContactPerson",
      "Phone",
      "Email",
      "Latitude",
      "Longitude",
      "Remarks",
    ],
  },
  {
    table: "device_models",
    primaryKey: "ModelID",
    files: ["DeviceModels.csv", "device-models.csv", "device_models.csv"],
    columns: ["ModelID", "BrandName", "Model", "PMSFrequency", "ImageURL"],
  },
  {
    table: "installations",
    primaryKey: "InstallationID",
    files: ["Installations.csv", "installations.csv"],
    columns: [
      "InstallationID",
      "CustomerID",
      "NameOfCustomer",
      "Department",
      "ModelID",
      "Model",
      "BrandName",
      "SerialNumber",
      "InstallationDate",
      "WarrantyYears",
      "WarrantyExpiry",
      "Status",
      "Remarks",
      "ImageURL",
    ],
  },
  {
    table: "contracts",
    primaryKey: "ContractID",
    files: ["AMCContracts.csv", "amc-contracts.csv", "amc_contracts.csv"],
    constantValues: { ContractType: "AMC" },
    columns: [
      "ContractID",
      "InstallationID",
      "NameOfCustomer",
      "Model",
      "SerialNumber",
      "ContractStart",
      "ContractEnd",
      "RenewalYears",
      "Status",
      "Remarks",
      "ContractType",
    ],
  },
  {
    table: "contracts",
    primaryKey: "ContractID",
    files: ["CMCContracts.csv", "cmc-contracts.csv", "cmc_contracts.csv"],
    constantValues: { ContractType: "CMC" },
    columns: [
      "ContractID",
      "InstallationID",
      "NameOfCustomer",
      "Model",
      "SerialNumber",
      "ContractStart",
      "ContractEnd",
      "RenewalYears",
      "Status",
      "Remarks",
      "ContractType",
    ],
  },
  {
    table: "contracts",
    primaryKey: "ContractID",
    files: ["RRCContracts.csv", "rrc-contracts.csv", "rrc_contracts.csv"],
    constantValues: { ContractType: "RRC", RenewalYears: "" },
    columns: [
      "ContractID",
      "InstallationID",
      "NameOfCustomer",
      "Model",
      "SerialNumber",
      "ContractStart",
      "ContractEnd",
      "RenewalYears",
      "Status",
      "Remarks",
      "ContractType",
    ],
  },
  {
    table: "tickets",
    primaryKey: "TicketID",
    files: ["Tickets.csv", "tickets.csv"],
    normalize: (record) => ({
      ...record,
      TicketDate: record.TicketDate || record.Date || "",
      CustomerID: record.CustomerID || "",
      MachineID: record.MachineID || record.InstallationID || "",
      ProblemDescription: record.ProblemDescription || record.Description || "",
    }),
    columns: [
      "TicketID",
      "TicketDate",
      "Date",
      "CustomerID",
      "NameOfCustomer",
      "MachineID",
      "InstallationID",
      "Model",
      "TicketTitle",
      "ProblemDescription",
      "Description",
      "ServiceType",
      "Priority",
      "ContractType",
      "WarrantyStatus",
      "AssignedEngineer",
      "AssistedBy",
      "TicketStatus",
      "ResponseType",
      "OpenedBy",
      "EngineerRemarks",
      "Resolution",
      "VisitDate",
      "CompletionDate",
      "CustomerSignatureURL",
      "AttachmentURLs",
      "ClosureStatus",
      "Latitude",
      "Longitude",
      "LastUpdated",
      "PMSID",
      "PMSNumber",
    ],
  },
  {
    table: "engineers",
    primaryKey: "EngineerID",
    files: ["Engineers.csv", "engineers.csv"],
    normalize: (record) => ({
      ...record,
      EngineerName: record.EngineerName || record["Engineer Name"] || "",
    }),
    columns: [
      "EngineerID",
      "EngineerName",
      "Phone",
      "Email",
      "Department",
      "Role",
      "ActiveStatus",
      "LiveLatitude",
      "LiveLongitude",
      "LastLocationUpdate",
    ],
  },
  {
    table: "ticket_logs",
    primaryKey: "LogID",
    files: ["TicketLogs.csv", "ticket-logs.csv", "ticket_logs.csv"],
    columns: ["LogID", "TicketID", "UpdatedBy", "UpdateDate", "Status", "Remarks", "AttachmentURL", "Latitude", "Longitude"],
  },
  {
    table: "pms_schedule",
    primaryKey: "PMSID",
    files: ["PMSSchedule.csv", "pms-schedule.csv", "pms_schedule.csv"],
    columns: [
      "PMSID",
      "PMSNumber",
      "MachineID",
      "CustomerID",
      "DueDate",
      "AssignedEngineer",
      "Status",
      "CompletionDate",
      "Remarks",
      "TicketID",
    ],
  },
  {
    table: "users",
    primaryKey: "UserID",
    files: ["Users.csv", "users.csv"],
    columns: ["UserID", "Name", "Email", "PasswordHash", "Role", "EngineerID", "ActiveStatus"],
  },
  {
    table: "notifications",
    primaryKey: "NotificationID",
    files: ["Notifications.csv", "notifications.csv"],
    columns: ["NotificationID", "Type", "Recipient", "Subject", "Message", "Status", "CreatedAt", "SentAt"],
  },
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  if (!rows.length) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) =>
    headers.reduce((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {}),
  );
}

function quote(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function findFile(candidates) {
  if (!existsSync(importDir)) return null;
  const available = new Set(readdirSync(importDir));
  return candidates.find((candidate) => available.has(candidate)) || null;
}

async function upsertRows(config, rows) {
  const updateColumns = config.columns.filter((column) => column !== config.primaryKey);
  const sql = `
    INSERT INTO ${config.table} (${config.columns.map(quote).join(", ")})
    VALUES (${config.columns.map(() => "?").join(", ")})
    ON CONFLICT(${quote(config.primaryKey)}) DO UPDATE SET
      ${updateColumns.map((column) => `${quote(column)} = excluded.${quote(column)}`).join(", ")}
  `;

  for (const row of rows) {
    let record = { ...row, ...(config.constantValues || {}) };
    if (config.normalize) record = config.normalize(record);
    const args = config.columns.map((column) => record[column] ?? "");
    await client.execute({ sql, args });
  }
}

if (!existsSync(importDir)) {
  throw new Error("Create data/import and place exported CSV files there before running this script.");
}

let imported = 0;

for (const config of imports) {
  const file = findFile(config.files);
  if (!file) continue;

  const rows = parseCsv(readFileSync(resolve(importDir, file), "utf8"));
  await upsertRows(config, rows);
  imported += rows.length;
  console.log(`Imported ${rows.length} rows from ${file}`);
}

console.log(`CSV import completed. Total rows imported: ${imported}`);
