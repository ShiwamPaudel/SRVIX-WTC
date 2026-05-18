"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Ticket, Engineer } from "@/types/service";

const dayMs = 24 * 60 * 60 * 1000;

function dateKey(value?: string) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function shortDay(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function KPICharts({ tickets, engineers }: { tickets: Ticket[]; engineers: Engineer[] }) {
  const today = new Date();
  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getTime() - (6 - index) * dayMs).toISOString().slice(0, 10);
    return {
      day: shortDay(date),
      opened: tickets.filter((ticket) => dateKey(ticket.TicketDate || ticket.Date) === date).length,
      closed: tickets.filter((ticket) => ticket.TicketStatus === "Closed" && dateKey(ticket.CompletionDate || ticket.LastUpdated) === date).length,
    };
  });

  const performance = engineers
    .map((engineer) => {
      const assigned = tickets.filter((ticket) => ticket.AssignedEngineer === engineer.EngineerID);
      return {
        name: engineer.EngineerName.split(" ")[0] || engineer.EngineerID,
        resolved: assigned.filter((ticket) => ticket.TicketStatus === "Closed").length,
        pending: assigned.filter((ticket) => ticket.TicketStatus !== "Closed").length,
      };
    })
    .filter((engineer) => engineer.resolved || engineer.pending)
    .slice(0, 8);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ticket Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="opened" stroke="#0284c7" strokeWidth={3} />
              <Line type="monotone" dataKey="closed" stroke="#059669" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Engineer Performance</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="resolved" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
