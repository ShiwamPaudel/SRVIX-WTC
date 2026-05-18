import { TicketForm } from "@/components/ticket-form";
import { getServiceDataset } from "@/lib/data";

export default async function NewTicketPage() {
  const { customers, machines, engineers } = await getServiceDataset();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Create Ticket</h1>
        <p className="text-sm text-slate-500">Customer-linked machine filtering, contract autofill, GPS coordinates, and attachments.</p>
      </div>
      <TicketForm customers={customers} machines={machines} engineers={engineers} />
    </div>
  );
}
