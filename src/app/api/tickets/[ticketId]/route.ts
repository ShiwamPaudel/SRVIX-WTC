import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { compactId } from "@/lib/utils";
import { getTicket } from "@/lib/data";
import { dataService } from "@/lib/turso/service";
import { notifyAdminsTicketClosed, notifyEngineerTicketAssigned } from "@/lib/push-notifications";
import type { Ticket } from "@/types/service";

function hasAttachment(value?: string) {
  return Boolean(
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean).length,
  );
}

function canViewTicket(user: { role?: string | null; engineerId?: string | null }, ticket: Ticket) {
  if (user.role === "Engineer") return Boolean(user.engineerId && user.engineerId === ticket.AssignedEngineer);
  return true;
}

export async function GET(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketId } = await params;
  const ticket = await getTicket(ticketId);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewTicket(session.user, ticket)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketId } = await params;
  const body = (await request.json()) as Partial<Ticket> & { AcceptTicket?: boolean };
  const existingTicket = await dataService.ticket(ticketId);
  if (!existingTicket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewTicket(session.user, existingTicket)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.AcceptTicket) {
    if (existingTicket.TicketStatus === "Closed") {
      return NextResponse.json({ error: "Closed tickets cannot be accepted." }, { status: 400 });
    }
    if (!session.user.engineerId || session.user.engineerId !== existingTicket.AssignedEngineer) {
      return NextResponse.json({ error: "Only the assigned engineer can accept this ticket." }, { status: 403 });
    }
    if (existingTicket.TicketAcceptedAt) {
      return NextResponse.json({ ticket: existingTicket });
    }

    const now = new Date().toISOString();
    const ticket = await dataService.updateTicket(ticketId, {
      TicketAcceptedAt: now,
      TicketAcceptedBy: session.user.name ?? session.user.email ?? session.user.id,
    });
    await dataService.createTicketLog({
      LogID: compactId("LOG"),
      TicketID: ticketId,
      UpdatedBy: session.user.name ?? "Engineer",
      UpdateDate: now,
      Status: ticket.TicketStatus,
      Remarks: "Ticket accepted",
      AttachmentURL: "",
      Latitude: ticket.Latitude,
      Longitude: ticket.Longitude,
    });
    return NextResponse.json({ ticket });
  }
  if (session.user.role === "Engineer") {
    if (!session.user.engineerId || session.user.engineerId !== existingTicket.AssignedEngineer) {
      return NextResponse.json({ error: "Only the assigned engineer can update this ticket." }, { status: 403 });
    }

    const allowedEngineerFields = new Set([
      "AttachmentURLs",
      "TicketStatus",
      "EngineerRemarks",
      "Resolution",
      "CompletionDate",
    ]);
    const blockedField = Object.keys(body).find((key) => !allowedEngineerFields.has(key));
    if (blockedField) {
      return NextResponse.json({ error: "Engineers can only attach reports, add remarks, and close assigned tickets." }, { status: 403 });
    }
  }
  if (!isAdmin(session.user.role) && body.AssignedEngineer != null && body.AssignedEngineer !== existingTicket.AssignedEngineer) {
    return NextResponse.json({ error: "Admin access required to assign engineers" }, { status: 403 });
  }
  if (body.TicketStatus === "Closed" && !hasAttachment(body.AttachmentURLs || existingTicket.AttachmentURLs)) {
    return NextResponse.json({ error: "A service report attachment is required before closing a ticket." }, { status: 400 });
  }
  const normalizedPatch = {
    ...body,
    ...(body.TicketStatus ? { TicketStatus: body.TicketStatus === "Closed" ? "Closed" : "Pending" } : {}),
    ...(body.AssignedEngineer && body.AssignedEngineer !== existingTicket.AssignedEngineer
      ? { TicketAcceptedAt: "", TicketAcceptedBy: "" }
      : {}),
  } satisfies Partial<Ticket>;
  const ticket = await dataService.updateTicket(ticketId, normalizedPatch);
  const engineerChanged = Boolean(body.AssignedEngineer && body.AssignedEngineer !== existingTicket.AssignedEngineer);
  const closedByUser = existingTicket.TicketStatus !== "Closed" && ticket.TicketStatus === "Closed" && session.user.role !== "Admin";

  await Promise.allSettled([
    engineerChanged ? notifyEngineerTicketAssigned(ticket) : Promise.resolve(),
    closedByUser ? notifyAdminsTicketClosed(ticket, session.user.name ?? session.user.email ?? "User") : Promise.resolve(),
  ]);

  if (ticket.PMSID && ticket.TicketStatus === "Closed") {
    await dataService.updatePMSSchedule(ticket.PMSID, {
      Status: "Completed",
      CompletionDate: ticket.CompletionDate || new Date().toISOString().slice(0, 10),
      TicketID: ticket.TicketID,
    });
  } else if (ticket.PMSID && ticket.TicketStatus !== "Closed") {
    await dataService.updatePMSSchedule(ticket.PMSID, {
      Status: "Scheduled",
      TicketID: ticket.TicketID,
    });
  }
  await dataService.createTicketLog({
    LogID: compactId("LOG"),
    TicketID: ticketId,
    UpdatedBy: session.user.name ?? "System",
    UpdateDate: new Date().toISOString(),
    Status: normalizedPatch.TicketStatus ?? ticket.TicketStatus,
    Remarks: body.EngineerRemarks || body.Resolution || "Ticket updated",
    AttachmentURL: body.AttachmentURLs ?? "",
    Latitude: body.Latitude ?? ticket.Latitude,
    Longitude: body.Longitude ?? ticket.Longitude,
  });

  return NextResponse.json({ ticket });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { ticketId } = await params;
  const ticket = await getTicket(ticketId);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await dataService.deleteTicket(ticketId);
  return NextResponse.json({ ok: true });
}
