import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { notifyEngineerTicketAssigned } from "@/lib/push-notifications";
import { dataService } from "@/lib/turso/service";
import { compactId } from "@/lib/utils";
import type { PMSSchedule } from "@/types/service";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<PMSSchedule> & { PMSID?: string };
  if (!body.PMSID) return NextResponse.json({ error: "PMSID is required" }, { status: 400 });
  const existing = (await dataService.pmsSchedule()).find((row) => row.PMSID === body.PMSID);
  if (!existing) return NextResponse.json({ error: "PMS not found" }, { status: 404 });

  const patch: Partial<PMSSchedule> = {};
  if (body.AssignedEngineer != null) patch.AssignedEngineer = String(body.AssignedEngineer);
  if (body.DueDate != null) patch.DueDate = String(body.DueDate);
  if (body.Status != null) patch.Status = body.Status === "Completed" ? "Completed" : body.Status === "Overdue" ? "Overdue" : "Scheduled";

  const pms = await dataService.updatePMSSchedule(body.PMSID, patch);
  const linkedTicketId = pms.TicketID || existing.TicketID;
  if (linkedTicketId && (body.AssignedEngineer != null || body.DueDate != null)) {
    const existingTicket = await dataService.ticket(linkedTicketId);
    if (existingTicket) {
      const assignedEngineer = body.AssignedEngineer != null ? String(body.AssignedEngineer) : existingTicket.AssignedEngineer;
      const engineerChanged = assignedEngineer !== existingTicket.AssignedEngineer;
      const now = new Date().toISOString();
      const ticket = await dataService.updateTicket(linkedTicketId, {
        ...(body.AssignedEngineer != null ? { AssignedEngineer: assignedEngineer } : {}),
        ...(body.DueDate != null ? { VisitDate: String(body.DueDate) } : {}),
        ...(engineerChanged ? { TicketAcceptedAt: "", TicketAcceptedBy: "" } : {}),
      });

      await Promise.allSettled([
        engineerChanged && assignedEngineer ? notifyEngineerTicketAssigned(ticket) : Promise.resolve(),
        dataService.createTicketLog({
          LogID: compactId("LOG"),
          TicketID: ticket.TicketID,
          UpdatedBy: session.user.name ?? session.user.email ?? "System",
          UpdateDate: now,
          Status: ticket.TicketStatus,
          Remarks: engineerChanged ? "PMS ticket assigned from planner" : "PMS ticket updated from planner",
          AttachmentURL: "",
          Latitude: ticket.Latitude,
          Longitude: ticket.Longitude,
        }),
      ]);
    }
  }

  return NextResponse.json({ pms });
}
