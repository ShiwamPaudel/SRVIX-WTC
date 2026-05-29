import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";
import { compactId } from "@/lib/utils";
import type { PlannedVisit, PlannerPlanType, PlannerStatus } from "@/types/service";

const planTypes: PlannerPlanType[] = ["General Visit", "Scheduled Visit", "Ticket"];
const statuses: PlannerStatus[] = ["Planned", "Done", "Missed", "Cancelled"];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<PlannedVisit>;
  const planType = planTypes.includes(body.PlanType as PlannerPlanType) ? (body.PlanType as PlannerPlanType) : "General Visit";
  const customerId = String(body.CustomerID ?? "").trim();
  const visitDate = String(body.VisitDate ?? "").trim();
  const assignedEngineer = String(body.AssignedEngineer ?? "").trim();
  if (!customerId || !visitDate || !assignedEngineer) {
    return NextResponse.json({ error: "Customer, visit date, and engineer are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const plan: PlannedVisit = {
    PlanID: compactId("PLN"),
    PlanType: planType,
    CustomerID: customerId,
    MachineID: String(body.MachineID ?? "").trim(),
    PMSID: "",
    TicketID: String(body.TicketID ?? "").trim(),
    AssignedEngineer: assignedEngineer,
    VisitDate: visitDate,
    Status: "Planned",
    Remarks: String(body.Remarks ?? "").trim().slice(0, 1000),
    CreatedBy: session.user.name ?? session.user.email ?? "Admin",
    CreatedAt: now,
    UpdatedAt: now,
  };

  const plannedVisit = await dataService.createPlannedVisit(plan);
  return NextResponse.json({ plannedVisit }, { status: 201 });
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
