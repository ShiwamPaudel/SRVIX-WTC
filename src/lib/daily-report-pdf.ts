import "server-only";

import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { dateForReportLabel, eventTime, eventTimeLabel, type AttendanceEngineer, type AttendanceEvent } from "@/lib/attendance";

const page = {
  width: 595.28,
  height: 841.89,
  marginX: 38,
  bottom: 804,
  startY: 128,
  columnGap: 34,
};

const colors = {
  text: "#14213d",
  muted: "#4b5563",
  black: "#000000",
  acceptedBg: "#e0f2fe",
  acceptedText: "#0369a1",
  closedBg: "#d1fae5",
  closedText: "#047857",
  inBg: "#d1fae5",
  inText: "#047857",
  outBg: "#fef3c7",
  outText: "#b45309",
};

type EventParts = {
  label: string;
  body: string;
  badge?: string;
};

function collectDocument(doc: PDFKit.PDFDocument, render: () => void) {
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    render();
    doc.end();
  });
}

function splitWords(text: string) {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

function wrapWords(doc: PDFKit.PDFDocument, text: string, firstLineWidth: number, nextLineWidth: number) {
  const words = splitWords(text);
  if (!words.length) return [""];
  const lines: string[] = [];
  let line = "";
  let lineWidth = firstLineWidth;

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (doc.widthOfString(next) <= lineWidth || !line) {
      line = next;
      return;
    }
    lines.push(line);
    line = word;
    lineWidth = nextLineWidth;
  });
  if (line) lines.push(line);
  return lines;
}

function eventParts(event: AttendanceEvent): EventParts {
  if (event.type === "Ticket") {
    const match = event.detail.match(/^(.*)\s(accepted|closed)$/i);
    if (match) {
      return {
        label: "Ticket",
        body: match[1],
        badge: match[2].toLowerCase() === "closed" ? "Closed" : "Accepted",
      };
    }
  }

  if (event.type === "Location") {
    const match = event.detail.match(/^(.*)\s-\s(In|Out)$/);
    if (match) return { label: "Location", body: match[1], badge: match[2] };
  }

  return { label: event.type, body: event.detail };
}

function badgeStyle(value: string) {
  if (value === "Accepted") return { bg: colors.acceptedBg, text: colors.acceptedText };
  if (value === "Closed") return { bg: colors.closedBg, text: colors.closedText };
  if (value === "In") return { bg: colors.inBg, text: colors.inText };
  if (value === "Out") return { bg: colors.outBg, text: colors.outText };
  return { bg: "#f1f5f9", text: colors.text };
}

function measureEvent(doc: PDFKit.PDFDocument, event: AttendanceEvent, width: number) {
  const parts = eventParts(event);
  doc.font("Helvetica-Bold").fontSize(10.5);
  const prefixWidth = doc.widthOfString(`${parts.label} - `);
  doc.font("Helvetica").fontSize(10.5);
  const lines = wrapWords(doc, parts.body || "-", width - prefixWidth, width);
  let lineCount = lines.length;
  const lastLine = lines[lines.length - 1] ?? "";
  const lastLineWidth = lines.length === 1 ? prefixWidth + doc.widthOfString(lastLine) : doc.widthOfString(lastLine);
  const time = eventTimeLabel(event.sortAt);

  if (parts.badge) {
    doc.font("Helvetica-Bold").fontSize(9);
    const badgeWidth = doc.widthOfString(parts.badge) + 8;
    doc.font("Helvetica").fontSize(10.5);
    const timeWidth = time ? doc.widthOfString(` (${time})`) + 4 : 0;
    if (lastLineWidth + badgeWidth + timeWidth + 8 > width) lineCount += 1;
  } else if (time && lastLineWidth + doc.widthOfString(` (${time})`) + 4 > width) {
    lineCount += 1;
  }

  return lineCount * 14 + 3;
}

function blockHeight(doc: PDFKit.PDFDocument, events: AttendanceEvent[], width: number) {
  if (!events.length) return 48;
  return 24 + events.reduce((height, event) => height + measureEvent(doc, event, width) + 5, 0);
}

function drawBadge(doc: PDFKit.PDFDocument, value: string, x: number, y: number) {
  const style = badgeStyle(value);
  doc.font("Helvetica-Bold").fontSize(9);
  const badgeWidth = doc.widthOfString(value) + 8;
  doc.roundedRect(x, y - 1, badgeWidth, 12, 3).fill(style.bg);
  doc.fillColor(style.text).text(value, x + 4, y, { lineBreak: false });
  return badgeWidth;
}

function drawEvent(doc: PDFKit.PDFDocument, event: AttendanceEvent, x: number, y: number, width: number) {
  const parts = eventParts(event);
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(colors.black);
  const prefix = `${parts.label} - `;
  const prefixWidth = doc.widthOfString(prefix);
  doc.font("Helvetica").fontSize(10.5).fillColor(colors.text);
  const lines = wrapWords(doc, parts.body || "-", width - prefixWidth, width);

  lines.forEach((line, index) => {
    const lineY = y + index * 14;
    if (index === 0) {
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(colors.black).text(prefix, x, lineY, { lineBreak: false });
      doc.font("Helvetica").fontSize(10.5).fillColor(colors.text).text(line, x + prefixWidth, lineY, {
        width: width - prefixWidth,
        lineBreak: false,
      });
      return;
    }
    doc.font("Helvetica").fontSize(10.5).fillColor(colors.text).text(line, x, lineY, { width, lineBreak: false });
  });

  let cursorY = y + (lines.length - 1) * 14;
  const lastLine = lines[lines.length - 1] ?? "";
  let cursorX = x + (lines.length === 1 ? prefixWidth : 0) + doc.widthOfString(lastLine) + 5;
  const time = eventTimeLabel(event.sortAt);

  if (parts.badge) {
    doc.font("Helvetica-Bold").fontSize(9);
    const badgeWidth = doc.widthOfString(parts.badge) + 8;
    doc.font("Helvetica").fontSize(10.5);
    const timeWidth = time ? doc.widthOfString(` (${time})`) + 4 : 0;
    if (cursorX + badgeWidth + timeWidth > x + width) {
      cursorY += 14;
      cursorX = x;
    }
    const drawnBadgeWidth = drawBadge(doc, parts.badge, cursorX, cursorY + 1);
    cursorX += drawnBadgeWidth + 4;
  }

  if (time) {
    if (cursorX + doc.widthOfString(`(${time})`) > x + width) {
      cursorY += 14;
      cursorX = x;
    }
    doc.font("Helvetica").fontSize(10.5).fillColor(colors.text).text(`(${time})`, cursorX, cursorY, { lineBreak: false });
  }

  return Math.max(measureEvent(doc, event, width), cursorY - y + 15);
}

function drawHeader(doc: PDFKit.PDFDocument, date: string) {
  doc.font("Helvetica-Bold").fontSize(32).fillColor("#0b22c9").text("WTC", page.width - 112, 8, {
    width: 82,
    align: "right",
    lineBreak: false,
  });
  doc.font("Helvetica-Bold").fontSize(4.8).fillColor("#38b6ff").text("Web Trading Concern Pvt. Ltd.", page.width - 112, 42, {
    width: 82,
    align: "right",
    lineBreak: false,
  });

  doc.font("Helvetica-Bold").fontSize(14).fillColor(colors.black).text("SERVICE - DAILY REPORTING", 0, 58, {
    align: "center",
    width: page.width,
  });
  doc.font("Helvetica").fontSize(10.5).fillColor(colors.black).text(`Date: ${dateForReportLabel(date, { weekday: true })}`, 0, 80, {
    align: "center",
    width: page.width,
  });
}

function drawEngineerBlock(
  doc: PDFKit.PDFDocument,
  engineer: AttendanceEngineer,
  events: AttendanceEvent[],
  x: number,
  y: number,
  width: number,
) {
  doc.font("Helvetica-Bold").fontSize(12.5).fillColor(colors.black).text(engineer.name || "Unnamed engineer", x, y, {
    width,
    lineBreak: false,
  });
  let cursorY = y + 28;
  if (!events.length) {
    doc.font("Helvetica").fontSize(11).fillColor(colors.black).text("-", x, cursorY, { width, lineBreak: false });
    return 48;
  }

  events.forEach((event) => {
    const used = drawEvent(doc, event, x, cursorY, width);
    cursorY += used + 5;
  });
  return cursorY - y;
}

export async function dailyReportPdf({
  date,
  engineers,
  events,
}: {
  date: string;
  engineers: AttendanceEngineer[];
  events: AttendanceEvent[];
}) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 36, left: page.marginX, right: page.marginX, bottom: 36 },
    info: {
      Title: `Service Department - Daily Reporting ${date}`,
      Author: "SRVIX",
      Subject: "Service Department Daily Reporting",
    },
  });

  return collectDocument(doc, () => {
    const columnWidth = (page.width - page.marginX * 2 - page.columnGap) / 2;
    const sortedEngineers = [...engineers].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    const midpoint = Math.ceil(sortedEngineers.length / 2);
    const left = sortedEngineers.slice(0, midpoint);
    const right = sortedEngineers.slice(midpoint);
    const rows = Array.from({ length: Math.max(left.length, right.length) }, (_, index) => [left[index], right[index]] as const);
    const eventsForDate = events
      .filter((event) => event.date === date)
      .sort((a, b) => eventTime(a.sortAt) - eventTime(b.sortAt));
    const eventsByEngineer = eventsForDate.reduce<Map<string, AttendanceEvent[]>>((grouped, event) => {
      grouped.set(event.engineerId, [...(grouped.get(event.engineerId) ?? []), event]);
      return grouped;
    }, new Map());

    drawHeader(doc, date);
    let y = page.startY;

    if (!rows.length) {
      doc.font("Helvetica").fontSize(11).fillColor(colors.muted).text("No engineer records found.", page.marginX, y);
      return;
    }

    rows.forEach(([leftEngineer, rightEngineer]) => {
      const leftEvents = leftEngineer ? eventsByEngineer.get(leftEngineer.id) ?? [] : [];
      const rightEvents = rightEngineer ? eventsByEngineer.get(rightEngineer.id) ?? [] : [];
      const leftHeight = leftEngineer ? blockHeight(doc, leftEvents, columnWidth) : 0;
      const rightHeight = rightEngineer ? blockHeight(doc, rightEvents, columnWidth) : 0;
      const rowHeight = Math.max(leftHeight, rightHeight, 48);

      if (y + rowHeight > page.bottom && y > page.startY) {
        doc.addPage();
        drawHeader(doc, date);
        y = page.startY;
      }

      if (leftEngineer) drawEngineerBlock(doc, leftEngineer, leftEvents, page.marginX + 10, y, columnWidth - 12);
      if (rightEngineer) {
        drawEngineerBlock(doc, rightEngineer, rightEvents, page.marginX + columnWidth + page.columnGap + 10, y, columnWidth - 12);
      }
      y += rowHeight + 22;
    });
  });
}
