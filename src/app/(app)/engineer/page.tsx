import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TicketCard } from "@/components/ticket-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTicketsWithRelations } from "@/lib/data";

export default async function EngineerPanelPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tickets = await getTicketsWithRelations(session.user.role, session.user.engineerId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Engineer Panel</h1>
          <p className="text-sm text-slate-500">Tickets assigned to your engineer account.</p>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Assigned Tickets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {tickets.map((ticket) => <TicketCard key={ticket.TicketID} ticket={ticket} />)}
          {!tickets.length ? <p className="text-sm text-slate-500">No tickets assigned to you.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
