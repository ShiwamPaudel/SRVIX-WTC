import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { activateDuePlannerTickets } from "@/lib/planner-tickets";
import { sendNotification } from "@/lib/notifications";
import { dataService } from "@/lib/turso/service";
import type { NotificationRecord, UserRole } from "@/types/service";

const PLANNER_ACTIVATION_CHECK_INTERVAL_MS = 15 * 60 * 1000;
let lastPlannerActivationCheck = 0;
let plannerActivationCheck: Promise<unknown> | undefined;

function canViewNotification(
  notification: NotificationRecord,
  user: { id?: string; email?: string | null; engineerId?: string; role?: UserRole },
) {
  if (isAdmin(user.role) && notification.Role === "Admin") return true;
  if (notification.UserID && notification.UserID === user.id) return true;
  if (notification.EngineerID && notification.EngineerID === user.engineerId) return true;
  if (notification.Recipient && notification.Recipient === user.email) return true;
  return false;
}

async function activatePlannerTicketsPeriodically() {
  const now = Date.now();
  if (plannerActivationCheck) return plannerActivationCheck;
  if (now - lastPlannerActivationCheck < PLANNER_ACTIVATION_CHECK_INTERVAL_MS) return undefined;

  lastPlannerActivationCheck = now;
  plannerActivationCheck = activateDuePlannerTickets()
    .catch((error) => console.warn("Planner activation check failed", error))
    .finally(() => {
      plannerActivationCheck = undefined;
    });
  return plannerActivationCheck;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  void activatePlannerTicketsPeriodically();
  const visible = await dataService.notificationsForUser(session.user, 50);

  return NextResponse.json({ notifications: visible });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
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

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { notificationId?: string; markAllRead?: boolean };
  const now = new Date().toISOString();

  if (body.markAllRead) {
    const notifications = await dataService.notifications();
    await Promise.all(
      notifications
        .filter((notification) => canViewNotification(notification, session.user))
        .filter((notification) => !notification.ReadAt)
        .map((notification) => dataService.updateNotification(notification.NotificationID, { Status: "Read", ReadAt: now })),
    );
    return NextResponse.json({ ok: true });
  }

  if (!body.notificationId) return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
  const notification = await dataService.notification(body.notificationId);
  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canViewNotification(notification, session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dataService.updateNotification(body.notificationId, { Status: "Read", ReadAt: now });
  return NextResponse.json({ ok: true });
}
