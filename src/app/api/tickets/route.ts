import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { compactId, uniqueCompactId } from "@/lib/utils";
import { dataService } from "@/lib/turso/service";
import { sendNotification } from "@/lib/notifications";
import { notifyEngineerTicketAssigned } from "@/lib/push-notifications";
import type { Ticket } from "@/types/service";

function warrantyStatus(expiry?: string) {
  if (!expiry) return "Unknown";
  const date = new Date(`${expiry}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date >= new Date() ? "Under Warranty" : "Warranty Expired";
}

function hasAttachment(value?: string) {
  return Boolean(
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean).length,
  );
}

export async function GET() {
  const tickets = await dataService.tickets();
  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = (await request.json()) as Partial<Ticket>;
  if (body.TicketStatus === "Closed" && !hasAttachment(body.AttachmentURLs)) {
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
  const activeContract = contracts
    .filter((contract) => contract.InstallationID === machine?.InstallationID)
    .filter((contract) => {
      const end = new Date(`${contract.ContractEnd}T00:00:00`);
      return !Number.isNaN(end.getTime()) && end >= new Date() && contract.Status !== "Expired";
    })
    .sort((a, b) => new Date(b.ContractEnd).getTime() - new Date(a.ContractEnd).getTime())[0];
  const computedWarrantyStatus = warrantyStatus(machine?.WarrantyExpiry);

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
    ServiceType: body.ServiceType ?? "Breakdown (OnSite Addressed)",
    Priority: "Medium",
    ContractType: activeContract
      ? activeContract.ContractType === "AMC"
        ? "Under AMC"
        : activeContract.ContractType === "CMC"
          ? "CMC"
          : "RRC"
      : computedWarrantyStatus === "Under Warranty"
        ? "Under Warranty"
        : "Out of Warranty",
    WarrantyStatus: computedWarrantyStatus,
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
