import "server-only";

import { dataService } from "@/lib/turso/service";
import type { TicketWithRelations, UserRole } from "@/types/service";

export async function getServiceDataset() {
  const [customers, deviceModels, installations, contracts, machines, tickets, engineers, logs, pmsSchedule, notifications, locationLogs] =
    await Promise.all([
      dataService.customers(),
      dataService.deviceModels(),
      dataService.installations(),
      dataService.contracts(),
      dataService.machines(),
      dataService.tickets(),
      dataService.engineers(),
      dataService.ticketLogs(),
      dataService.pmsSchedule(),
      dataService.notifications(),
      dataService.engineerLocationLogs(),
    ]);

  return { customers, deviceModels, installations, contracts, machines, tickets, engineers, logs, pmsSchedule, notifications, locationLogs };
}

export async function getTicketsWithRelations(role?: UserRole, engineerId?: string) {
  const { customers, machines, tickets, engineers, logs } = await getServiceDataset();
  const allowedTickets =
    role === "Engineer" && engineerId
      ? tickets.filter((ticket) => ticket.AssignedEngineer === engineerId)
      : tickets;

  return allowedTickets.map<TicketWithRelations>((ticket) => ({
    ...ticket,
    customer: customers.find(
      (customer) =>
        customer.CustomerID === ticket.CustomerID ||
        customer.NameOfCustomer === ticket.NameOfCustomer ||
        customer.HospitalName === ticket.NameOfCustomer,
    ),
    machine: machines.find((machine) => machine.MachineID === ticket.MachineID || machine.InstallationID === ticket.InstallationID),
    engineer: engineers.find((engineer) => engineer.EngineerID === ticket.AssignedEngineer),
    logs: logs.filter((log) => log.TicketID === ticket.TicketID),
  }));
}

export async function getTicket(ticketId: string) {
  const tickets = await getTicketsWithRelations();
  return tickets.find((ticket) => ticket.TicketID === ticketId);
}

export async function getDashboardMetrics() {
  const dataset = await getServiceDataset();
  const open = dataset.tickets.filter((ticket) => ticket.TicketStatus !== "Closed").length;
  const closed = dataset.tickets.filter((ticket) => ticket.TicketStatus === "Closed").length;
  const pendingPms = dataset.pmsSchedule.filter((pms) => pms.Status !== "Completed").length;
  const activeEngineers = dataset.engineers.filter((engineer) => engineer.ActiveStatus !== "Inactive").length;
  const critical = dataset.tickets.filter((ticket) => ticket.Priority === "Critical").length;
  const datedClosedTickets = dataset.tickets.filter((ticket) => ticket.TicketStatus === "Closed" && ticket.TicketDate);
  const inSla = datedClosedTickets.filter((ticket) => {
    const openedAt = new Date(`${ticket.TicketDate}T00:00:00`).getTime();
    const closedAt = new Date(`${ticket.CompletionDate || ticket.LastUpdated || ticket.TicketDate}T00:00:00`).getTime();
    if (Number.isNaN(openedAt) || Number.isNaN(closedAt)) return false;
    return closedAt - openedAt <= 2 * 24 * 60 * 60 * 1000;
  }).length;
  const slaPulse = datedClosedTickets.length ? Math.round((inSla / datedClosedTickets.length) * 100) : 0;

  return { ...dataset, open, closed, pendingPms, activeEngineers, critical, slaPulse };
}
