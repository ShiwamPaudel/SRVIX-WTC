import { Activity, AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Metric = {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function DashboardCards({
  open,
  closed,
  pendingPms,
  activeEngineers,
  critical,
  slaPulse,
}: {
  open: number;
  closed: number;
  pendingPms: number;
  activeEngineers: number;
  critical: number;
  slaPulse: number;
}) {
  const metrics: Metric[] = [
    { label: "Pending Tickets", value: open, detail: "Needs service action", icon: ClipboardList },
    { label: "Closed Tickets", value: closed, detail: "Completed workflow", icon: CheckCircle2 },
    { label: "Pending PMS", value: pendingPms, detail: "Due or scheduled", icon: CalendarClock },
    { label: "Active Engineers", value: activeEngineers, detail: "Field capacity", icon: Users },
    { label: "Critical", value: critical, detail: "Escalation queue", icon: AlertTriangle },
    { label: "SLA Pulse", value: `${slaPulse}%`, detail: "Closed within 48 hrs", icon: Activity },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
            </div>
            <div className="grid size-11 place-items-center rounded-md bg-sky-50 text-sky-700">
              <metric.icon className="size-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
