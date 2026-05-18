import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role === "Engineer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    type: string;
    recipient: string;
    subject: string;
    message: string;
  };
  const notification = await sendNotification(body);
  return NextResponse.json({ notification });
}
