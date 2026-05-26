import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { compactId } from "@/lib/utils";
import { getTicket } from "@/lib/data";
import { dataService } from "@/lib/turso/service";
import type { Ticket } from "@/types/service";

export async function GET(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const ticket = await getTicket(ticketId);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ticket });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketId } = await params;
  const body = (await request.json()) as Partial<Ticket>;
  const normalizedPatch = {
    ...body,
    ...(body.TicketStatus ? { TicketStatus: body.TicketStatus === "Closed" ? "Closed" : "Pending" } : {}),
  } satisfies Partial<Ticket>;
  const ticket = await dataService.updateTicket(ticketId, normalizedPatch);
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
  if (session.user.role !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { ticketId } = await params;
  const ticket = await getTicket(ticketId);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await dataService.deleteTicket(ticketId);
  return NextResponse.json({ ok: true });
}
