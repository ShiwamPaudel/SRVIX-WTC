import "server-only";

import { machineCoverage } from "@/lib/coverage";
import { compactId, uniqueCompactId } from "@/lib/utils";
import { dataService } from "@/lib/turso/service";
import { notifyEngineerTicketAssigned } from "@/lib/push-notifications";
import type { Customer, Machine, PlannedVisit, Ticket } from "@/types/service";

export const plannerScheduledResponse = "Planner scheduled for 9 AM NPT";
export const plannerActiveResponse = "Planner activated";

function nepalTimeParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

export function plannerActivationDue(visitDate: string, now = new Date()) {
  const nepal = nepalTimeParts(now);
  return visitDate < nepal.date || (visitDate === nepal.date && nepal.minutes >= 9 * 60);
}

function customerName(customer?: Customer, fallback = "") {
  return customer?.NameOfCustomer || customer?.HospitalName || fallback;
}

function plannedTicketTitle(customer?: Customer, machine?: Machine) {
  const name = customerName(customer, "customer");
  const device = machine ? [machine.DeviceName, machine.Model, machine.SerialNumber].filter(Boolean).join(" - ") : "";
  return `Planned visit - ${name}${device ? ` (${device})` : ""}`;
}

export function buildPlannerTicket({
  plan,
  customer,
  machine,
  contracts,
  existingTickets,
  openedBy,
  active,
}: {
  plan: PlannedVisit;
  customer?: Customer;
  machine?: Machine;
  contracts: Awaited<ReturnType<typeof dataService.contracts>>;
  existingTickets: Ticket[];
  openedBy: string;
  active: boolean;
}): Ticket {
  const coverage = machineCoverage(
    machine?.WarrantyExpiry ?? "",
    contracts.filter((contract) => contract.InstallationID === machine?.InstallationID),
  );
  const now = new Date().toISOString();
  const title = plannedTicketTitle(customer, machine);

  return {
    TicketID: uniqueCompactId("TKT", existingTickets.map((ticket) => ticket.TicketID)),
    TicketDate: plan.VisitDate,
    Date: plan.VisitDate,
    CustomerID: plan.CustomerID,
    NameOfCustomer: customerName(customer, plan.CustomerID),
    MachineID: plan.MachineID || machine?.MachineID || "",
    InstallationID: plan.MachineID || machine?.InstallationID || "",
    Model: machine?.Model ?? "",
    TicketTitle: title,
    ProblemDescription: plan.Remarks || `Planner visit scheduled for ${plan.VisitDate}.`,
    Description: plan.Remarks || `Planner visit scheduled for ${plan.VisitDate}.`,
    ServiceType: "General Visit",
    Priority: "Medium",
    ContractType: coverage.contractType,
    WarrantyStatus: coverage.warrantyStatus,
    AssignedEngineer: plan.AssignedEngineer,
    TicketAcceptedAt: "",
    TicketAcceptedBy: "",
    AssistedBy: "",
    TicketStatus: "Pending",
    ResponseType: active ? plannerActiveResponse : plannerScheduledResponse,
    OpenedBy: openedBy,
    EngineerRemarks: "",
    Resolution: "",
    VisitDate: plan.VisitDate,
    CompletionDate: "",
    CustomerSignatureURL: "",
    AttachmentURLs: "",
    ClosureStatus: "Pending",
    Latitude: customer?.Latitude || "",
    Longitude: customer?.Longitude || "",
    LastUpdated: now,
    PMSID: "",
    PMSNumber: "",
  };
}

export async function createPlannerTicket(ticket: Ticket, notifyNow: boolean) {
  await dataService.createTicket(ticket);
  await dataService.createTicketLog({
    LogID: compactId("LOG"),
    TicketID: ticket.TicketID,
    UpdatedBy: ticket.OpenedBy || "System",
    UpdateDate: new Date().toISOString(),
    Status: ticket.TicketStatus,
    Remarks: notifyNow ? "Planner ticket created and activated" : "Planner ticket scheduled for 9 AM NPT activation",
    AttachmentURL: "",
    Latitude: ticket.Latitude,
    Longitude: ticket.Longitude,
  });

  if (notifyNow) {
    await notifyEngineerTicketAssigned(ticket).catch((error) => console.warn("Planner ticket notification failed", error));
  }
}

export async function activateDuePlannerTickets(now = new Date()) {
  const [plans, tickets] = await Promise.all([dataService.plannedVisits(), dataService.tickets()]);
  const ticketsById = new Map(tickets.map((ticket) => [ticket.TicketID, ticket]));
  const dueTickets = plans
    .filter((plan) => plan.TicketID && plan.Status !== "Cancelled" && plannerActivationDue(plan.VisitDate, now))
    .map((plan) => ticketsById.get(plan.TicketID))
    .filter((ticket): ticket is Ticket => Boolean(ticket && ticket.ResponseType === plannerScheduledResponse));

  await Promise.allSettled(
    dueTickets.map(async (ticket) => {
      await notifyEngineerTicketAssigned(ticket);
      const activated = await dataService.updateTicket(ticket.TicketID, {
        ResponseType: plannerActiveResponse,
      });
      await dataService.createTicketLog({
        LogID: compactId("LOG"),
        TicketID: ticket.TicketID,
        UpdatedBy: "System",
        UpdateDate: new Date().toISOString(),
        Status: activated.TicketStatus,
        Remarks: "Planner ticket activated at 9 AM NPT",
        AttachmentURL: "",
        Latitude: activated.Latitude,
        Longitude: activated.Longitude,
      });
    }),
  );

  return dueTickets.length;
}
