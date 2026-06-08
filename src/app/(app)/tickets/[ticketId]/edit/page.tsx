import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { BackButton } from "@/components/back-button";
import { TicketForm } from "@/components/ticket-form";
import { getTicket } from "@/lib/data";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";

export default async function EditTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const [session, ticket, customers, machines, engineers] = await Promise.all([
    auth(),
    getTicket(ticketId),
    dataService.customers(),
    dataService.machines(),
    dataService.engineers(),
  ]);
  if (!ticket) notFound();
  if (session?.user.role === "Engineer") {
    if (session.user.engineerId !== ticket.AssignedEngineer) notFound();
    redirect(`/tickets/${ticket.TicketID}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Edit Ticket</h1>
          <p className="text-sm text-slate-500">{ticket.TicketTitle}</p>
        </div>
        <BackButton fallback={`/tickets/${ticket.TicketID}`} />
      </div>
      <TicketForm customers={customers} machines={machines} engineers={engineers} ticket={ticket} canAssign={isAdmin(session?.user.role)} />
    </div>
  );
}
