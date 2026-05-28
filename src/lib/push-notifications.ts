import "server-only";

import webpush from "web-push";
import { compactId } from "@/lib/utils";
import { createInAppNotification } from "@/lib/notifications";
import { dataService } from "@/lib/turso/service";
import type { Engineer, LeaveRequest, PushSubscriptionRecord, Ticket, UserRole } from "@/types/service";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let configured = false;

export function pushPublicKey() {
  return process.env.WEB_PUSH_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || "";
}

export function hasPushConfig() {
  return Boolean(pushPublicKey() && process.env.WEB_PUSH_VAPID_PRIVATE_KEY);
}

export function pushConfigStatus() {
  return {
    publicKey: pushPublicKey(),
    configured: hasPushConfig(),
    missing: [
      pushPublicKey() ? "" : "WEB_PUSH_VAPID_PUBLIC_KEY",
      process.env.WEB_PUSH_VAPID_PRIVATE_KEY ? "" : "WEB_PUSH_VAPID_PRIVATE_KEY",
    ].filter(Boolean),
  };
}

function configureWebPush() {
  if (configured || !hasPushConfig()) return;
  webpush.setVapidDetails(
    process.env.WEB_PUSH_VAPID_SUBJECT || `mailto:${process.env.SMTP_FROM || process.env.SMTP_USER || "admin@srvix.local"}`,
    pushPublicKey(),
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? "",
  );
  configured = true;
}

function toWebPushSubscription(subscription: PushSubscriptionRecord) {
  return {
    endpoint: subscription.Endpoint,
    keys: {
      p256dh: subscription.P256DH,
      auth: subscription.AuthSecret,
    },
  };
}

export async function savePushSubscription({
  userId,
  engineerId,
  role,
  endpoint,
  p256dh,
  authSecret,
  userAgent,
}: {
  userId: string;
  engineerId?: string;
  role?: string;
  endpoint: string;
  p256dh: string;
  authSecret: string;
  userAgent: string;
}) {
  const now = new Date().toISOString();
  return dataService.upsertPushSubscription({
    SubscriptionID: compactId("PSH"),
    UserID: userId,
    EngineerID: engineerId ?? "",
    Role: role === "Admin" || role === "Manager" || role === "Engineer" ? role : "",
    Endpoint: endpoint,
    P256DH: p256dh,
    AuthSecret: authSecret,
    UserAgent: userAgent.slice(0, 500),
    CreatedAt: now,
    LastSeenAt: now,
  });
}

export async function sendPushToSubscriptions(subscriptions: PushSubscriptionRecord[], payload: PushPayload) {
  if (!subscriptions.length || !hasPushConfig()) return { sent: 0, failed: 0, skipped: !hasPushConfig() };

  configureWebPush();
  let sent = 0;
  let failed = 0;
  const uniqueSubscriptions = Array.from(new Map(subscriptions.map((subscription) => [subscription.Endpoint, subscription])).values());

  await Promise.all(
    uniqueSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(toWebPushSubscription(subscription), JSON.stringify(payload));
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await dataService.deletePushSubscription(subscription.Endpoint);
        } else {
          console.warn("Push notification failed", error);
        }
      }
    }),
  );

  return { sent, failed, skipped: false };
}

export async function sendTestPushToUser(userId: string) {
  const subscriptions = await dataService.pushSubscriptionsForUser(userId);
  return sendPushToSubscriptions(subscriptions, {
    title: "SRVIX test notification",
    body: "Push notifications are working on this device.",
    url: "/profile",
    tag: `push-test-${userId}`,
  });
}

async function notifyTarget({
  target,
  payload,
  type,
}: {
  target: { userId?: string; engineerId?: string; role?: UserRole };
  payload: PushPayload;
  type: string;
}) {
  const subscriptions = target.userId
    ? await dataService.pushSubscriptionsForUser(target.userId)
    : target.engineerId
      ? await dataService.pushSubscriptionsForEngineer(target.engineerId)
      : target.role
        ? await dataService.pushSubscriptionsForRole(target.role)
        : [];

  await createInAppNotification({
    type,
    userId: target.userId,
    engineerId: target.engineerId,
    role: target.role,
    subject: payload.title,
    message: payload.body,
    url: payload.url,
  });
  return sendPushToSubscriptions(subscriptions, payload);
}

export async function notifyEngineerTicketAssigned(ticket: Ticket) {
  if (!ticket.AssignedEngineer) return;
  await notifyTarget({
    target: { engineerId: ticket.AssignedEngineer },
    type: "Ticket assigned",
    payload: {
    title: "Ticket assigned",
    body: `${ticket.TicketID}: ${ticket.TicketTitle}`,
    url: `/tickets/${ticket.TicketID}`,
    tag: `ticket-assigned-${ticket.TicketID}`,
    },
  });
}

export async function notifyAdminsLocationSent(engineer: Engineer, remarks: string) {
  await notifyTarget({
    target: { role: "Admin" },
    type: "Location sent",
    payload: {
    title: "Location sent",
    body: `${engineer.EngineerName} shared location. ${remarks}`.slice(0, 180),
    url: "/maps",
    tag: `location-${engineer.EngineerID}`,
    },
  });
}

export async function notifyAdminsTicketClosed(ticket: Ticket, closedBy: string) {
  await notifyTarget({
    target: { role: "Admin" },
    type: "Ticket closed",
    payload: {
    title: "Ticket closed",
    body: `${ticket.TicketID} closed by ${closedBy}: ${ticket.TicketTitle}`,
    url: `/tickets/${ticket.TicketID}`,
    tag: `ticket-closed-${ticket.TicketID}`,
    },
  });
}

export async function notifyAdminsLeaveRequested(request: LeaveRequest) {
  await notifyTarget({
    target: { role: "Admin" },
    type: "Leave requested",
    payload: {
      title: "Leave requested",
      body: `${request.EngineerName} requested leave on ${request.LeaveDate}.`,
      url: "/engineers",
      tag: `leave-request-${request.LeaveRequestID}`,
    },
  });
}

export async function notifyEngineerLeaveReviewed(request: LeaveRequest) {
  await notifyTarget({
    target: { engineerId: request.EngineerID },
    type: `Leave ${request.Status.toLowerCase()}`,
    payload: {
      title: `Leave ${request.Status.toLowerCase()}`,
      body: request.ReviewReason
        ? `${request.LeaveDate}: ${request.ReviewReason}`
        : `${request.LeaveDate}: your leave request was ${request.Status.toLowerCase()}.`,
      url: "/attendance",
      tag: `leave-reviewed-${request.LeaveRequestID}`,
    },
  });
}
