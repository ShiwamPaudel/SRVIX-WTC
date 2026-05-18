import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { auth } from "@/auth";
import { TicketExportButton } from "@/components/ticket-export-button";
import { TicketCard } from "@/components/ticket-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { contractTypes, priorities, serviceTypes, ticketStatuses } from "@/lib/constants";
import { getTicketsWithRelations } from "@/lib/data";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    serviceType?: string;
    contractType?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const tickets = await getTicketsWithRelations(session?.user.role, session?.user.engineerId);
  const filtered = tickets.filter((ticket) => {
    const query = (params.q ?? "").toLowerCase();
    const matchesQuery = query
      ? `${ticket.TicketID} ${ticket.TicketTitle} ${ticket.customer?.HospitalName} ${ticket.machine?.DeviceName}`
          .toLowerCase()
          .includes(query)
      : true;
    const matchesStatus = params.status ? ticket.TicketStatus === params.status : true;
    const matchesPriority = params.priority ? ticket.Priority === params.priority : true;
    const matchesServiceType = params.serviceType ? ticket.ServiceType === params.serviceType : true;
    const matchesContractType = params.contractType ? ticket.ContractType === params.contractType : true;
    const ticketDate = ticket.TicketDate || ticket.Date || ticket.VisitDate;
    const matchesDateFrom = params.dateFrom ? ticketDate >= params.dateFrom : true;
    const matchesDateTo = params.dateTo ? ticketDate <= params.dateTo : true;
    return matchesQuery && matchesStatus && matchesPriority && matchesServiceType && matchesContractType && matchesDateFrom && matchesDateTo;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Tickets</h1>
          <p className="text-sm text-slate-500">Search, filter, assign, and track complaint resolution.</p>
        </div>
        <Button asChild>
          <Link href="/tickets/new"><Plus className="size-4" />New ticket</Link>
        </Button>
      </div>
      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_180px_180px_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" name="q" placeholder="Search ticket, customer, device..." defaultValue={params.q} />
        </div>
        <SelectNative
          name="status"
          defaultValue={params.status ?? ""}
        >
          <option value="">All status</option>
          {ticketStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </SelectNative>
        <SelectNative name="priority" defaultValue={params.priority ?? ""}>
          <option value="">All priority</option>
          {priorities.map((priority) => <option key={priority}>{priority}</option>)}
        </SelectNative>
        <SelectNative name="serviceType" defaultValue={params.serviceType ?? ""}>
          <option value="">All service types</option>
          {serviceTypes.map((type) => <option key={type}>{type}</option>)}
        </SelectNative>
        <SelectNative name="contractType" defaultValue={params.contractType ?? ""}>
          <option value="">All contracts</option>
          {contractTypes.map((type) => <option key={type}>{type}</option>)}
        </SelectNative>
        <Input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} aria-label="Date from" />
        <Input type="date" name="dateTo" defaultValue={params.dateTo ?? ""} aria-label="Date to" />
        <div className="flex gap-2">
          <Button variant="secondary">Apply</Button>
          <TicketExportButton tickets={filtered} />
        </div>
      </form>
      <div className="space-y-3">
        {filtered.map((ticket) => <TicketCard key={ticket.TicketID} ticket={ticket} />)}
        {!filtered.length ? <p className="rounded-lg bg-white p-5 text-sm text-slate-500">No tickets matched your filters.</p> : null}
      </div>
    </div>
  );
}
