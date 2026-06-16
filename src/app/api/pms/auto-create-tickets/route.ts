import { NextResponse } from "next/server";
import { hasCronAccess } from "@/lib/cron";
import { createDuePMSTickets } from "@/lib/pms-tickets";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasCronAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const result = await createDuePMSTickets({
    dueDate: url.searchParams.get("date") ?? undefined,
  });

  return NextResponse.json({ result });
}
