import { AlertTriangle, CalendarCheck, CalendarClock, CheckCircle2, Clock3, Wrench } from "lucide-react";
import { PMSCreateTicketButton } from "@/components/pms-create-ticket-button";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getServiceDataset } from "@/lib/data";
import type { PMSSchedule } from "@/types/service";

type PMSRow = PMSSchedule & {
  due: Date;
  machineName: string;
  machineModel: string;
  machineSerial: string;
  department: string;
  customerName: string;
  engineerName: string;
  pmsNumber: string;
};

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function sameMonth(date: Date, reference: Date) {
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

function daysBetween(start: Date, end: Date) {
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.round((endDay - startDay) / 86400000);
}

function dueTone(row: PMSRow, today: Date) {
  if (row.Status === "Completed") return "text-emerald-700 bg-emerald-50";
  if (row.due < today) return "text-rose-700 bg-rose-50";
  if (daysBetween(today, row.due) <= 7) return "text-amber-700 bg-amber-50";
  return "text-sky-700 bg-sky-50";
}

function dueLabel(row: PMSRow, today: Date) {
  const days = daysBetween(today, row.due);
  if (days < 0) return `Overdue by ${Math.abs(days)} days`;
  if (days === 0) return "Today";
  return `In ${days} days`;
}

export default async function PMSPage() {
  const { pmsSchedule, machines, customers, engineers } = await getServiceDataset();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const rows: PMSRow[] = pmsSchedule
    .map((pms) => {
      const machine = machines.find((item) => item.MachineID === pms.MachineID);
      const customer = customers.find((item) => item.CustomerID === pms.CustomerID);
      const engineer = engineers.find((item) => item.EngineerID === pms.AssignedEngineer);

      return {
        ...pms,
        due: parseDate(pms.DueDate),
        machineName: machine?.DeviceName ?? "Machine not linked",
        machineModel: machine?.Model ?? "",
        machineSerial: machine?.SerialNumber ?? "",
        department: machine?.Department ?? customer?.Department ?? "",
        customerName: customer?.HospitalName ?? "Customer not linked",
        engineerName: engineer?.EngineerName ?? "Unassigned",
        pmsNumber: pms.PMSNumber || "",
      };
    })
    .sort((a, b) => a.due.getTime() - b.due.getTime());

  const pmsCounters = new Map<string, number>();
  for (const row of rows) {
    const next = (pmsCounters.get(row.MachineID) ?? 0) + 1;
    pmsCounters.set(row.MachineID, next);
    if (!row.pmsNumber) row.pmsNumber = String(next);
  }

  const activeRows = rows.filter((row) => row.Status !== "Completed");
  const overdue = activeRows.filter((row) => row.due < today);
  const thisMonth = activeRows.filter((row) => sameMonth(row.due, today));
  const upcoming = activeRows.filter((row) => row.due >= today).slice(0, 8);
  const completedThisMonth = rows.filter((row) => row.Status === "Completed" && sameMonth(row.due, today));

  const plans = machines
    .map((machine) => {
      const machineRows = rows.filter((row) => row.MachineID === machine.MachineID);
      const nextRows = machineRows.filter((row) => row.Status !== "Completed" && row.due >= today);
      const customer = customers.find((item) => item.CustomerID === machine.CustomerID);

      return {
        machine,
        customerName: customer?.HospitalName ?? "Customer not linked",
        department: machine.Department ?? customer?.Department ?? "",
        next: nextRows[0],
        monthRows: machineRows.filter((row) => sameMonth(row.due, today)),
        totalPending: machineRows.filter((row) => row.Status !== "Completed").length,
      };
    })
    .filter((plan) => plan.next || plan.monthRows.length)
    .sort((a, b) => {
      if (!a.next) return 1;
      if (!b.next) return -1;
      return a.next.due.getTime() - b.next.due.getTime();
    });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">PMS Management</h1>
        <p className="text-sm text-slate-500">
          Monthly PMS workload, overdue alerts, upcoming visits, and machine-level maintenance plans.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric title="This month" value={thisMonth.length} icon={CalendarCheck} />
        <Metric title="Upcoming" value={upcoming.length} icon={Clock3} />
        <Metric title="Overdue" value={overdue.length} icon={AlertTriangle} tone="rose" />
        <Metric title="Completed this month" value={completedThisMonth.length} icon={CheckCircle2} tone="green" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Priority Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...overdue, ...upcoming].slice(0, 6).map((row) => (
              <div key={row.PMSID} className={`rounded-md p-3 ${dueTone(row, today)}`}>
                <div className="flex items-center justify-between gap-3">
                  <CalendarClock className="size-5 shrink-0" />
                  <span className="text-sm font-semibold">{formatDate(row.DueDate)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{row.customerName}</p>
                <p className="text-sm">{[row.machineName, row.machineModel, row.department].filter(Boolean).join(" - ")}</p>
              </div>
            ))}
            {![...overdue, ...upcoming].length ? (
              <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No pending PMS alerts.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PMS This Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {thisMonth.map((row) => (
              <div key={row.PMSID} className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[160px_1fr_150px_150px] lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase text-sky-700">PMS No. {row.pmsNumber}</p>
                  <p className="text-sm font-semibold text-slate-950">{formatDate(row.DueDate)}</p>
                  <p className="text-xs text-slate-500">{dueLabel(row, today)}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{row.customerName}</p>
                  <p className="text-sm text-slate-500">
                    {[row.machineName, row.machineModel, row.department].filter(Boolean).join(" - ")}
                  </p>
                </div>
                <div className="flex items-center justify-start md:justify-end">
                  <StatusBadge status={row.Status} />
                </div>
                <div className="flex justify-start lg:justify-end">
                  <PMSCreateTicketButton pmsId={row.PMSID} ticketId={row.TicketID} />
                </div>
              </div>
            ))}
            {!thisMonth.length ? (
              <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No PMS visits scheduled this month.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Machine Maintenance Plans</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.machine.MachineID} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Wrench className="size-4 text-sky-600" />
                    <h2 className="font-semibold text-slate-950">{plan.machine.DeviceName || "Unnamed machine"}</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {[plan.machine.Model, plan.machine.SerialNumber, plan.department].filter(Boolean).join(" - ")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{plan.customerName}</p>
                </div>
                <Badge variant="blue">{plan.totalPending} pending</Badge>
              </div>

              <div className="mt-4 rounded-md bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Next PMS</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {plan.next ? formatDate(plan.next.DueDate) : "No upcoming PMS"}
                </p>
              </div>

              {plan.monthRows.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.monthRows.map((row) => (
                    <span key={row.PMSID} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {formatDate(row.DueDate)}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {!plans.length ? <p className="text-sm text-slate-500">No PMS plans found.</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Completed PMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows
              .filter((row) => row.Status === "Completed")
              .slice(-8)
              .reverse()
              .map((row) => (
                <div key={row.PMSID} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      PMS No. {row.pmsNumber} - {row.customerName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {[row.machineModel, row.machineSerial, row.department].filter(Boolean).join(" - ")}
                    </p>
                    <p className="text-xs text-slate-500">Completed {formatDate(row.CompletionDate || row.DueDate)}</p>
                  </div>
                  <PMSCreateTicketButton pmsId={row.PMSID} ticketId={row.TicketID} />
                </div>
              ))}
            {!rows.some((row) => row.Status === "Completed") ? (
              <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No completed PMS records yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All PMS Ledger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.slice(0, 12).map((row) => (
              <div key={row.PMSID} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    PMS No. {row.pmsNumber} - {formatDate(row.DueDate)}
                  </p>
                  <p className="text-sm text-slate-500">{[row.customerName, row.machineModel].filter(Boolean).join(" - ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={row.Status} />
                  <PMSCreateTicketButton pmsId={row.PMSID} ticketId={row.TicketID} />
                </div>
              </div>
            ))}
            {!rows.length ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No PMS records found.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  tone = "blue",
}: {
  title: string;
  value: number;
  icon: typeof CalendarCheck;
  tone?: "blue" | "green" | "rose";
}) {
  const classes = {
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{title}</p>
        <span className={`grid size-9 place-items-center rounded-md ${classes[tone]}`}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
