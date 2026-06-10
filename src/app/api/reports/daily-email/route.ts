import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dailyReportEmailConfigStatus, sendDailyReportEmail, verifyDailyReportEmailSetup } from "@/lib/daily-report-email";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function hasCronAccess(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const headerSecret = request.headers.get("x-cron-secret");
  return safeEqual(bearer ?? "", secret) || safeEqual(headerSecret ?? "", secret);
}

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
