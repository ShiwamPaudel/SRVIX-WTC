import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TicketForm } from "@/components/ticket-form";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";

export default async function NewTicketPage() {
  const session = await auth();
  if (!isAdmin(session?.user.role)) redirect("/tickets");

  const [customers, machines, engineers] = await Promise.all([
    dataService.customers(),
    dataService.machines(),
    dataService.engineers(),
  ]);

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
