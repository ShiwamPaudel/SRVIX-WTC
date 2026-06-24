import "server-only";

import { dataService } from "@/lib/turso/service";
import type { Customer, Engineer, Machine, Ticket, TicketLog, TicketWithRelations, UserRole } from "@/types/service";

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

export function joinTicketsWithRelations({
  customers,
  machines,
  tickets,
  engineers,
  logs,
}: {
  customers: Customer[];
  machines: Machine[];
  tickets: Ticket[];
  engineers: Engineer[];
  logs: TicketLog[];
}) {
  const customerById = new Map(customers.map((customer) => [customer.CustomerID, customer]));
  const customerByName = new Map(
    customers.flatMap((customer) =>
      [customer.NameOfCustomer, customer.HospitalName].filter(Boolean).map((name) => [name, customer] as const),
    ),
  );
  const machineById = new Map(
    machines.flatMap((machine) =>
      [machine.MachineID, machine.InstallationID].filter(Boolean).map((id) => [id, machine] as const),
    ),
  );
  const engineerById = new Map(engineers.map((engineer) => [engineer.EngineerID, engineer]));
  const logsByTicket = logs.reduce<Map<string, TicketLog[]>>((grouped, log) => {
    const group = grouped.get(log.TicketID) ?? [];
    group.push(log);
    grouped.set(log.TicketID, group);
    return grouped;
  }, new Map());

  return tickets.map<TicketWithRelations>((ticket) => ({
    ...ticket,
    customer: customerById.get(ticket.CustomerID) ?? customerByName.get(ticket.NameOfCustomer ?? ""),
    machine: machineById.get(ticket.MachineID) ?? machineById.get(ticket.InstallationID ?? ""),
    engineer: engineerById.get(ticket.AssignedEngineer),
    logs: logsByTicket.get(ticket.TicketID) ?? [],
  }));
}

export async function getTicketsWithRelations(role?: UserRole, engineerId?: string) {
  const [customers, machines, tickets, engineers, logs] = await Promise.all([
    dataService.customers(),
    dataService.machines(),
    dataService.tickets(),
    dataService.engineers(),
    dataService.ticketLogs(),
  ]);
  const allowedTickets = role === "Engineer"
    ? engineerId
      ? tickets.filter((ticket) => ticket.AssignedEngineer === engineerId)
      : []
    : tickets;

  return joinTicketsWithRelations({ customers, machines, tickets: allowedTickets, engineers, logs });
}

export async function getTicket(ticketId: string) {
  const [ticket, customers, machines, engineers, logs] = await Promise.all([
    dataService.ticket(ticketId),
    dataService.customers(),
    dataService.machines(),
    dataService.engineers(),
    dataService.ticketLogsForTicket(ticketId),
  ]);
  if (!ticket) return undefined;
  return joinTicketsWithRelations({ customers, machines, tickets: [ticket], engineers, logs })[0];
}

export async function getDashboardMetrics(role?: UserRole, engineerId?: string) {
  const dataset = await getServiceDataset();
  const visibleTickets = role === "Engineer"
    ? engineerId
      ? dataset.tickets.filter((ticket) => ticket.AssignedEngineer === engineerId)
      : []
    : dataset.tickets;
  const visibleTicketIds = new Set(visibleTickets.map((ticket) => ticket.TicketID));
  const visibleLogs = role === "Engineer"
    ? dataset.logs.filter((log) => visibleTicketIds.has(log.TicketID))
    : dataset.logs;
  const visiblePmsSchedule = role === "Engineer"
    ? engineerId
      ? dataset.pmsSchedule.filter((pms) => pms.AssignedEngineer === engineerId)
      : []
    : dataset.pmsSchedule;

  const pendingPms = visibleTickets.filter((ticket) => ticket.TicketStatus === "Pending" && ticket.ServiceType === "PMS").length;
  const activeEngineers = dataset.engineers.filter((engineer) => engineer.ActiveStatus !== "Inactive").length;

  return {
    ...dataset,
    tickets: visibleTickets,
    logs: visibleLogs,
    pmsSchedule: visiblePmsSchedule,
    open: visibleTickets.filter((ticket) => ticket.TicketStatus !== "Closed").length,
    closed: visibleTickets.filter((ticket) => ticket.TicketStatus === "Closed").length,
    pendingPms,
    activeEngineers,
  };
}
