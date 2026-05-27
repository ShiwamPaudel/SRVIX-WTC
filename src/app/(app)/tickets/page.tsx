import Link from "next/link";
import { Plus, X } from "lucide-react";
import { auth } from "@/auth";
import { FilterField, FilterSummary, FilterToolbar, filterInputClass, filterSelectClass } from "@/components/filter-toolbar";
import { LiveFilterForm } from "@/components/live-filter-form";
import { TicketExportButton } from "@/components/ticket-export-button";
import { TicketCard } from "@/components/ticket-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { contractTypes, priorities, serviceTypes, ticketStatuses } from "@/lib/constants";
import { getTicketsWithRelations } from "@/lib/data";
import { isAdmin } from "@/lib/permissions";
import { dataService } from "@/lib/turso/service";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
    serviceType?: string;
    contractType?: string;
    engineer?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const session = await auth();
  const userIsAdmin = isAdmin(session?.user.role);
  const params = await searchParams;
  const [tickets, engineers] = await Promise.all([
    getTicketsWithRelations(session?.user.role, session?.user.engineerId),
    dataService.engineers(),
  ]);
  const filtered = tickets.filter((ticket) => {
    const query = (params.q ?? "").toLowerCase();
    const matchesQuery = query
      ? `${ticket.TicketID} ${ticket.TicketTitle} ${ticket.customer?.HospitalName} ${ticket.machine?.DeviceName} ${ticket.engineer?.EngineerName}`
          .toLowerCase()
          .includes(query)
      : true;
    const matchesStatus = params.status ? ticket.TicketStatus === params.status : true;
    const matchesPriority = params.priority ? ticket.Priority === params.priority : true;
    const matchesServiceType = params.serviceType ? ticket.ServiceType === params.serviceType : true;
    const matchesContractType = params.contractType ? ticket.ContractType === params.contractType : true;
    const matchesEngineer = params.engineer ? ticket.AssignedEngineer === params.engineer : true;
    const ticketDate = ticket.TicketDate || ticket.Date || ticket.VisitDate;
    const matchesDateFrom = params.dateFrom ? ticketDate >= params.dateFrom : true;
    const matchesDateTo = params.dateTo ? ticketDate <= params.dateTo : true;
    return (
      matchesQuery &&
      matchesStatus &&
      matchesPriority &&
      matchesServiceType &&
      matchesContractType &&
      matchesEngineer &&
      matchesDateFrom &&
      matchesDateTo
    );
  });
  const activeFilterCount = [
    params.q,
    params.status,
    params.priority,
    params.serviceType,
    params.contractType,
    params.engineer,
    params.dateFrom,
    params.dateTo,
  ].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Tickets</h1>
          <p className="text-sm text-slate-500">Search, filter, assign, and track complaint resolution.</p>
        </div>
        {userIsAdmin ? (
          <Button asChild>
            <Link href="/tickets/new"><Plus className="size-4" />New ticket</Link>
          </Button>
        ) : null}
      </div>
      <LiveFilterForm>
        <FilterToolbar
          summary={
            <>
              <FilterSummary>{filtered.length} of {tickets.length} shown</FilterSummary>
              {activeFilterCount ? <FilterSummary>{activeFilterCount} active</FilterSummary> : null}
            </>
          }
          actions={
            <>
            <TicketExportButton tickets={filtered} />
            <Button asChild variant="ghost">
              <Link href="/tickets">
                <X className="size-4" />
                Clear
              </Link>
            </Button>
            </>
          }
        >
          <FilterField label="Search" className="min-w-64 flex-1">
            <Input className={filterInputClass} name="q" placeholder="Ticket, customer, device..." defaultValue={params.q} />
          </FilterField>
          <FilterField label="Status">
            <SelectNative name="status" defaultValue={params.status ?? ""} className={filterSelectClass}>
            <option value="">All status</option>
            {ticketStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Priority">
            <SelectNative name="priority" defaultValue={params.priority ?? ""} className={filterSelectClass}>
            <option value="">All priority</option>
            {priorities.map((priority) => <option key={priority}>{priority}</option>)}
            </SelectNative>
          </FilterField>
          <FilterField label="Engineer" className="min-w-52">
            <SelectNative name="engineer" defaultValue={params.engineer ?? ""} className={filterSelectClass}>
            <option value="">All engineers</option>
            {engineers.map((engineer) => (
              <option key={engineer.EngineerID} value={engineer.EngineerID}>
                {engineer.EngineerName}
              </option>
            ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Service" className="min-w-56">
            <SelectNative name="serviceType" defaultValue={params.serviceType ?? ""} className={filterSelectClass}>
            <option value="">All service types</option>
            {serviceTypes.map((type) => <option key={type}>{type}</option>)}
            </SelectNative>
          </FilterField>
          <FilterField label="Contract">
            <SelectNative name="contractType" defaultValue={params.contractType ?? ""} className={filterSelectClass}>
            <option value="">All contracts</option>
            {contractTypes.map((type) => <option key={type}>{type}</option>)}
            </SelectNative>
          </FilterField>
          <FilterField label="From">
            <Input className={filterInputClass} type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} aria-label="Date from" />
          </FilterField>
          <FilterField label="To">
            <Input className={filterInputClass} type="date" name="dateTo" defaultValue={params.dateTo ?? ""} aria-label="Date to" />
          </FilterField>
        </FilterToolbar>
      </LiveFilterForm>
      <div className="space-y-3">
        {filtered.map((ticket) => <TicketCard key={ticket.TicketID} ticket={ticket} />)}
        {!filtered.length ? <p className="rounded-lg bg-white p-5 text-sm text-slate-500">No tickets matched your filters.</p> : null}
      </div>
    </div>
  );
}
