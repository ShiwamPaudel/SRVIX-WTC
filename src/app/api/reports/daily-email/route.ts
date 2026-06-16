import { NextResponse } from "next/server";
import { hasCronAccess } from "@/lib/cron";
import { dailyReportEmailConfigStatus, sendDailyReportEmail, verifyDailyReportEmailSetup } from "@/lib/daily-report-email";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!hasCronAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = dailyReportEmailConfigStatus();
  if (!config.configured) {
    return NextResponse.json({ error: `Email config missing: ${config.missing.join(", ")}`, config }, { status: 400 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("verify") === "1") {
    const result = await verifyDailyReportEmailSetup();
    return NextResponse.json({ result });
  }

  const result = await sendDailyReportEmail(url.searchParams.get("date") ?? undefined);
  return NextResponse.json({ result });
}
