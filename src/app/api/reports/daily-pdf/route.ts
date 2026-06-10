import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { attendanceReportData, dateForReportLabel, validReportDate } from "@/lib/attendance";
import { dailyReportPdf } from "@/lib/daily-report-pdf";
import { isAdmin } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const url = new URL(request.url);
  const date = validReportDate(url.searchParams.get("date"));
  const report = await attendanceReportData();
  const pdf = await dailyReportPdf({ date, engineers: report.engineers, events: report.events });
  const filename = `service-daily-report-${date}.pdf`;
  const body = new Blob([new Uint8Array(pdf)], { type: "application/pdf" });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Report-Date": dateForReportLabel(date),
    },
  });
}
