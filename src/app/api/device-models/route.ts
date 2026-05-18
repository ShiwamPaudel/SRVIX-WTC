import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dataService } from "@/lib/turso/service";
import { uniqueCompactId } from "@/lib/utils";
import type { DeviceModel } from "@/types/service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = (await request.json()) as Partial<DeviceModel>;
  if (!body.BrandName || !body.Model || !body.PMSFrequency) {
    return NextResponse.json({ error: "Brand, model, and PMS frequency are required" }, { status: 400 });
  }

  const frequency = Number(body.PMSFrequency);
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return NextResponse.json({ error: "PMS frequency must be a positive number of days" }, { status: 400 });
  }

  const models = await dataService.deviceModels();
  const model: DeviceModel = {
    ModelID: uniqueCompactId("MDL", models.map((item) => item.ModelID)),
    BrandName: body.BrandName,
    Model: body.Model,
    PMSFrequency: String(frequency),
    ImageURL: body.ImageURL ?? "",
  };

  await dataService.createDeviceModel(model);
  return NextResponse.json({ model }, { status: 201 });
}
