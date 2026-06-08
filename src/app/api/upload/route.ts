import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTicket } from "@/lib/data";
import { storageService } from "@/lib/storage/service";
import type { ReportStorageContext } from "@/lib/storage/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file supplied" }, { status: 400 });
  }

  const ticketId = String(formData.get("ticketId") ?? "");
  let context: ReportStorageContext | undefined;
  if (ticketId) {
    const ticket = await getTicket(ticketId);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    if (session.user.role === "Engineer" && session.user.engineerId !== ticket.AssignedEngineer) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    context = {
      ticketId: ticket.TicketID,
      customerName: ticket.customer?.HospitalName || ticket.NameOfCustomer,
      machineModel: ticket.machine?.Model || ticket.Model,
      machineSerial: ticket.machine?.SerialNumber || ticket.MachineID || ticket.InstallationID,
      ticketTitle: ticket.TicketTitle,
      ticketDate: ticket.TicketDate || ticket.Date || ticket.VisitDate,
    };
  }

  try {
    const uploaded = await storageService.uploadFile(file, context);
    return NextResponse.json({ ...uploaded, url: uploaded.url || uploaded.webViewLink });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
