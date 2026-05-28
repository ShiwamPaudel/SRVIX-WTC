import "server-only";

import nodemailer from "nodemailer";
import { compactId } from "@/lib/utils";
import { dataService } from "@/lib/turso/service";
import type { NotificationRecord, UserRole } from "@/types/service";

type NotificationInput = {
  type: string;
  recipient: string;
  userId?: string;
  engineerId?: string;
  role?: UserRole | "";
  subject: string;
  message: string;
  url?: string;
};

function hasMailConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export async function sendNotification(input: NotificationInput) {
  let status = "Queued";
  let sentAt = "";

  if (hasMailConfig()) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: input.recipient,
      subject: input.subject,
      text: input.message,
    });
    status = "Sent";
    sentAt = new Date().toISOString();
  }

  return dataService.createNotification({
    NotificationID: compactId("NTF"),
    Type: input.type,
    Recipient: input.recipient,
    UserID: input.userId ?? "",
    EngineerID: input.engineerId ?? "",
    Role: input.role ?? "",
    Subject: input.subject,
    Message: input.message,
    URL: input.url ?? "",
    Status: status,
    CreatedAt: new Date().toISOString(),
    SentAt: sentAt,
    ReadAt: "",
  });
}

export async function createInAppNotification(input: Omit<NotificationInput, "recipient"> & { recipient?: string }) {
  const now = new Date().toISOString();
  return dataService.createNotification({
    NotificationID: compactId("NTF"),
    Type: input.type,
    Recipient: input.recipient ?? "",
    UserID: input.userId ?? "",
    EngineerID: input.engineerId ?? "",
    Role: input.role ?? "",
    Subject: input.subject,
    Message: input.message,
    URL: input.url ?? "",
    Status: "Unread",
    CreatedAt: now,
    SentAt: "",
    ReadAt: "",
  } satisfies NotificationRecord);
}
