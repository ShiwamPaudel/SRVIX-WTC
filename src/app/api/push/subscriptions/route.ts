import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { savePushSubscription } from "@/lib/push-notifications";
import { dataService } from "@/lib/turso/service";

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as PushSubscriptionPayload;
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  const subscription = await savePushSubscription({
    userId: session.user.id,
    engineerId: session.user.engineerId,
    role: session.user.role,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    authSecret: body.keys.auth,
    userAgent: request.headers.get("user-agent") ?? "",
  });

  return NextResponse.json({ subscription });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (!body.endpoint) return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });

  await dataService.deletePushSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}
