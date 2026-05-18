import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardCards } from "@/components/dashboard-cards";
import { DashboardInsights } from "@/components/dashboard-insights";
import { KPICharts } from "@/components/kpi-charts";
import { GoogleMapView } from "@/components/google-map-view";
import { TicketCard } from "@/components/ticket-card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics, getTicketsWithRelations } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const tickets = await getTicketsWithRelations();
  const recentTickets = tickets.slice(0, 3);
  const mapPoints = tickets
    .filter((ticket) => ticket.Latitude && ticket.Longitude)
    .map((ticket) => ({
      id: ticket.TicketID,
      title: ticket.customer?.HospitalName ?? "Customer not linked",
      subtitle: `${ticket.TicketStatus} - ${ticket.TicketTitle}`,
      latitude: Number(ticket.Latitude),
      longitude: Number(ticket.Longitude),
      status: ticket.TicketStatus,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-700"></p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
        </div>
        <Button asChild>
          <Link href="/tickets/new">
            <Plus className="size-4" />
            New ticket
          </Link>
        </Button>
      </div>
      <DashboardCards
        open={metrics.open}
        closed={metrics.closed}
        pendingPms={metrics.pendingPms}
        activeEngineers={metrics.activeEngineers}
        critical={metrics.critical}
        slaPulse={metrics.slaPulse}
      />
      <DashboardInsights
        tickets={metrics.tickets}
        engineers={metrics.engineers}
        pmsSchedule={metrics.pmsSchedule}
        contracts={metrics.contracts}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <KPICharts tickets={metrics.tickets} engineers={metrics.engineers} />
          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentTickets.map((ticket) => <TicketCard key={ticket.TicketID} ticket={ticket} />)}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <GoogleMapView points={mapPoints} />
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline logs={metrics.logs.slice(0, 5)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
