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

  try {
    const result = await sendTestPushToUser(session.user.id);
    if (!result.subscriptionCount) {
      return NextResponse.json(
        { error: "No saved push subscription found for this account. Enable push on this device again.", result },
        { status: 400 },
      );
    }
    if (result.skipped) {
      return NextResponse.json(
        { error: "Push delivery was skipped because server push configuration is incomplete.", result },
        { status: 400 },
      );
    }
    if (!result.sent) {
      const firstError = result.errors[0];
      const providerStatus = firstError?.statusCode ? `Provider status ${firstError.statusCode}. ` : "";
      const detail = firstError?.body || firstError?.message || "The push provider rejected the saved subscription.";
      return NextResponse.json(
        { error: `Push delivery failed. ${providerStatus}${detail}`, result },
        { status: 400 },
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Push delivery failed before contacting the push provider." },
      { status: 500 },
    );
  }
}
