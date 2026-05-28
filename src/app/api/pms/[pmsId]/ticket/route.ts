import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";
import { notifyEngineerTicketAssigned } from "@/lib/push-notifications";
import { compactId, uniqueCompactId } from "@/lib/utils";
import type { ContractRecord, Ticket } from "@/types/service";

function ticketContractType(contract?: ContractRecord, warrantyStatus?: string) {
  if (contract?.ContractType === "AMC") return "Under AMC";
  if (contract?.ContractType === "CMC") return "CMC";
  if (contract?.ContractType === "RRC") return "RRC";
  return warrantyStatus === "Under Warranty" ? "Under Warranty" : "Out of Warranty";
}

function warrantyStatus(expiry?: string) {
  if (!expiry) return "Unknown";
  const date = new Date(`${expiry}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date >= new Date() ? "Under Warranty" : "Warranty Expired";
}

export async function POST(_request: Request, { params }: { params: Promise<{ pmsId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { pmsId } = await params;
  const [pmsRows, tickets, machines, customers, contracts] = await Promise.all([
    dataService.pmsSchedule(),
    dataService.tickets(),
    dataService.machines(),
    dataService.customers(),
    dataService.contracts(),
  ]);

  const pms = pmsRows.find((row) => row.PMSID === pmsId);
  if (!pms) return NextResponse.json({ error: "PMS row not found" }, { status: 404 });

  if (pms.TicketID) {
    const existing = tickets.find((ticket) => ticket.TicketID === pms.TicketID);
    if (existing) return NextResponse.json({ ticket: existing });
  }

  const machine = machines.find((item) => item.MachineID === pms.MachineID || item.InstallationID === pms.MachineID);
  if (!machine) return NextResponse.json({ error: "Linked machine was not found" }, { status: 400 });

  const customer = customers.find((item) => item.CustomerID === pms.CustomerID || item.CustomerID === machine.CustomerID);
  const activeContract = contracts
    .filter((contract) => contract.InstallationID === machine.InstallationID)
    .filter((contract) => {
      const end = new Date(`${contract.ContractEnd}T00:00:00`);
      return !Number.isNaN(end.getTime()) && end >= new Date() && contract.Status !== "Expired";
    })
    .sort((a, b) => new Date(b.ContractEnd).getTime() - new Date(a.ContractEnd).getTime())[0];
  const computedWarrantyStatus = warrantyStatus(machine.WarrantyExpiry);
  const pmsNumber = pms.PMSNumber || "";
  const customerName = customer?.NameOfCustomer || customer?.HospitalName || machine.NameOfCustomer || "";
  const now = new Date().toISOString();

  const ticket: Ticket = {
    TicketID: uniqueCompactId("TKT", tickets.map((item) => item.TicketID)),
    TicketDate: now.slice(0, 10),
    Date: now.slice(0, 10),
    CustomerID: customer?.CustomerID ?? machine.CustomerID,
    NameOfCustomer: customerName,
    MachineID: machine.MachineID,
    InstallationID: machine.InstallationID ?? machine.MachineID,
    Model: machine.Model,
    TicketTitle: `${pmsNumber ? `PMS No. ${pmsNumber}` : "PMS"} - ${machine.Model || machine.DeviceName} at ${customerName || "Customer"}`,
    ProblemDescription: `Scheduled preventive maintenance due on ${pms.DueDate}.`,
    Description: `Scheduled preventive maintenance due on ${pms.DueDate}.`,
    ServiceType: "PMS",
    Priority: "Medium",
    ContractType: ticketContractType(activeContract, computedWarrantyStatus),
    WarrantyStatus: computedWarrantyStatus,
    AssignedEngineer: pms.AssignedEngineer,
    TicketAcceptedAt: "",
    TicketAcceptedBy: "",
    AssistedBy: "",
    TicketStatus: "Pending",
    ResponseType: "Planned visit",
    OpenedBy: session.user.name ?? session.user.email ?? "System",
    EngineerRemarks: "",
    Resolution: "",
    VisitDate: pms.DueDate,
    CompletionDate: "",
    CustomerSignatureURL: "",
    AttachmentURLs: "",
    ClosureStatus: "Pending",
    Latitude: customer?.Latitude || "",
    Longitude: customer?.Longitude || "",
    LastUpdated: now,
    PMSID: pms.PMSID,
    PMSNumber: pmsNumber,
  };

  await dataService.createTicket(ticket);
  await dataService.updatePMSSchedule(pms.PMSID, {
    TicketID: ticket.TicketID,
    Status: pms.Status === "Completed" ? "Completed" : "Scheduled",
  });
  await dataService.createTicketLog({
    LogID: compactId("LOG"),
    TicketID: ticket.TicketID,
    UpdatedBy: session.user.name ?? "System",
    UpdateDate: now,
    Status: ticket.TicketStatus,
    Remarks: "PMS ticket created",
    AttachmentURL: "",
    Latitude: ticket.Latitude,
    Longitude: ticket.Longitude,
  });
  await notifyEngineerTicketAssigned(ticket).catch((error) => console.warn("PMS ticket assignment push failed", error));

  return NextResponse.json({ ticket }, { status: 201 });
}
