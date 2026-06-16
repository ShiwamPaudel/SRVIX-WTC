import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { createPMSTicket } from "@/lib/pms-tickets";

export async function POST(_request: Request, { params }: { params: Promise<{ pmsId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { pmsId } = await params;
  const result = await createPMSTicket(pmsId, {
    openedBy: session.user.name ?? session.user.email ?? "System",
  });

  if (result.status === "skipped") {
    const status = result.reason === "PMS row not found" ? 404 : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({ ticket: result.ticket }, { status: result.status === "created" ? 201 : 200 });
}
