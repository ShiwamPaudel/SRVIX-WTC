import { CalendarClock, CheckCircle2, ClipboardList, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type Metric = {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function DashboardCards({
  open,
  closed,
  pendingPms,
  activeEngineers,
}: {
  open: number;
  closed: number;
  pendingPms: number;
  activeEngineers: number;
}) {
  const metrics: Metric[] = [
    { label: "Pending Tickets", value: open, detail: "Needs service action", href: "/tickets?status=Pending", icon: ClipboardList },
    { label: "Closed Tickets", value: closed, detail: "Completed workflow", href: "/tickets?status=Closed", icon: CheckCircle2 },
    {
      label: "Pending PMS Tickets",
      value: pendingPms,
      detail: "Pending PMS tickets",
      href: "/tickets?status=Pending&serviceType=PMS",
      icon: CalendarClock,
    },
    { label: "Active Engineers", value: activeEngineers, detail: "Field capacity", href: "/engineers", icon: Users },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
          <Link
            href={metric.href}
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
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
          </Link>
        </Card>
      ))}
    </div>
  );
}
