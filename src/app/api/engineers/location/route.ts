import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dataService } from "@/lib/turso/service";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { engineerId?: string; latitude?: number; longitude?: number };
  if (!body.engineerId || body.latitude == null || body.longitude == null) {
    return NextResponse.json({ error: "Invalid location payload" }, { status: 400 });
  }

  if (session.user.role === "Engineer" && session.user.engineerId !== body.engineerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const engineer = await dataService.updateEngineerLocation(
    body.engineerId,
    String(body.latitude),
    String(body.longitude),
  );
  return NextResponse.json({ engineer });
}
