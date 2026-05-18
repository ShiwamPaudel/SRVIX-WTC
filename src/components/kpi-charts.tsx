"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Ticket, Engineer } from "@/types/service";

export function KPICharts({ tickets, engineers }: { tickets: Ticket[]; engineers: Engineer[] }) {
  const trend = ["May 10", "May 11", "May 12", "May 13", "May 14"].map((day, index) => ({
    day,
    tickets: Math.max(1, tickets.length + index - 2),
    closed: Math.max(0, index - 1),
  }));

  const performance = engineers.map((engineer, index) => ({
    name: engineer.EngineerName.split(" ")[0],
    resolved: 5 - index,
    pending: index + 1,
  }));

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
              <Line type="monotone" dataKey="tickets" stroke="#0284c7" strokeWidth={3} />
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
