"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Download } from "lucide-react";
import { FilterField, FilterSummary, FilterToolbar, filterInputClass, filterSelectClass } from "@/components/filter-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { APP_TIME_ZONE, formatDate, toDateInputValue } from "@/lib/utils";

type AttendanceEngineer = {
  id: string;
  name: string;
  department?: string;
};

type AttendanceEvent = {
  engineerId: string;
  date: string;
  sortAt?: string;
  type: "Ticket" | "Location" | "Leave";
  detail: string;
};

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function dateRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function eventLabel(events: AttendanceEvent[]) {
  if (!events.length) return "-";
  return events.map((event) => eventDescription(event)).join("; ");
}

function eventTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function eventTimeLabel(value?: string) {
  if (!value || !value.includes(":")) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function eventDescription(event: AttendanceEvent) {
  const time = eventTimeLabel(event.sortAt);
  return `${event.type} - ${event.detail}${time ? ` (${time})` : ""}`;
}

function actionClass(value: string) {
  if (value.toLowerCase() === "accepted") return "bg-sky-50 text-sky-700 ring-sky-100";
  if (value.toLowerCase() === "closed") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (value === "In") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (value === "Out") return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-slate-50 text-slate-700 ring-slate-100";
}

function ActionText({ children }: { children: string }) {
  return <span className={`rounded px-1.5 py-0.5 font-semibold ring-1 ${actionClass(children)}`}>{children}</span>;
}

function EventDetail({ event }: { event: AttendanceEvent }) {
  if (event.type === "Ticket") {
    const match = event.detail.match(/^(.*)\s(accepted|closed)$/i);
    if (match) {
      const action = match[2].toLowerCase() === "closed" ? "Closed" : "Accepted";
      return (
        <>
          {match[1]} <ActionText>{action}</ActionText>
        </>
      );
    }
  }

  if (event.type === "Location") {
    const match = event.detail.match(/^(.*)\s-\s(In|Out)$/);
    if (match) {
      return (
        <>
          {match[1]} - <ActionText>{match[2]}</ActionText>
        </>
      );
    }
  }

  return <>{event.detail}</>;
}

export function AttendanceReport({
  engineers,
  events,
  defaultFrom,
  defaultTo,
  canChooseEngineer = false,
}: {
  engineers: AttendanceEngineer[];
  events: AttendanceEvent[];
  defaultFrom: string;
  defaultTo: string;
  canChooseEngineer?: boolean;
}) {
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [engineerId, setEngineerId] = useState("");

  const visibleEngineers = useMemo(
    () => (canChooseEngineer && engineerId ? engineers.filter((engineer) => engineer.id === engineerId) : engineers),
    [canChooseEngineer, engineerId, engineers],
  );

  const days = useMemo(() => dateRange(dateFrom, dateTo), [dateFrom, dateTo]);
  const eventsByCell = useMemo(() => {
    const map = new Map<string, AttendanceEvent[]>();
    events.forEach((event) => {
      const key = `${event.date}:${event.engineerId}`;
      map.set(key, [...(map.get(key) ?? []), event]);
    });
    map.forEach((cellEvents) => {
      cellEvents.sort((a, b) => eventTime(a.sortAt) - eventTime(b.sortAt));
    });
    return map;
  }, [events]);

  const presentCells = days.reduce(
    (count, date) =>
      count + visibleEngineers.filter((engineer) => (eventsByCell.get(`${date}:${engineer.id}`) ?? []).some((event) => event.type !== "Leave")).length,
    0,
  );
  const possibleCells = days.length * visibleEngineers.length;
  const attendancePercent = possibleCells ? Math.round((presentCells / possibleCells) * 100) : 0;

  function exportCsv() {
    const headers = ["Dates\\Engineer", ...visibleEngineers.map((engineer) => engineer.name)];
    const rows = days.map((date) => [
      date,
      ...visibleEngineers.map((engineer) => eventLabel(eventsByCell.get(`${date}:${engineer.id}`) ?? [])),
    ]);
    const summary = [
      ["Range", `${dateFrom} to ${dateTo}`],
      ["Engineers", visibleEngineers.length],
      ["Present cells", presentCells],
      ["Attendance %", `${attendancePercent}%`],
      [],
    ];
    const csv = [...summary, headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <FilterToolbar
        summary={
          <>
            <FilterSummary>{days.length} days</FilterSummary>
            <FilterSummary>{visibleEngineers.length} engineers</FilterSummary>
          </>
        }
        actions={
          <Button type="button" variant="secondary" onClick={exportCsv} disabled={!days.length || !visibleEngineers.length}>
            <Download className="size-4" />
            Export Excel CSV
          </Button>
        }
      >
        <FilterField label="From">
          <Input className={filterInputClass} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Date from" />
        </FilterField>
        <FilterField label="To">
          <Input className={filterInputClass} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Date to" />
        </FilterField>
        {canChooseEngineer ? (
          <FilterField label="Engineer" className="min-w-56">
            <SelectNative value={engineerId} onChange={(event) => setEngineerId(event.target.value)} className={filterSelectClass}>
              <option value="">All engineers</option>
              {engineers.map((engineer) => (
                <option key={engineer.id} value={engineer.id}>
                  {engineer.name}
                </option>
              ))}
            </SelectNative>
          </FilterField>
        ) : null}
      </FilterToolbar>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-sky-600" />
            <p className="font-semibold text-slate-950">Monthly Attendance Matrix</p>
          </div>
          <Badge variant="blue">
            {formatDate(dateFrom)} - {formatDate(dateTo)}
          </Badge>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase text-slate-500">
                <th className="sticky left-0 z-10 min-w-36 border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold">
                  Dates\Engineer
                </th>
                {visibleEngineers.map((engineer) => (
                  <th key={engineer.id} className="min-w-72 border-b border-slate-200 px-4 py-3 font-semibold">
                    {engineer.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((date) => (
                <tr key={date} className="align-top">
                  <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 font-medium text-slate-800">
                    {date}
                  </td>
                  {visibleEngineers.map((engineer) => {
                    const cellEvents = eventsByCell.get(`${date}:${engineer.id}`) ?? [];
                    const isLeave = cellEvents.some((event) => event.type === "Leave");
                    const isPresent = cellEvents.some((event) => event.type !== "Leave");
                    return (
                      <td key={engineer.id} className="border-b border-slate-100 px-4 py-3">
                        {cellEvents.length ? (
                          <div className="space-y-2">
                            {isPresent ? <Badge variant="green">Present</Badge> : null}
                            {isLeave ? <Badge variant="blue">Leave</Badge> : null}
                            {cellEvents.map((event, index) => (
                              <p key={`${event.type}-${index}`} className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-950">{event.type}</span> - <EventDetail event={event} />
                                {eventTimeLabel(event.sortAt) ? ` (${eventTimeLabel(event.sortAt)})` : ""}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!days.length || !visibleEngineers.length ? (
                <tr>
                  <td colSpan={Math.max(1, visibleEngineers.length + 1)} className="px-4 py-8 text-center text-sm text-slate-500">
                    No attendance rows match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
