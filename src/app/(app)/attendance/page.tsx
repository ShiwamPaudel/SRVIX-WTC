import { AttendanceReport } from "@/components/attendance-report";
import { LeaveRequestForm } from "@/components/leave-request-form";
import { MapAutoRefresh } from "@/components/map-auto-refresh";
import { auth } from "@/auth";
import { dataService } from "@/lib/turso/service";
import { toDateInputValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

function dayKey(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return toDateInputValue(date);
  return value.slice(0, 10);
}

export default async function AttendancePage() {
  const session = await auth();
  const [customers, engineers, tickets, ticketLogs, locationLogs, leaveRequests] = await Promise.all([
    dataService.customers(),
    dataService.engineers(),
    dataService.tickets(),
    dataService.ticketLogs(),
    dataService.engineerLocationLogs(),
    dataService.leaveRequests(),
  ]);
  const customerById = new Map(customers.map((customer) => [customer.CustomerID, customer]));
  const closedAtByTicketId = ticketLogs
    .filter((log) => log.Status === "Closed" && log.UpdateDate)
    .reduce<Map<string, string>>((closedAtByTicket, log) => {
      const previous = closedAtByTicket.get(log.TicketID);
      if (!previous || new Date(log.UpdateDate).getTime() < new Date(previous).getTime()) {
        closedAtByTicket.set(log.TicketID, log.UpdateDate);
      }
      return closedAtByTicket;
    }, new Map());
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const canViewAll = session?.user.role === "Admin";
  const allowedEngineerIds = canViewAll
    ? new Set(engineers.map((engineer) => engineer.EngineerID))
    : new Set(session?.user.engineerId ? [session.user.engineerId] : []);
  const visibleEngineers = engineers.filter((engineer) => allowedEngineerIds.has(engineer.EngineerID));

  const events = [
    ...tickets
      .filter((ticket) => ticket.AssignedEngineer && ticket.TicketAcceptedAt && allowedEngineerIds.has(ticket.AssignedEngineer))
      .map((ticket) => {
        const date = dayKey(ticket.TicketAcceptedAt);
        const customerName = customerById.get(ticket.CustomerID)?.HospitalName || ticket.NameOfCustomer || "Customer not linked";
        return {
          engineerId: ticket.AssignedEngineer,
          date,
          sortAt: ticket.TicketAcceptedAt,
          type: "Ticket" as const,
          detail: `${customerName}${ticket.TicketTitle ? ` - ${ticket.TicketTitle}` : ""} accepted`,
        };
      }),
    ...tickets
      .filter((ticket) => ticket.AssignedEngineer && ticket.TicketStatus === "Closed" && allowedEngineerIds.has(ticket.AssignedEngineer))
      .map((ticket) => {
        const closedAt = closedAtByTicketId.get(ticket.TicketID) || ticket.LastUpdated || ticket.CompletionDate;
        const date = dayKey(closedAt);
        const customerName = customerById.get(ticket.CustomerID)?.HospitalName || ticket.NameOfCustomer || "Customer not linked";
        return {
          engineerId: ticket.AssignedEngineer,
          date,
          sortAt: closedAt,
          type: "Ticket" as const,
          detail: `${customerName}${ticket.TicketTitle ? ` - ${ticket.TicketTitle}` : ""} Closed`,
        };
      }),
    ...locationLogs
      .filter((log) => allowedEngineerIds.has(log.EngineerID))
      .map((log) => ({
        engineerId: log.EngineerID,
        date: dayKey(log.CreatedAt),
        sortAt: log.CreatedAt,
        type: "Location" as const,
        detail: log.Remarks || "Location submitted",
      })),
    ...leaveRequests
      .filter((request) => request.Status === "Approved" && allowedEngineerIds.has(request.EngineerID))
      .map((request) => ({
        engineerId: request.EngineerID,
        date: request.LeaveDate,
        sortAt: request.LeaveDate,
        type: "Leave" as const,
        detail: request.ReviewReason || request.Reason || "Approved leave",
      })),
  ].filter((event) => event.date);

  return (
    <div className="space-y-5">
      <MapAutoRefresh intervalMs={30000} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Attendance</h1>
        <p className="text-sm text-slate-500">
          {canViewAll
            ? "Monthly attendance by engineer. A day is present when an assigned ticket was accepted or closed that day, or the engineer sent a location."
            : "Your attendance only. A day is present when you accepted or closed an assigned ticket, or sent a location."}
        </p>
      </div>
      {session?.user.engineerId ? <LeaveRequestForm /> : null}
      <AttendanceReport
        engineers={visibleEngineers.map((engineer) => ({
          id: engineer.EngineerID,
          name: engineer.EngineerName,
          department: engineer.Department,
        }))}
        events={events}
        defaultFrom={toDateInputValue(monthStart)}
        defaultTo={toDateInputValue(today)}
        canChooseEngineer={canViewAll}
      />
    </div>
  );
}
