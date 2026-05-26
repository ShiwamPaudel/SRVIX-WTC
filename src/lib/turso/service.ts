import "server-only";

import { turso } from "@/lib/turso/client";
import type {
  AppUser,
  ContractRecord,
  Customer,
  DeviceModel,
  Engineer,
  EngineerLocationLog,
  Installation,
  Machine,
  NotificationRecord,
  PMSSchedule,
  Ticket,
  TicketStatus,
  TicketLog,
} from "@/types/service";

type TableName =
  | "customers"
  | "device_models"
  | "installations"
  | "contracts"
  | "tickets"
  | "engineers"
  | "engineer_location_logs"
  | "ticket_logs"
  | "pms_schedule"
  | "users"
  | "notifications";

type DbRecord = Record<string, unknown>;

const columns = {
  customers: [
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
  device_models: ["ModelID", "BrandName", "Model", "PMSFrequency", "ImageURL"],
  installations: [
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
  contracts: [
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
  tickets: [
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
  engineers: [
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
  engineer_location_logs: [
    "LocationLogID",
    "EngineerID",
    "EngineerName",
    "Latitude",
    "Longitude",
    "Remarks",
    "CreatedAt",
  ],
  ticket_logs: [
    "LogID",
    "TicketID",
    "UpdatedBy",
    "UpdateDate",
    "Status",
    "Remarks",
    "AttachmentURL",
    "Latitude",
    "Longitude",
  ],
  pms_schedule: [
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
  users: ["UserID", "Name", "Email", "PasswordHash", "Role", "EngineerID", "ActiveStatus"],
  notifications: [
    "NotificationID",
    "Type",
    "Recipient",
    "Subject",
    "Message",
    "Status",
    "CreatedAt",
    "SentAt",
  ],
} satisfies Record<TableName, string[]>;

const idColumns = {
  customers: "CustomerID",
  device_models: "ModelID",
  installations: "InstallationID",
  contracts: "ContractID",
  tickets: "TicketID",
  engineers: "EngineerID",
  engineer_location_logs: "LocationLogID",
  ticket_logs: "LogID",
  pms_schedule: "PMSID",
  users: "UserID",
  notifications: "NotificationID",
} satisfies Record<TableName, string>;

function quote(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function tableColumns(table: TableName) {
  return columns[table];
}

function rowToRecord(table: TableName, row: DbRecord) {
  return tableColumns(table).reduce<DbRecord>((record, column) => {
    record[column] = row[column] == null ? "" : String(row[column]);
    return record;
  }, {});
}

async function readTable<T>(table: TableName, orderBy?: string) {
  const sql = `SELECT ${tableColumns(table).map(quote).join(", ")} FROM ${table}${
    orderBy ? ` ORDER BY ${quote(orderBy)}` : ""
  }`;
  const result = await turso.execute(sql);
  return result.rows.map((row) => rowToRecord(table, row as DbRecord)) as T[];
}

async function readById<T>(table: TableName, id: string) {
  const idColumn = idColumns[table];
  const result = await turso.execute({
    sql: `SELECT ${tableColumns(table).map(quote).join(", ")} FROM ${table} WHERE ${quote(idColumn)} = ? LIMIT 1`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? (rowToRecord(table, row as DbRecord) as T) : undefined;
}

async function insertRecord<T>(table: TableName, record: DbRecord) {
  const allowedColumns = tableColumns(table);
  const values = allowedColumns.map((column) => record[column] ?? "");

  await turso.execute({
    sql: `INSERT INTO ${table} (${allowedColumns.map(quote).join(", ")}) VALUES (${allowedColumns
      .map(() => "?")
      .join(", ")})`,
    args: values as string[],
  });

  return record as T;
}

async function updateRecord<T>(table: TableName, id: string, patch: DbRecord) {
  const idColumn = idColumns[table];
  const allowed = new Set(tableColumns(table));
  const entries = Object.entries(patch).filter(([key]) => allowed.has(key) && key !== idColumn);

  if (entries.length) {
    await turso.execute({
      sql: `UPDATE ${table} SET ${entries.map(([key]) => `${quote(key)} = ?`).join(", ")} WHERE ${quote(idColumn)} = ?`,
      args: [...entries.map(([, value]) => value ?? ""), id] as string[],
    });
  }

  const nextRecord = await readById<T>(table, id);
  if (!nextRecord) throw new Error(`${table} row ${id} not found`);
  return nextRecord;
}

async function deleteRecord(table: TableName, id: string) {
  const idColumn = idColumns[table];
  await turso.execute({
    sql: `DELETE FROM ${table} WHERE ${quote(idColumn)} = ?`,
    args: [id],
  });
}

function normalizeCustomer(record: Customer) {
  return {
    ...record,
    HospitalName: record.NameOfCustomer || record.HospitalName || "",
    Department: record.Department ?? "",
    ContactPerson: record.ContactPerson ?? "",
    Phone: record.Phone ?? "",
    Email: record.Email ?? "",
    Latitude: record.Latitude ?? "",
    Longitude: record.Longitude ?? "",
    Remarks: record.Remarks ?? "",
  };
}

function normalizeEngineer(record: Engineer) {
  return {
    ...record,
    EngineerName: record.EngineerName || record["Engineer Name"] || "",
    Department: record.Department ?? "",
    Role: record.Role ?? "",
    LiveLatitude: record.LiveLatitude ?? "",
    LiveLongitude: record.LiveLongitude ?? "",
    LastLocationUpdate: record.LastLocationUpdate ?? "",
  };
}

function installationToMachine(record: Installation, model?: DeviceModel, contractType: string = "Under Warranty") {
  return {
    MachineID: record.InstallationID,
    InstallationID: record.InstallationID,
    CustomerID: record.CustomerID,
    NameOfCustomer: record.NameOfCustomer,
    Department: record.Department,
    DeviceName: model?.Model || record.Model,
    Brand: record.BrandName || model?.BrandName || "",
    BrandName: record.BrandName || model?.BrandName || "",
    ModelID: record.ModelID,
    Model: record.Model || model?.Model || "",
    SerialNumber: record.SerialNumber,
    InstallationDate: record.InstallationDate,
    WarrantyYears: record.WarrantyYears,
    WarrantyExpiry: record.WarrantyExpiry,
    ContractType: contractType,
    ContractStart: record.InstallationDate,
    ContractEnd: record.WarrantyExpiry,
    PMSFrequency: model?.PMSFrequency || "",
    PMSIntervalDays: model?.PMSFrequency || "",
    LastPMS: "",
    NextPMS: "",
    Status: record.Status,
    Remarks: record.Remarks,
    ImageURL: record.ImageURL || model?.ImageURL || "",
  } as Machine;
}

function normalizeTicket(record: Ticket) {
  const rawStatus = String(record.TicketStatus);
  const status: TicketStatus = rawStatus === "Closed" || rawStatus === "Resolved" ? "Closed" : "Pending";
  return {
    ...record,
    TicketStatus: status,
    TicketDate: record.TicketDate || record.Date || "",
    Date: record.Date || record.TicketDate || "",
    CustomerID: record.CustomerID ?? "",
    MachineID: record.MachineID || record.InstallationID || "",
    InstallationID: record.InstallationID || record.MachineID || "",
    TicketTitle: record.TicketTitle ?? "",
    ProblemDescription: record.ProblemDescription || record.Description || "",
    Description: record.Description || record.ProblemDescription || "",
  } as Ticket;
}

export const dataService = {
  isConfigured() {
    return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
  },
  async customers() {
    const rows = await readTable<Customer>("customers", "NameOfCustomer");
    return rows.map((row) => normalizeCustomer(row));
  },
  async deviceModels() {
    return readTable<DeviceModel>("device_models", "BrandName");
  },
  async installations() {
    return readTable<Installation>("installations", "InstallationDate");
  },
  async amcContracts() {
    const contracts = await this.contracts();
    return contracts.filter((contract) => contract.ContractType === "AMC");
  },
  async cmcContracts() {
    const contracts = await this.contracts();
    return contracts.filter((contract) => contract.ContractType === "CMC");
  },
  async rrcContracts() {
    const contracts = await this.contracts();
    return contracts.filter((contract) => contract.ContractType === "RRC");
  },
  async contracts() {
    return readTable<ContractRecord>("contracts", "ContractEnd");
  },
  async machines() {
    const [installations, models] = await Promise.all([this.installations(), this.deviceModels()]);
    return installations.map((installation) =>
      installationToMachine(
        installation,
        models.find((model) => model.ModelID === installation.ModelID || model.Model === installation.Model),
      ),
    );
  },
  async tickets() {
    const rows = await readTable<Ticket>("tickets", "LastUpdated");
    return rows.map((row) => normalizeTicket(row));
  },
  async engineers() {
    const rows = await readTable<Engineer>("engineers", "EngineerName");
    return rows.map((row) => normalizeEngineer(row));
  },
  async engineerLocationLogs() {
    return readTable<EngineerLocationLog>("engineer_location_logs", "CreatedAt");
  },
  async ticketLogs() {
    return readTable<TicketLog>("ticket_logs", "UpdateDate");
  },
  async pmsSchedule() {
    return readTable<PMSSchedule>("pms_schedule", "DueDate");
  },
  async users() {
    return readTable<AppUser>("users", "Email");
  },
  async notifications() {
    return readTable<NotificationRecord>("notifications", "CreatedAt");
  },
  async createTicket(ticket: Ticket) {
    return insertRecord<Ticket>("tickets", ticket);
  },
  async createCustomer(customer: Customer) {
    return insertRecord<Customer>("customers", customer);
  },
  async createDeviceModel(model: DeviceModel) {
    return insertRecord<DeviceModel>("device_models", model);
  },
  async createEngineer(engineer: Engineer) {
    return insertRecord<Engineer>("engineers", engineer);
  },
  async createUser(user: AppUser) {
    return insertRecord<AppUser>("users", user);
  },
  async updateUser(userId: string, patch: Partial<AppUser>) {
    return updateRecord<AppUser>("users", userId, patch);
  },
  async createInstallation(installation: Installation) {
    return insertRecord<Installation>("installations", installation);
  },
  async createContract(contract: ContractRecord) {
    return insertRecord<ContractRecord>("contracts", contract);
  },
  async createMachine(machine: Machine) {
    const installation: Installation = {
      InstallationID: machine.InstallationID || machine.MachineID,
      CustomerID: machine.CustomerID,
      NameOfCustomer: machine.NameOfCustomer ?? "",
      Department: machine.Department ?? "",
      ModelID: machine.ModelID ?? "",
      Model: machine.Model,
      BrandName: machine.Brand,
      SerialNumber: machine.SerialNumber,
      InstallationDate: machine.InstallationDate,
      WarrantyYears: machine.WarrantyYears ?? "",
      WarrantyExpiry: machine.WarrantyExpiry,
      Status: machine.Status,
      Remarks: machine.Remarks,
      ImageURL: machine.ImageURL ?? "",
    };
    await insertRecord<Installation>("installations", installation);
    return machine;
  },
  async createPMSSchedule(pms: PMSSchedule) {
    return insertRecord<PMSSchedule>("pms_schedule", pms);
  },
  async updatePMSSchedule(pmsId: string, patch: Partial<PMSSchedule>) {
    return updateRecord<PMSSchedule>("pms_schedule", pmsId, patch);
  },
  async updateTicket(ticketId: string, patch: Partial<Ticket>) {
    return updateRecord<Ticket>("tickets", ticketId, {
      ...patch,
      LastUpdated: new Date().toISOString(),
    });
  },
  async deleteTicket(ticketId: string) {
    await turso.execute({
      sql: `UPDATE pms_schedule SET ${quote("TicketID")} = ?, ${quote("Status")} = ? WHERE ${quote("TicketID")} = ?`,
      args: ["", "Scheduled", ticketId],
    });
    await turso.execute({
      sql: `DELETE FROM ticket_logs WHERE ${quote("TicketID")} = ?`,
      args: [ticketId],
    });
    await deleteRecord("tickets", ticketId);
  },
  async createTicketLog(log: TicketLog) {
    return insertRecord<TicketLog>("ticket_logs", log);
  },
  async updateEngineerLocation(engineerId: string, latitude: string, longitude: string) {
    return updateRecord<Engineer>("engineers", engineerId, {
      LiveLatitude: latitude,
      LiveLongitude: longitude,
      LastLocationUpdate: new Date().toISOString(),
    });
  },
  async createEngineerLocationLog(log: EngineerLocationLog) {
    return insertRecord<EngineerLocationLog>("engineer_location_logs", log);
  },
  async createNotification(notification: NotificationRecord) {
    return insertRecord<NotificationRecord>("notifications", notification);
  },
};
