import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";
import type { PMSSchedule } from "@/types/service";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<PMSSchedule> & { PMSID?: string };
  if (!body.PMSID) return NextResponse.json({ error: "PMSID is required" }, { status: 400 });

  const patch: Partial<PMSSchedule> = {};
  if (body.AssignedEngineer != null) patch.AssignedEngineer = String(body.AssignedEngineer);
  if (body.DueDate != null) patch.DueDate = String(body.DueDate);
  if (body.Status != null) patch.Status = body.Status === "Completed" ? "Completed" : body.Status === "Overdue" ? "Overdue" : "Scheduled";

  const pms = await dataService.updatePMSSchedule(body.PMSID, patch);
  return NextResponse.json({ pms });
}
