import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { buildPlannerTicket, createPlannerTicket, plannerActivationDue } from "@/lib/planner-tickets";
import { dataService } from "@/lib/turso/service";
import { compactId } from "@/lib/utils";
import type { PlannedVisit, PlannerPlanType, PlannerStatus } from "@/types/service";

const statuses: PlannerStatus[] = ["Planned", "Done", "Missed", "Cancelled"];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<PlannedVisit>;
  const customerId = String(body.CustomerID ?? "").trim();
  const visitDate = String(body.VisitDate ?? "").trim();
  const assignedEngineer = String(body.AssignedEngineer ?? "").trim();
  if (!customerId || !visitDate || !assignedEngineer) {
    return NextResponse.json({ error: "Customer, visit date, and engineer are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const [customers, machines, contracts, tickets] = await Promise.all([
    dataService.customers(),
    dataService.machines(),
    dataService.contracts(),
    dataService.tickets(),
  ]);
  const customer = customers.find((item) => item.CustomerID === customerId);
  const machineId = String(body.MachineID ?? "").trim();
  const machine = machines.find((item) => item.MachineID === machineId || item.InstallationID === machineId);
  const active = plannerActivationDue(visitDate);
  const plan: PlannedVisit = {
    PlanID: compactId("PLN"),
    PlanType: "Ticket" as PlannerPlanType,
    CustomerID: customerId,
    MachineID: machineId,
    PMSID: "",
    TicketID: "",
    AssignedEngineer: assignedEngineer,
    VisitDate: visitDate,
    Status: "Planned",
    Remarks: String(body.Remarks ?? "").trim().slice(0, 1000),
    CreatedBy: session.user.name ?? session.user.email ?? "Admin",
    CreatedAt: now,
    UpdatedAt: now,
  };
  const ticket = buildPlannerTicket({
    plan,
    customer,
    machine,
    contracts,
    existingTickets: tickets,
    openedBy: session.user.name ?? session.user.email ?? "Admin",
    active,
  });
  plan.TicketID = ticket.TicketID;

  await createPlannerTicket(ticket, active);
  const plannedVisit = await dataService.createPlannedVisit(plan);
  return NextResponse.json({ plannedVisit, ticket }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<PlannedVisit> & { PlanID?: string };
  if (!body.PlanID) return NextResponse.json({ error: "PlanID is required" }, { status: 400 });

  const existing = await dataService.plannedVisit(body.PlanID);
  if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  const userIsAdmin = isAdmin(session.user.role);
  if (!userIsAdmin && existing.AssignedEngineer !== session.user.engineerId) {
    return NextResponse.json({ error: "Only the assigned engineer can update this plan" }, { status: 403 });
  }

  const patch: Partial<PlannedVisit> = {
    UpdatedAt: new Date().toISOString(),
  };
  if (body.Status && statuses.includes(body.Status as PlannerStatus)) patch.Status = body.Status as PlannerStatus;
  if (userIsAdmin && body.AssignedEngineer != null) patch.AssignedEngineer = String(body.AssignedEngineer);
  if (userIsAdmin && body.VisitDate != null) patch.VisitDate = String(body.VisitDate);
  if (userIsAdmin && body.Remarks != null) patch.Remarks = String(body.Remarks).slice(0, 1000);

  const plannedVisit = await dataService.updatePlannedVisit(existing.PlanID, patch);
  return NextResponse.json({ plannedVisit });
}
