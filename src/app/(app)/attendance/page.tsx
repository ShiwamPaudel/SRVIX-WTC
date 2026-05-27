import { AttendanceReport } from "@/components/attendance-report";
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
  const [customers, engineers, tickets, locationLogs] = await Promise.all([
    dataService.customers(),
    dataService.engineers(),
    dataService.tickets(),
    dataService.engineerLocationLogs(),
  ]);
  const customerById = new Map(customers.map((customer) => [customer.CustomerID, customer]));
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const canViewAll = session?.user.role === "Admin";
  const allowedEngineerIds = canViewAll
    ? new Set(engineers.map((engineer) => engineer.EngineerID))
    : new Set(session?.user.engineerId ? [session.user.engineerId] : []);
  const visibleEngineers = engineers.filter((engineer) => allowedEngineerIds.has(engineer.EngineerID));

  const events = [
    ...tickets
      .filter((ticket) => ticket.AssignedEngineer && allowedEngineerIds.has(ticket.AssignedEngineer))
      .map((ticket) => {
        const date = dayKey(ticket.TicketDate || ticket.Date || ticket.VisitDate);
        const customerName = customerById.get(ticket.CustomerID)?.HospitalName || ticket.NameOfCustomer || "Customer not linked";
        return {
          engineerId: ticket.AssignedEngineer,
          date,
          type: "Ticket" as const,
          detail: `${customerName}${ticket.TicketTitle ? ` - ${ticket.TicketTitle}` : ""}`,
        };
      }),
    ...locationLogs
      .filter((log) => allowedEngineerIds.has(log.EngineerID))
      .map((log) => ({
        engineerId: log.EngineerID,
        date: dayKey(log.CreatedAt),
        type: "Location" as const,
        detail: log.Remarks || "Location submitted",
      })),
  ].filter((event) => event.date);

  return (
    <div className="space-y-5">
      <MapAutoRefresh intervalMs={30000} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Attendance</h1>
        <p className="text-sm text-slate-500">
          {canViewAll
            ? "Monthly attendance by engineer. A day is present when an assigned ticket was opened that day or the engineer sent a location."
            : "Your attendance only. A day is present when you had an assigned ticket opened that day or sent a location."}
        </p>
      </div>
      <AttendanceReport
        engineers={visibleEngineers.map((engineer) => ({
          id: engineer.EngineerID,
          name: engineer.EngineerName,
          department: engineer.Department,
        }))}
        events={events}
        defaultFrom={toDateInputValue(monthStart)}
        defaultTo={toDateInputValue(today)}
      />
    </div>
  );
}
