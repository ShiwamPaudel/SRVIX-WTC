import "server-only";

import { machineCoverage } from "@/lib/coverage";
import { turso } from "@/lib/turso/client";
import type {
  AppUser,
  ContractRecord,
  CustomerVisitRule,
  Customer,
  DeviceModel,
  Engineer,
  EngineerLocationLog,
  Installation,
  LeaveRequest,
  Machine,
  NotificationRecord,
  PlannedVisit,
  PMSSchedule,
  PushSubscriptionRecord,
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
  | "notifications"
  | "push_subscriptions"
  | "leave_requests"
  | "planned_visits"
  | "customer_visit_rules";

type DbRecord = Record<string, unknown>;
type CachedValue = { expiresAt: number; value: unknown };

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
    "TicketAcceptedAt",
    "TicketAcceptedBy",
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
    "UserID",
    "EngineerID",
    "Role",
    "Subject",
    "Message",
    "URL",
    "Status",
    "CreatedAt",
    "SentAt",
    "ReadAt",
  ],
  push_subscriptions: [
    "SubscriptionID",
    "UserID",
    "EngineerID",
    "Role",
    "Endpoint",
    "P256DH",
    "AuthSecret",
    "UserAgent",
    "CreatedAt",
    "LastSeenAt",
  ],
  planned_visits: [
    "PlanID",
    "PlanType",
    "CustomerID",
    "MachineID",
    "PMSID",
    "TicketID",
    "AssignedEngineer",
    "VisitDate",
    "Status",
    "Remarks",
    "CreatedBy",
    "CreatedAt",
    "UpdatedAt",
  ],
  customer_visit_rules: [
    "RuleID",
    "CustomerID",
    "FrequencyDays",
    "AssignedEngineer",
    "StartDate",
    "LastGeneratedDate",
    "ActiveStatus",
    "Remarks",
    "CreatedAt",
    "UpdatedAt",
  ],
  leave_requests: [
    "LeaveRequestID",
    "EngineerID",
    "EngineerName",
    "RequestedByUserID",
    "LeaveDate",
    "Reason",
    "Status",
    "ReviewedBy",
    "ReviewReason",
    "CreatedAt",
    "ReviewedAt",
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
  push_subscriptions: "SubscriptionID",
  leave_requests: "LeaveRequestID",
  planned_visits: "PlanID",
  customer_visit_rules: "RuleID",
} satisfies Record<TableName, string>;

const READ_CACHE_TTL_MS = 5000;
const READ_CACHE_MAX_ENTRIES = 80;
const readCache = new Map<string, CachedValue>();

const nonCachedTables = new Set<TableName>(["users", "push_subscriptions"]);

function cloneRecord<T>(value: T) {
  if (!value || typeof value !== "object") return value;
  return { ...(value as Record<string, unknown>) } as T;
}

function cacheKey(sql: string, args: unknown[] = []) {
  return JSON.stringify([sql, args]);
}

function getCached<T>(key: string) {
  const cached = readCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    readCache.delete(key);
    return undefined;
  }
  if (Array.isArray(cached.value)) return cached.value.map((row) => cloneRecord(row)) as T;
  return cloneRecord(cached.value as T);
}

function setCached(key: string, value: unknown) {
  if (readCache.size >= READ_CACHE_MAX_ENTRIES) {
    const oldestKey = readCache.keys().next().value;
    if (oldestKey) readCache.delete(oldestKey);
  }
  readCache.set(key, {
    expiresAt: Date.now() + READ_CACHE_TTL_MS,
    value: Array.isArray(value) ? value.map((row) => cloneRecord(row)) : cloneRecord(value),
  });
}

function clearReadCache() {
  readCache.clear();
}

function quote(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function tableColumns(table: TableName) {
  return columns[table];
}

function tableColumn(table: TableName, column: string) {
  if (!tableColumns(table).includes(column)) {
    throw new Error(`Invalid column ${column} for ${table}`);
  }
  return column;
}

function rowToRecord(table: TableName, row: DbRecord) {
  return tableColumns(table).reduce<DbRecord>((record, column) => {
    record[column] = row[column] == null ? "" : String(row[column]);
    return record;
  }, {});
}

async function readTable<T>(table: TableName, orderBy?: string) {
  const orderColumn = orderBy ? tableColumn(table, orderBy) : "";
  const sql = `SELECT ${tableColumns(table).map(quote).join(", ")} FROM ${table}${
    orderColumn ? ` ORDER BY ${quote(orderColumn)}` : ""
  }`;
  const key = cacheKey(sql);
  if (!nonCachedTables.has(table)) {
    const cached = getCached<T[]>(key);
    if (cached) return cached;
  }
  const result = await turso.execute(sql);
  const rows = result.rows.map((row) => rowToRecord(table, row as DbRecord)) as T[];
  if (!nonCachedTables.has(table)) setCached(key, rows);
  return rows.map((row) => cloneRecord(row));
}

async function readById<T>(table: TableName, id: string) {
  const idColumn = idColumns[table];
  const sql = `SELECT ${tableColumns(table).map(quote).join(", ")} FROM ${table} WHERE ${quote(idColumn)} = ? LIMIT 1`;
  const args = [id];
  const key = cacheKey(sql, args);
  if (!nonCachedTables.has(table)) {
    const cached = getCached<T | undefined>(key);
    if (cached !== undefined) return cached;
  }
  const result = await turso.execute({
    sql,
    args,
  });
  const row = result.rows[0];
  const record = row ? (rowToRecord(table, row as DbRecord) as T) : undefined;
  if (!nonCachedTables.has(table)) setCached(key, record);
  return record ? cloneRecord(record) : undefined;
}

async function readWhere<T>(table: TableName, column: string, value: string, orderBy?: string) {
  const whereColumn = tableColumn(table, column);
  const orderColumn = orderBy ? tableColumn(table, orderBy) : "";
  const sql = `SELECT ${tableColumns(table).map(quote).join(", ")} FROM ${table} WHERE ${quote(whereColumn)} = ?${
    orderColumn ? ` ORDER BY ${quote(orderColumn)}` : ""
  }`;
  const args = [value];
  const key = cacheKey(sql, args);
  if (!nonCachedTables.has(table)) {
    const cached = getCached<T[]>(key);
    if (cached) return cached;
  }
  const result = await turso.execute({ sql, args });
  const rows = result.rows.map((row) => rowToRecord(table, row as DbRecord)) as T[];
  if (!nonCachedTables.has(table)) setCached(key, rows);
  return rows.map((row) => cloneRecord(row));
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

  clearReadCache();
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
    clearReadCache();
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
  clearReadCache();
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

function installationToMachine(record: Installation, model?: DeviceModel, contracts: ContractRecord[] = []) {
  const coverage = machineCoverage(record.WarrantyExpiry, contracts);

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
    ContractType: coverage.contractType,
    ContractStart: coverage.startDate || record.InstallationDate,
    ContractEnd: coverage.endDate || record.WarrantyExpiry,
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
    const [installations, models, contracts] = await Promise.all([this.installations(), this.deviceModels(), this.contracts()]);
    const contractsByInstallation = contracts.reduce<Map<string, ContractRecord[]>>((grouped, contract) => {
      const group = grouped.get(contract.InstallationID) ?? [];
      group.push(contract);
      grouped.set(contract.InstallationID, group);
      return grouped;
    }, new Map());

    return installations.map((installation) =>
      installationToMachine(
        installation,
        models.find((model) => model.ModelID === installation.ModelID || model.Model === installation.Model),
        contractsByInstallation.get(installation.InstallationID) ?? [],
      ),
    );
  },
  async tickets() {
    const rows = await readTable<Ticket>("tickets", "LastUpdated");
    return rows.map((row) => normalizeTicket(row));
  },
  async ticket(ticketId: string) {
    const row = await readById<Ticket>("tickets", ticketId);
    return row ? normalizeTicket(row) : undefined;
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
  async ticketLogsForTicket(ticketId: string) {
    return readWhere<TicketLog>("ticket_logs", "TicketID", ticketId, "UpdateDate");
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
  async notification(notificationId: string) {
    return readById<NotificationRecord>("notifications", notificationId);
  },
  async updateNotification(notificationId: string, patch: Partial<NotificationRecord>) {
    return updateRecord<NotificationRecord>("notifications", notificationId, patch);
  },
  async leaveRequests() {
    return readTable<LeaveRequest>("leave_requests", "CreatedAt");
  },
  async leaveRequest(leaveRequestId: string) {
    return readById<LeaveRequest>("leave_requests", leaveRequestId);
  },
  async createLeaveRequest(request: LeaveRequest) {
    return insertRecord<LeaveRequest>("leave_requests", request);
  },
  async updateLeaveRequest(leaveRequestId: string, patch: Partial<LeaveRequest>) {
    return updateRecord<LeaveRequest>("leave_requests", leaveRequestId, patch);
  },
  async pushSubscriptions() {
    return readTable<PushSubscriptionRecord>("push_subscriptions", "LastSeenAt");
  },
  async plannedVisits() {
    return readTable<PlannedVisit>("planned_visits", "VisitDate");
  },
  async plannedVisit(planId: string) {
    return readById<PlannedVisit>("planned_visits", planId);
  },
  async createPlannedVisit(plan: PlannedVisit) {
    return insertRecord<PlannedVisit>("planned_visits", plan);
  },
  async updatePlannedVisit(planId: string, patch: Partial<PlannedVisit>) {
    return updateRecord<PlannedVisit>("planned_visits", planId, patch);
  },
  async customerVisitRules() {
    return readTable<CustomerVisitRule>("customer_visit_rules", "StartDate");
  },
  async customerVisitRule(ruleId: string) {
    return readById<CustomerVisitRule>("customer_visit_rules", ruleId);
  },
  async createCustomerVisitRule(rule: CustomerVisitRule) {
    return insertRecord<CustomerVisitRule>("customer_visit_rules", rule);
  },
  async updateCustomerVisitRule(ruleId: string, patch: Partial<CustomerVisitRule>) {
    return updateRecord<CustomerVisitRule>("customer_visit_rules", ruleId, patch);
  },
  async deleteCustomerVisitRule(ruleId: string) {
    await deleteRecord("customer_visit_rules", ruleId);
  },
  async pushSubscriptionsForUser(userId: string) {
    return readWhere<PushSubscriptionRecord>("push_subscriptions", "UserID", userId, "LastSeenAt");
  },
  async pushSubscriptionsForEngineer(engineerId: string) {
    return readWhere<PushSubscriptionRecord>("push_subscriptions", "EngineerID", engineerId, "LastSeenAt");
  },
  async pushSubscriptionsForRole(role: string) {
    return readWhere<PushSubscriptionRecord>("push_subscriptions", "Role", role, "LastSeenAt");
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
  async upsertPushSubscription(subscription: PushSubscriptionRecord) {
    const existing = await turso.execute({
      sql: `SELECT ${quote("SubscriptionID")} FROM push_subscriptions WHERE ${quote("Endpoint")} = ? LIMIT 1`,
      args: [subscription.Endpoint],
    });
    const existingId = existing.rows[0]?.SubscriptionID ? String(existing.rows[0].SubscriptionID) : "";

    if (existingId) {
      return updateRecord<PushSubscriptionRecord>("push_subscriptions", existingId, {
        UserID: subscription.UserID,
        EngineerID: subscription.EngineerID,
        Role: subscription.Role,
        P256DH: subscription.P256DH,
        AuthSecret: subscription.AuthSecret,
        UserAgent: subscription.UserAgent,
        LastSeenAt: subscription.LastSeenAt,
      });
    }

    return insertRecord<PushSubscriptionRecord>("push_subscriptions", subscription);
  },
  async deletePushSubscription(endpoint: string) {
    await turso.execute({
      sql: `DELETE FROM push_subscriptions WHERE ${quote("Endpoint")} = ?`,
      args: [endpoint],
    });
  },
};
