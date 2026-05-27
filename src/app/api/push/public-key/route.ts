import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pushPublicKey } from "@/lib/push-notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    publicKey: pushPublicKey(),
    configured: Boolean(pushPublicKey()),
  });
}
