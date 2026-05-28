import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendTestPushToUser } from "@/lib/push-notifications";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await sendTestPushToUser(session.user.id);
  if (result.skipped) {
    return NextResponse.json({ error: "Push notifications are not configured on the server.", result }, { status: 400 });
  }
  if (!result.sent) {
    return NextResponse.json(
      { error: "No active push subscription was found for this account on this device.", result },
      { status: 400 },
    );
  }

  return NextResponse.json({ result });
}
