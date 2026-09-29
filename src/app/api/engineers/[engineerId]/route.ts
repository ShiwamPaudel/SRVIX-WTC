import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import {
  ENGINEER_DEFAULT_STATUS,
  ENGINEER_RESIGNED_STATUS,
  USER_ACTIVE_STATUS,
  USER_INACTIVE_STATUS,
} from "@/lib/engineers";
import { dataService } from "@/lib/turso/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ engineerId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { engineerId } = await params;
  const body = (await request.json()) as { ActiveStatus?: string };
  if (body.ActiveStatus !== ENGINEER_RESIGNED_STATUS && body.ActiveStatus !== ENGINEER_DEFAULT_STATUS) {
    return NextResponse.json({ error: "ActiveStatus must be Resigned or Available" }, { status: 400 });
  }

  const engineers = await dataService.engineers();
  const engineer = engineers.find((item) => item.EngineerID === engineerId);
  if (!engineer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resigning = body.ActiveStatus === ENGINEER_RESIGNED_STATUS;
  const [tickets, pmsSchedule, visitRules] = await Promise.all([
    dataService.tickets(),
    dataService.pmsSchedule(),
    dataService.customerVisitRules(),
  ]);
  const openTickets = tickets.filter((ticket) => ticket.AssignedEngineer === engineerId && ticket.TicketStatus !== "Closed");

  if (resigning && openTickets.length) {
    return NextResponse.json(
      {
        error: `${engineer.EngineerName} still has ${openTickets.length} open ticket${openTickets.length === 1 ? "" : "s"}. Reassign them before marking this engineer resigned.`,
        openTickets: openTickets.slice(0, 10).map((ticket) => ({ TicketID: ticket.TicketID, TicketTitle: ticket.TicketTitle })),
      },
      { status: 409 },
    );
  }

  const updated = await dataService.updateEngineer(engineerId, { ActiveStatus: body.ActiveStatus });

  const users = await dataService.users();
  const linkedUsers = users.filter((user) => user.EngineerID === engineerId);
  await Promise.all(
    linkedUsers.map((user) =>
      dataService.updateUser(user.UserID, { ActiveStatus: resigning ? USER_INACTIVE_STATUS : USER_ACTIVE_STATUS }),
    ),
  );

  const pendingPms = pmsSchedule.filter((pms) => pms.AssignedEngineer === engineerId && pms.Status !== "Completed").length;
  const activeRules = visitRules.filter((rule) => rule.AssignedEngineer === engineerId && rule.ActiveStatus !== "Inactive").length;

  return NextResponse.json({
    engineer: updated,
    loginDisabled: resigning && linkedUsers.length > 0,
    followUps: resigning ? { pendingPms, activeRules } : { pendingPms: 0, activeRules: 0 },
  });
}
