import { KPICharts } from "@/components/kpi-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServiceDataset } from "@/lib/data";

export default async function AnalyticsPage() {
  const { tickets, engineers, machines } = await getServiceDataset();
  const contracts = Array.from(new Set(tickets.map((ticket) => ticket.ContractType))).map((contract) => ({
    contract,
    count: tickets.filter((ticket) => ticket.ContractType === contract).length,
  }));
  const repeatBreakdowns = tickets.filter((ticket) => ticket.ServiceType.includes("Breakdown"));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Analytics</h1>
        <p className="text-sm text-slate-500">Trends, resolution time, repeat breakdowns, contract-wise issues, and engineer performance.</p>
      </div>
      <KPICharts tickets={tickets} engineers={engineers} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Contract-wise Issues</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contracts.map((item) => (
              <div key={item.contract} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{item.contract}</span>
                <Badge variant="blue">{item.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Repeat Breakdowns</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {repeatBreakdowns.map((ticket) => {
              const machine = machines.find((item) => item.MachineID === ticket.MachineID);
              return (
                <div key={ticket.TicketID} className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-950">{ticket.TicketTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {machine?.DeviceName ?? "Machine not linked"} - {ticket.Priority}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
