import "server-only";

import webpush from "web-push";
import { compactId } from "@/lib/utils";
import { dataService } from "@/lib/turso/service";
import type { Engineer, PushSubscriptionRecord, Ticket } from "@/types/service";

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

export async function notifyEngineerTicketAssigned(ticket: Ticket) {
  if (!ticket.AssignedEngineer) return;
  const subscriptions = await dataService.pushSubscriptionsForEngineer(ticket.AssignedEngineer);
  await sendPushToSubscriptions(subscriptions, {
    title: "Ticket assigned",
    body: `${ticket.TicketID}: ${ticket.TicketTitle}`,
    url: `/tickets/${ticket.TicketID}`,
    tag: `ticket-assigned-${ticket.TicketID}`,
  });
}

export async function notifyAdminsLocationSent(engineer: Engineer, remarks: string) {
  const subscriptions = await dataService.pushSubscriptionsForRole("Admin");
  await sendPushToSubscriptions(subscriptions, {
    title: "Location sent",
    body: `${engineer.EngineerName} shared location. ${remarks}`.slice(0, 180),
    url: "/maps",
    tag: `location-${engineer.EngineerID}`,
  });
}

export async function notifyAdminsTicketClosed(ticket: Ticket, closedBy: string) {
  const subscriptions = await dataService.pushSubscriptionsForRole("Admin");
  await sendPushToSubscriptions(subscriptions, {
    title: "Ticket closed",
    body: `${ticket.TicketID} closed by ${closedBy}: ${ticket.TicketTitle}`,
    url: `/tickets/${ticket.TicketID}`,
    tag: `ticket-closed-${ticket.TicketID}`,
  });
}
