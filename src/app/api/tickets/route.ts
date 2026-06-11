import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { compactId, uniqueCompactId } from "@/lib/utils";
import { machineCoverage } from "@/lib/coverage";
import { dataService } from "@/lib/turso/service";
import { serviceReportRequiredForServiceType } from "@/lib/constants";
import { sendNotification } from "@/lib/notifications";
import { notifyEngineerTicketAssigned } from "@/lib/push-notifications";
import type { Ticket } from "@/types/service";

function hasAttachment(value?: string) {
  return Boolean(
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean).length,
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await dataService.tickets();
  const visibleTickets = session.user.role === "Engineer"
    ? session.user.engineerId
      ? tickets.filter((ticket) => ticket.AssignedEngineer === session.user.engineerId)
      : []
    : tickets;
  return NextResponse.json({ tickets: visibleTickets });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = (await request.json()) as Partial<Ticket>;
  if (body.TicketStatus === "Closed" && serviceReportRequiredForServiceType(body.ServiceType) && !hasAttachment(body.AttachmentURLs)) {
    return NextResponse.json({ error: "A service report attachment is required before closing a ticket." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const [tickets, machines, customers, contracts] = await Promise.all([
    dataService.tickets(),
    dataService.machines(),
    dataService.customers(),
    dataService.contracts(),
  ]);
  const machine = machines.find((item) => item.MachineID === body.MachineID);
  const customerId = machine?.CustomerID ?? body.CustomerID ?? "";
  const customer = customers.find((item) => item.CustomerID === customerId);
  const coverage = machineCoverage(
    machine?.WarrantyExpiry ?? "",
    contracts.filter((contract) => contract.InstallationID === machine?.InstallationID),
  );

  const ticket: Ticket = {
    TicketID: uniqueCompactId("TKT", tickets.map((item) => item.TicketID)),
    TicketDate: now.slice(0, 10),
    Date: now.slice(0, 10),
    CustomerID: customerId,
    NameOfCustomer: customer?.NameOfCustomer || customer?.HospitalName || machine?.NameOfCustomer || "",
    MachineID: body.MachineID ?? "",
    InstallationID: body.MachineID ?? "",
    Model: machine?.Model ?? "",
    TicketTitle: body.TicketTitle ?? "",
    ProblemDescription: body.ProblemDescription ?? "",
    Description: body.ProblemDescription ?? "",
    ServiceType: body.ServiceType ?? "Breakdown (On-site Addressed)",
    Priority: "Medium",
    ContractType: coverage.contractType,
    WarrantyStatus: coverage.warrantyStatus,
    AssignedEngineer: body.AssignedEngineer ?? "",
    TicketAcceptedAt: "",
    TicketAcceptedBy: "",
    AssistedBy: body.AssistedBy ?? "",
    TicketStatus: body.TicketStatus === "Closed" ? "Closed" : "Pending",
    ResponseType: body.ResponseType ?? "",
    OpenedBy: session.user.name ?? session.user.email ?? "System",
    EngineerRemarks: "",
    Resolution: "",
    VisitDate: body.VisitDate ?? "",
    CompletionDate: "",
    CustomerSignatureURL: body.CustomerSignatureURL ?? "",
    AttachmentURLs: body.AttachmentURLs ?? "",
    ClosureStatus: "Pending",
    Latitude: body.Latitude || customer?.Latitude || "",
    Longitude: body.Longitude || customer?.Longitude || "",
    LastUpdated: now,
    PMSID: body.PMSID ?? "",
    PMSNumber: body.PMSNumber ?? "",
  };

  await dataService.createTicket(ticket);
  await dataService.createTicketLog({
    LogID: compactId("LOG"),
    TicketID: ticket.TicketID,
    UpdatedBy: session.user.name ?? "System",
    UpdateDate: now,
    Status: ticket.TicketStatus,
    Remarks: "Ticket created",
    AttachmentURL: ticket.AttachmentURLs,
    Latitude: ticket.Latitude,
    Longitude: ticket.Longitude,
  });

  if (ticket.AssignedEngineer) {
    const engineers = await dataService.engineers();
    const engineer = engineers.find((item) => item.EngineerID === ticket.AssignedEngineer);
    if (engineer?.Email) {
      await sendNotification({
        type: "Ticket created",
        recipient: engineer.Email,
        subject: `Ticket assigned: ${ticket.TicketTitle}`,
        message: `${ticket.TicketID} has been assigned to you.`,
      });
    }
    await notifyEngineerTicketAssigned(ticket).catch((error) => console.warn("Ticket assignment push failed", error));
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
