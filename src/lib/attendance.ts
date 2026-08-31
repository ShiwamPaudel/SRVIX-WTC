import "server-only";

import { machineLabel } from "@/lib/service-center";
import { dataService } from "@/lib/turso/service";
import { APP_TIME_ZONE, toDateInputValue } from "@/lib/utils";

export type AttendanceEngineer = {
  id: string;
  name: string;
  department?: string;
};

export type AttendanceEvent = {
  engineerId: string;
  date: string;
  sortAt?: string;
  type: "Ticket" | "Location" | "Leave" | "Service Center";
  detail: string;
};

const dateInputPattern = /^\d{4}-\d{2}-\d{2}$/;

function appDateFromParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function dayKey(value?: string) {
  if (!value) return "";
  if (dateInputPattern.test(value)) return value;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return appDateFromParts(date);
  return value.slice(0, 10);
}

export function todayInAppTimeZone() {
  return appDateFromParts(new Date());
}

export function monthStartInAppTimeZone() {
  const today = todayInAppTimeZone();
  return `${today.slice(0, 8)}01`;
}

export function validReportDate(value?: string | null) {
  const date = String(value ?? "").trim();
  return dateInputPattern.test(date) ? date : todayInAppTimeZone();
}

export function dateForReportLabel(dateInput: string, options: { weekday?: boolean } = {}) {
  const date = new Date(`${dateInput}T00:00:00+05:45`);
  if (Number.isNaN(date.getTime())) return dateInput;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(options.weekday ? { weekday: "long" as const } : {}),
  }).format(date);
}

export function eventTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function eventTimeLabel(value?: string) {
  if (!value || !value.includes(":")) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function eventDescription(event: AttendanceEvent) {
  const time = eventTimeLabel(event.sortAt);
  return `${event.type} - ${event.detail}${time ? ` (${time})` : ""}`;
}

export function eventsByCell(events: AttendanceEvent[]) {
  const map = new Map<string, AttendanceEvent[]>();
  events.forEach((event) => {
    const key = `${event.date}:${event.engineerId}`;
    map.set(key, [...(map.get(key) ?? []), event]);
  });
  map.forEach((cellEvents) => {
    cellEvents.sort((a, b) => eventTime(a.sortAt) - eventTime(b.sortAt));
  });
  return map;
}

export function dateRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export async function attendanceReportData(allowedEngineerIds?: Set<string>) {
  const [customers, engineers, machines, tickets, ticketLogs, locationLogs, leaveRequests, serviceCenterTasks] = await Promise.all([
    dataService.customers(),
    dataService.engineers(),
    dataService.machines(),
    dataService.tickets(),
    dataService.ticketLogs(),
    dataService.engineerLocationLogs(),
    dataService.leaveRequests(),
    dataService.serviceCenterTasks(),
  ]);
  const engineerIds = allowedEngineerIds ?? new Set(engineers.map((engineer) => engineer.EngineerID));
  const customerById = new Map(customers.map((customer) => [customer.CustomerID, customer]));
  const machineById = new Map(
    machines.flatMap((machine) =>
      [machine.MachineID, machine.InstallationID].filter(Boolean).map((id) => [id, machine] as const),
    ),
  );
  const closedAtByTicketId = ticketLogs
    .filter((log) => log.Status === "Closed" && log.UpdateDate)
    .reduce<Map<string, string>>((closedAtByTicket, log) => {
      const previous = closedAtByTicket.get(log.TicketID);
      if (!previous || new Date(log.UpdateDate).getTime() < new Date(previous).getTime()) {
        closedAtByTicket.set(log.TicketID, log.UpdateDate);
      }
      return closedAtByTicket;
    }, new Map());

  const visibleEngineers = engineers
    .filter((engineer) => engineerIds.has(engineer.EngineerID))
    .map((engineer) => ({
      id: engineer.EngineerID,
      name: engineer.EngineerName,
      department: engineer.Department,
    }));

  const events: AttendanceEvent[] = [
    ...tickets
      .filter((ticket) => ticket.AssignedEngineer && ticket.TicketAcceptedAt && engineerIds.has(ticket.AssignedEngineer))
      .map((ticket) => {
        const customerName = customerById.get(ticket.CustomerID)?.HospitalName || ticket.NameOfCustomer || "Customer not linked";
        return {
          engineerId: ticket.AssignedEngineer,
          date: dayKey(ticket.TicketAcceptedAt),
          sortAt: ticket.TicketAcceptedAt,
          type: "Ticket" as const,
          detail: `${customerName}${ticket.TicketTitle ? ` - ${ticket.TicketTitle}` : ""} accepted`,
        };
      }),
    ...tickets
      .filter((ticket) => ticket.AssignedEngineer && ticket.TicketStatus === "Closed" && engineerIds.has(ticket.AssignedEngineer))
      .map((ticket) => {
        const closedAt = closedAtByTicketId.get(ticket.TicketID) || ticket.LastUpdated || ticket.CompletionDate;
        const customerName = customerById.get(ticket.CustomerID)?.HospitalName || ticket.NameOfCustomer || "Customer not linked";
        return {
          engineerId: ticket.AssignedEngineer,
          date: dayKey(closedAt),
          sortAt: closedAt,
          type: "Ticket" as const,
          detail: `${customerName}${ticket.TicketTitle ? ` - ${ticket.TicketTitle}` : ""} Closed`,
        };
      }),
    ...locationLogs
      .filter((log) => engineerIds.has(log.EngineerID))
      .map((log) => ({
        engineerId: log.EngineerID,
        date: dayKey(log.CreatedAt),
        sortAt: log.CreatedAt,
        type: "Location" as const,
        detail: log.Remarks || "Location submitted",
      })),
    ...serviceCenterTasks
      .filter((task) => task.Status === "Closed" && task.ClosedAt && engineerIds.has(task.EngineerID))
      .map((task) => ({
        engineerId: task.EngineerID,
        date: dayKey(task.ClosedAt),
        sortAt: task.ClosedAt,
        type: "Service Center" as const,
        detail: `Worked on ${machineLabel(machineById.get(task.InstallationID))} at Service Center`,
      })),
    ...leaveRequests
      .filter((request) => request.Status === "Approved" && engineerIds.has(request.EngineerID))
      .map((request) => ({
        engineerId: request.EngineerID,
        date: request.LeaveDate,
        sortAt: request.LeaveDate,
        type: "Leave" as const,
        detail: request.ReviewReason || request.Reason || "Approved leave",
      })),
  ].filter((event) => event.date);

  return { engineers: visibleEngineers, events };
}
