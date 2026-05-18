import { notFound } from "next/navigation";
import { TicketForm } from "@/components/ticket-form";
import { getServiceDataset, getTicket } from "@/lib/data";

export default async function EditTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const [ticket, dataset] = await Promise.all([getTicket(ticketId), getServiceDataset()]);
  if (!ticket) notFound();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Edit Ticket</h1>
        <p className="text-sm text-slate-500">{ticket.TicketTitle}</p>
      </div>
      <TicketForm customers={dataset.customers} machines={dataset.machines} engineers={dataset.engineers} ticket={ticket} />
    </div>
  );
}
