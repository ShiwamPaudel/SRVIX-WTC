import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";
import { compactId } from "@/lib/utils";
import type { CustomerVisitRule } from "@/types/service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<CustomerVisitRule>;
  const customerId = String(body.CustomerID ?? "").trim();
  const frequencyDays = Number(body.FrequencyDays);
  const startDate = String(body.StartDate ?? "").trim();
  if (!customerId || !startDate || !Number.isFinite(frequencyDays) || frequencyDays < 1) {
    return NextResponse.json({ error: "Customer, start date, and visit frequency are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const rule: CustomerVisitRule = {
    RuleID: compactId("RUL"),
    CustomerID: customerId,
    FrequencyDays: String(Math.round(frequencyDays)),
    AssignedEngineer: String(body.AssignedEngineer ?? "").trim(),
    StartDate: startDate,
    LastGeneratedDate: "",
    ActiveStatus: "Active",
    Remarks: String(body.Remarks ?? "").trim().slice(0, 1000),
    CreatedAt: now,
    UpdatedAt: now,
  };

  const visitRule = await dataService.createCustomerVisitRule(rule);
  return NextResponse.json({ visitRule }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<CustomerVisitRule> & { RuleID?: string };
  if (!body.RuleID) return NextResponse.json({ error: "RuleID is required" }, { status: 400 });

  const existing = await dataService.customerVisitRule(body.RuleID);
  if (!existing) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  const patch: Partial<CustomerVisitRule> = {
    UpdatedAt: new Date().toISOString(),
  };
  if (body.FrequencyDays != null) {
    const frequency = Number(body.FrequencyDays);
    if (!Number.isFinite(frequency) || frequency < 1) {
      return NextResponse.json({ error: "Visit frequency must be at least 1 day" }, { status: 400 });
    }
    patch.FrequencyDays = String(Math.round(frequency));
  }
  if (body.AssignedEngineer != null) patch.AssignedEngineer = String(body.AssignedEngineer);
  if (body.StartDate != null) patch.StartDate = String(body.StartDate);
  if (body.ActiveStatus != null) patch.ActiveStatus = body.ActiveStatus === "Inactive" ? "Inactive" : "Active";
  if (body.Remarks != null) patch.Remarks = String(body.Remarks).slice(0, 1000);

  const visitRule = await dataService.updateCustomerVisitRule(existing.RuleID, patch);
  return NextResponse.json({ visitRule });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { RuleID?: string };
  if (!body.RuleID) return NextResponse.json({ error: "RuleID is required" }, { status: 400 });

  const existing = await dataService.customerVisitRule(body.RuleID);
  if (!existing) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  await dataService.deleteCustomerVisitRule(existing.RuleID);
  return NextResponse.json({ ok: true });
}
