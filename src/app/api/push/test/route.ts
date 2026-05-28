import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pushConfigStatus, sendTestPushToUser } from "@/lib/push-notifications";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = pushConfigStatus();
  if (!config.configured) {
    return NextResponse.json(
      { error: `Push server config missing: ${config.missing.join(", ")}`, config },
      { status: 400 },
    );
  }

  const result = await sendTestPushToUser(session.user.id);
  if (!result.subscriptionCount) {
    return NextResponse.json(
      { error: "No saved push subscription found for this account. Disable and enable push on this device again.", result },
      { status: 400 },
    );
  }
  if (!result.sent) {
    const detail = result.errors[0]?.body || result.errors[0]?.message || "The push provider rejected the saved subscription.";
    return NextResponse.json(
      { error: `Push delivery failed. ${detail}`, result },
      { status: 400 },
    );
  }

  return NextResponse.json({ result });
}
