import "server-only";

import { machineCoverage } from "@/lib/coverage";
import { notifyEngineerTicketAssigned } from "@/lib/push-notifications";
import { dataService } from "@/lib/turso/service";
import { APP_TIME_ZONE, compactId, uniqueCompactId } from "@/lib/utils";
import type { ContractRecord, Customer, Machine, PMSSchedule, Ticket } from "@/types/service";

type PMSTicketContext = {
  pmsRows: PMSSchedule[];
  tickets: Ticket[];
  machines: Machine[];
  customers: Customer[];
  contracts: ContractRecord[];
};

type CreatePMSTicketOptions = {
  openedBy?: string;
  logRemarks?: string;
  now?: Date;
};

type PMSTicketResult =
  | { status: "created"; ticket: Ticket; pmsId: string }
  | { status: "existing"; ticket: Ticket; pmsId: string }
  | { status: "skipped"; pmsId: string; reason: string };

function dateKeyInTimeZone(date = new Date(), timeZone = APP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeDateKey(value?: string | Date | null) {
  if (!value) return "";
  if (value instanceof Date) return dateKeyInTimeZone(value);

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateKeyInTimeZone(date);
}

function findMachineForPMS(machines: Machine[], pms: PMSSchedule) {
  return machines.find((item) => item.MachineID === pms.MachineID || item.InstallationID === pms.MachineID);
}

function findCustomerForPMS(customers: Customer[], machine: Machine, pms: PMSSchedule) {
  return customers.find((item) => item.CustomerID === pms.CustomerID || item.CustomerID === machine.CustomerID);
}

async function createTicketFromPMS(
  pms: PMSSchedule,
  context: PMSTicketContext,
  options: CreatePMSTicketOptions = {},
): Promise<PMSTicketResult> {
  const existing = context.tickets.find((ticket) => ticket.TicketID === pms.TicketID || ticket.PMSID === pms.PMSID);
  if (existing) {
    if (pms.TicketID !== existing.TicketID) {
      await dataService.updatePMSSchedule(pms.PMSID, { TicketID: existing.TicketID });
    }
    return { status: "existing", ticket: existing, pmsId: pms.PMSID };
  }

  if (pms.Status === "Completed") {
    return { status: "skipped", pmsId: pms.PMSID, reason: "PMS already completed" };
  }

  const machine = findMachineForPMS(context.machines, pms);
  if (!machine) {
    return { status: "skipped", pmsId: pms.PMSID, reason: "Linked machine was not found" };
  }

  const customer = findCustomerForPMS(context.customers, machine, pms);
  const coverage = machineCoverage(
    machine.WarrantyExpiry,
    context.contracts.filter((contract) => contract.InstallationID === machine.InstallationID),
  );
  const pmsNumber = pms.PMSNumber || "";
  const customerName = customer?.NameOfCustomer || customer?.HospitalName || machine.NameOfCustomer || "";
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const today = dateKeyInTimeZone(now);

  const ticket: Ticket = {
    TicketID: uniqueCompactId("TKT", context.tickets.map((item) => item.TicketID)),
    TicketDate: today,
    Date: today,
    CustomerID: customer?.CustomerID ?? machine.CustomerID,
    NameOfCustomer: customerName,
    MachineID: machine.MachineID,
    InstallationID: machine.InstallationID ?? machine.MachineID,
    Model: machine.Model,
    TicketTitle: `${pmsNumber ? `PMS No. ${pmsNumber}` : "PMS"} - ${machine.Model || machine.DeviceName} at ${customerName || "Customer"}`,
    ProblemDescription: `Scheduled preventive maintenance due on ${pms.DueDate}.`,
    Description: `Scheduled preventive maintenance due on ${pms.DueDate}.`,
    ServiceType: "PMS",
    Priority: "Medium",
    ContractType: coverage.contractType,
    WarrantyStatus: coverage.warrantyStatus,
    AssignedEngineer: pms.AssignedEngineer || "",
    TicketAcceptedAt: "",
    TicketAcceptedBy: "",
    AssistedBy: "",
    TicketStatus: "Pending",
    ResponseType: "Planned visit",
    OpenedBy: options.openedBy ?? "System",
    EngineerRemarks: "",
    Resolution: "",
    VisitDate: pms.DueDate,
    CompletionDate: "",
    CustomerSignatureURL: "",
    AttachmentURLs: "",
    ClosureStatus: "Pending",
    Latitude: customer?.Latitude || "",
    Longitude: customer?.Longitude || "",
    LastUpdated: nowIso,
    PMSID: pms.PMSID,
    PMSNumber: pmsNumber,
  };

  await dataService.createTicket(ticket);
  context.tickets.push(ticket);
  await dataService.updatePMSSchedule(pms.PMSID, {
    TicketID: ticket.TicketID,
    Status: "Scheduled",
  });
  await dataService.createTicketLog({
    LogID: compactId("LOG"),
    TicketID: ticket.TicketID,
    UpdatedBy: options.openedBy ?? "System",
    UpdateDate: nowIso,
    Status: ticket.TicketStatus,
    Remarks: options.logRemarks ?? "PMS ticket created",
    AttachmentURL: "",
    Latitude: ticket.Latitude,
    Longitude: ticket.Longitude,
  });
  if (ticket.AssignedEngineer) {
    await notifyEngineerTicketAssigned(ticket).catch((error) => console.warn("PMS ticket notification failed", error));
  }

  return { status: "created", ticket, pmsId: pms.PMSID };
}

async function loadPMSTicketContext(): Promise<PMSTicketContext> {
  const [pmsRows, tickets, machines, customers, contracts] = await Promise.all([
    dataService.pmsSchedule(),
    dataService.tickets(),
    dataService.machines(),
    dataService.customers(),
    dataService.contracts(),
  ]);

  return { pmsRows, tickets, machines, customers, contracts };
}

export async function createPMSTicket(pmsId: string, options: CreatePMSTicketOptions = {}) {
  const context = await loadPMSTicketContext();
  const pms = context.pmsRows.find((row) => row.PMSID === pmsId);
  if (!pms) return { status: "skipped", pmsId, reason: "PMS row not found" } satisfies PMSTicketResult;
  return createTicketFromPMS(pms, context, options);
}

export async function createDuePMSTickets(options: CreatePMSTicketOptions & { dueDate?: string } = {}) {
  const context = await loadPMSTicketContext();
  const dueDate = options.dueDate ?? dateKeyInTimeZone(options.now ?? new Date());
  const dueRows = context.pmsRows.filter((pms) => normalizeDateKey(pms.DueDate) === dueDate);
  const results: PMSTicketResult[] = [];

  for (const pms of dueRows) {
    results.push(
      await createTicketFromPMS(pms, context, {
        ...options,
        openedBy: options.openedBy ?? "System",
        logRemarks: options.logRemarks ?? "PMS ticket auto-created at 9 AM NPT",
      }),
    );
  }

  return {
    dueDate,
    checked: dueRows.length,
    created: results.filter((result) => result.status === "created").length,
    existing: results.filter((result) => result.status === "existing").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  };
}
