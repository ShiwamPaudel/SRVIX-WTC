import { NextResponse } from "next/server";
import { dataService } from "@/lib/turso/service";

export async function GET() {
  const pms = await dataService.pmsSchedule();
  return NextResponse.json({ pms });
}
