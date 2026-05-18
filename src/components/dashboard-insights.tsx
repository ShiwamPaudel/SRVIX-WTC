"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContractRecord, Engineer, PMSSchedule, Ticket } from "@/types/service";

const colors = ["#0284c7", "#059669", "#f59e0b", "#e11d48", "#64748b", "#7c3aed"];
const dayMs = 24 * 60 * 60 * 1000;

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function countBy<T extends string>(items: T[], order: T[]) {
  return order.map((name) => ({ name, value: items.filter((item) => item === name).length })).filter((item) => item.value > 0);
}

export function DashboardInsights({
  tickets,
  engineers,
  pmsSchedule,
  contracts,
}: {
  tickets: Ticket[];
  engineers: Engineer[];
  pmsSchedule: PMSSchedule[];
  contracts: ContractRecord[];
}) {
  const now = new Date();
  const openTickets = tickets.filter((ticket) => ticket.TicketStatus !== "Closed");
  const priorityData = countBy(
    openTickets.map((ticket) => ticket.Priority),
    ["Critical", "High", "Medium", "Low"],
  );
  const serviceData = Object.entries(
    tickets.reduce<Record<string, number>>((record, ticket) => {
      record[ticket.ServiceType] = (record[ticket.ServiceType] ?? 0) + 1;
      return record;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const pmsData = [
    {
      name: "Overdue",
      value: pmsSchedule.filter((pms) => pms.Status !== "Completed" && parseDate(pms.DueDate) && parseDate(pms.DueDate)! < now).length,
    },
    {
      name: "Due 7 days",
      value: pmsSchedule.filter((pms) => {
        const due = parseDate(pms.DueDate);
        if (!due || pms.Status === "Completed") return false;
        const diff = due.getTime() - now.getTime();
        return diff >= 0 && diff <= 7 * dayMs;
      }).length,
    },
    { name: "Scheduled", value: pmsSchedule.filter((pms) => pms.Status === "Scheduled").length },
    { name: "Completed", value: pmsSchedule.filter((pms) => pms.Status === "Completed").length },
  ];
  const agingData = [
    { name: "0-2d", value: 0 },
    { name: "3-7d", value: 0 },
    { name: "8-14d", value: 0 },
    { name: "15d+", value: 0 },
  ];
  openTickets.forEach((ticket) => {
    const opened = parseDate(ticket.TicketDate || ticket.Date);
    if (!opened) return;
    const age = Math.floor((now.getTime() - opened.getTime()) / dayMs);
    if (age <= 2) agingData[0].value += 1;
    else if (age <= 7) agingData[1].value += 1;
    else if (age <= 14) agingData[2].value += 1;
    else agingData[3].value += 1;
  });
  const contractWatch = contracts
    .map((contract) => ({ ...contract, endDate: parseDate(contract.ContractEnd) }))
    .filter((contract) => contract.endDate && contract.Status !== "Expired")
    .sort((a, b) => a.endDate!.getTime() - b.endDate!.getTime())
    .slice(0, 5);
  const liveEngineers = engineers.filter((engineer) => {
    const updated = parseDate(engineer.LastLocationUpdate);
    return updated && now.getTime() - updated.getTime() <= 2 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Open Ticket Priority</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {priorityData.map((_, index) => <Cell key={index} fill={colors[index]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Service Mix</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={serviceData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                {serviceData.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>PMS Readiness</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pmsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Open Ticket Aging</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agingData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Field Signal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
            <span className="text-sm font-medium text-slate-700">Live in 2 hrs</span>
            <Badge variant="green">{liveEngineers}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
            <span className="text-sm font-medium text-slate-700">No recent signal</span>
            <Badge variant="amber">{Math.max(engineers.length - liveEngineers, 0)}</Badge>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Contracts ending soon</p>
            {contractWatch.map((contract) => (
              <div key={contract.ContractID} className="rounded-md border border-slate-200 p-2">
                <p className="truncate text-sm font-semibold text-slate-950">{contract.NameOfCustomer}</p>
                <p className="text-xs text-slate-500">{contract.ContractType} ends {contract.ContractEnd}</p>
              </div>
            ))}
            {!contractWatch.length ? <p className="text-sm text-slate-500">No active contract alerts.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
