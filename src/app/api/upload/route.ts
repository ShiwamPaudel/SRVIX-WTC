import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { driveService } from "@/lib/google/drive";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file supplied" }, { status: 400 });
  }

  const uploaded = await driveService.uploadFile(file);
  return NextResponse.json({ ...uploaded, url: uploaded.url || uploaded.webViewLink });
}
