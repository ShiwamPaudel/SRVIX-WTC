import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { notifyAdminsLeaveRequested, notifyEngineerLeaveReviewed } from "@/lib/push-notifications";
import { dataService } from "@/lib/turso/service";
import { compactId } from "@/lib/utils";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/service";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await dataService.leaveRequests();
  const visible = isAdmin(session.user.role)
    ? requests
    : requests.filter((request) => request.EngineerID === session.user.engineerId);

  return NextResponse.json({ leaveRequests: visible.sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt)) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.engineerId) return NextResponse.json({ error: "Engineer account required" }, { status: 403 });

  const body = (await request.json()) as { leaveDate?: string; reason?: string };
  const leaveDate = String(body.leaveDate ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  if (!leaveDate || !reason) return NextResponse.json({ error: "Leave date and reason are required" }, { status: 400 });

  const engineers = await dataService.engineers();
  const engineer = engineers.find((item) => item.EngineerID === session.user.engineerId);
  if (!engineer) return NextResponse.json({ error: "Engineer not found" }, { status: 404 });

  const now = new Date().toISOString();
  const leaveRequest: LeaveRequest = {
    LeaveRequestID: compactId("LVR"),
    EngineerID: engineer.EngineerID,
    EngineerName: engineer.EngineerName,
    RequestedByUserID: session.user.id,
    LeaveDate: leaveDate,
    Reason: reason.slice(0, 1000),
    Status: "Pending",
    ReviewedBy: "",
    ReviewReason: "",
    CreatedAt: now,
    ReviewedAt: "",
  };

  await dataService.createLeaveRequest(leaveRequest);
  await notifyAdminsLeaveRequested(leaveRequest).catch((error) => console.warn("Leave request push failed", error));
  return NextResponse.json({ leaveRequest }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as { leaveRequestId?: string; status?: LeaveRequestStatus; reviewReason?: string };
  if (!body.leaveRequestId || (body.status !== "Approved" && body.status !== "Rejected")) {
    return NextResponse.json({ error: "A valid leave request and decision are required" }, { status: 400 });
  }

  const existing = await dataService.leaveRequest(body.leaveRequestId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const leaveRequest = await dataService.updateLeaveRequest(body.leaveRequestId, {
    Status: body.status,
    ReviewedBy: session.user.name ?? session.user.email ?? "Admin",
    ReviewReason: String(body.reviewReason ?? "").trim().slice(0, 1000),
    ReviewedAt: new Date().toISOString(),
  });
  await notifyEngineerLeaveReviewed(leaveRequest).catch((error) => console.warn("Leave review push failed", error));

  return NextResponse.json({ leaveRequest });
}
