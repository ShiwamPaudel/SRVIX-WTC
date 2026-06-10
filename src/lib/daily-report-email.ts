import "server-only";

import nodemailer from "nodemailer";
import { attendanceReportData, dateForReportLabel, validReportDate } from "@/lib/attendance";
import { dailyReportPdf } from "@/lib/daily-report-pdf";

function splitRecipients(value?: string) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for daily report email.`);
  return value;
}

export function dailyReportEmailConfigStatus() {
  const required = ["ZOHO_SMTP_USER", "ZOHO_SMTP_PASSWORD", "REPORT_EMAIL_TO"];
  const missing = required.filter((name) => !process.env[name]);
  return { configured: missing.length === 0, missing };
}

function dailyReportTransporter() {
  const user = requiredEnv("ZOHO_SMTP_USER");
  const host = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
  const port = Number(process.env.ZOHO_SMTP_PORT || 465);
  const secure = String(process.env.ZOHO_SMTP_SECURE ?? "true").toLowerCase() !== "false";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass: requiredEnv("ZOHO_SMTP_PASSWORD"),
    },
  });
}

export async function verifyDailyReportEmailSetup() {
  const config = dailyReportEmailConfigStatus();
  if (!config.configured) return { ok: false, config };

  const transporter = dailyReportTransporter();
  try {
    await transporter.verify();
    return {
      ok: true,
      config,
      recipients: splitRecipients(requiredEnv("REPORT_EMAIL_TO")).length,
      host: process.env.ZOHO_SMTP_HOST || "smtp.zoho.com",
      port: Number(process.env.ZOHO_SMTP_PORT || 465),
    };
  } finally {
    transporter.close();
  }
}

export async function sendDailyReportEmail(dateInput?: string) {
  const date = validReportDate(dateInput);
  const label = dateForReportLabel(date);
  const report = await attendanceReportData();
  const pdf = await dailyReportPdf({ date, engineers: report.engineers, events: report.events });
  const user = requiredEnv("ZOHO_SMTP_USER");
  const recipients = splitRecipients(requiredEnv("REPORT_EMAIL_TO"));
  const from = process.env.REPORT_EMAIL_FROM || user;
  const transporter = dailyReportTransporter();

  const subject = `Service Department - Daily Reporting (${label})- Web Trading Concern Pvt. Ltd.`;
  const body = `Dear WTC's Management,\n\nPlease find the Service Department Daily Reports of the Engineer's attached in the Mail for the ${label}.`;
  const filename = `service-daily-report-${date}.pdf`;

  const result = await transporter.sendMail({
    from,
    to: recipients,
    subject,
    text: body,
    attachments: [
      {
        filename,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  }).finally(() => transporter.close());

  return {
    date,
    recipients,
    messageId: result.messageId,
    attachment: filename,
  };
}
