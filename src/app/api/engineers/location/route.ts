import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dataService } from "@/lib/turso/service";
import { compactId } from "@/lib/utils";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { engineerId?: string; latitude?: number; longitude?: number; remarks?: string };
  const engineerId = session.user.role === "Engineer" ? session.user.engineerId : body.engineerId;
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (!engineerId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Invalid location payload" }, { status: 400 });
  }

  if (session.user.role === "Engineer" && session.user.engineerId !== engineerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const engineer = await dataService.updateEngineerLocation(
    engineerId,
    String(latitude),
    String(longitude),
  );
  await dataService.createEngineerLocationLog({
    LocationLogID: compactId("LOC"),
    EngineerID: engineer.EngineerID,
    EngineerName: engineer.EngineerName,
    Latitude: String(latitude),
    Longitude: String(longitude),
    Remarks: String(body.remarks ?? "").trim().slice(0, 500),
    CreatedAt: engineer.LastLocationUpdate ?? new Date().toISOString(),
  });

  return NextResponse.json({ engineer });
}
