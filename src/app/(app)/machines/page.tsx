import Link from "next/link";
import { Building2, CalendarCheck, Cpu, ImageIcon, MapPin, Plus, X } from "lucide-react";
import { auth } from "@/auth";
import { FilterField, FilterSummary, FilterToolbar, filterInputClass, filterSelectClass } from "@/components/filter-toolbar";
import { LiveFilterForm } from "@/components/live-filter-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { getServiceDataset } from "@/lib/data";
import type { Machine, Ticket as ServiceTicket } from "@/types/service";

type MachineWithContext = Machine & {
  customerName: string;
  customerAddress: string;
  customerDistrict: string;
  customerPhone: string;
  openTickets: ServiceTicket[];
  ticketCount: number;
};

function statusVariant(status: string): "green" | "amber" | "rose" | "slate" {
  const normalized = status.toLowerCase();
  if (normalized.includes("operational") || normalized.includes("active")) return "green";
  if (normalized.includes("attention") || normalized.includes("service")) return "amber";
  if (normalized.includes("down") || normalized.includes("inactive")) return "rose";
  return "slate";
}

function MachinePhoto({ machine }: { machine: Machine }) {
  if (machine.ImageURL) {
    return (
      <img
        src={machine.ImageURL}
        alt={`${machine.DeviceName} ${machine.Model}`}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-400">
      <div className="text-center">
        <ImageIcon className="mx-auto size-8" />
        <p className="mt-2 text-xs font-medium text-slate-500">No photo</p>
      </div>
    </div>
  );
}

export default async function MachinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; customer?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const query = (params.q ?? "").trim().toLowerCase();
  const selectedCustomer = params.customer ?? "";
  const selectedStatus = params.status ?? "";
  const { customers, machines, tickets } = await getServiceDataset();

  const rows: MachineWithContext[] = machines.map((machine) => {
    const customer = customers.find((item) => item.CustomerID === machine.CustomerID);
    const machineTickets = tickets.filter((ticket) => ticket.MachineID === machine.MachineID);

    return {
      ...machine,
      customerName: customer?.HospitalName ?? "Customer not linked",
      customerAddress: customer?.Address ?? "",
      customerDistrict: customer?.District ?? "",
      customerPhone: customer?.Phone ?? "",
      openTickets: machineTickets.filter((ticket) => ticket.TicketStatus !== "Closed"),
      ticketCount: machineTickets.length,
    };
  });

  const filtered = rows.filter((machine) => {
    const searchText = [
      machine.MachineID,
      machine.CustomerID,
      machine.customerName,
      machine.customerAddress,
      machine.customerDistrict,
      machine.Department,
      machine.DeviceName,
      machine.Brand,
      machine.Model,
      machine.SerialNumber,
      machine.ContractType,
      machine.Status,
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = query ? searchText.includes(query) : true;
    const matchesCustomer = selectedCustomer ? machine.CustomerID === selectedCustomer : true;
    const matchesStatus = selectedStatus ? machine.Status === selectedStatus : true;
    return matchesQuery && matchesCustomer && matchesStatus;
  });

  const grouped = customers
    .map((customer) => ({
      customer,
      machines: filtered.filter((machine) => machine.CustomerID === customer.CustomerID),
    }))
    .filter((group) => group.machines.length);

  const openTicketCount = filtered.reduce((total, machine) => total + machine.openTickets.length, 0);
  const statuses = Array.from(new Set(rows.map((machine) => machine.Status).filter(Boolean))).sort();
  const activeFilterCount = [params.q, params.customer, params.status].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Machines</h1>
          <p className="text-sm text-slate-500">
            Lookup installed equipment by institution, device, model, serial number, contract, and ticket history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/customers/new">
              <Building2 className="size-4" />
              New customer
            </Link>
          </Button>
          {session?.user.role === "Admin" ? (
            <Button asChild variant="secondary">
              <Link href="/device-models/new">
                <Cpu className="size-4" />
                New model
              </Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link href="/machines/new">
              <Plus className="size-4" />
              New installation
            </Link>
          </Button>
        </div>
      </div>

      <LiveFilterForm>
        <FilterToolbar
          summary={
            <>
              <FilterSummary>{filtered.length} of {rows.length} matched</FilterSummary>
              {activeFilterCount ? <FilterSummary>{activeFilterCount} active</FilterSummary> : null}
            </>
          }
          actions={
            <Button asChild variant="ghost">
              <Link href="/machines">
                <X className="size-4" />
                Clear
              </Link>
            </Button>
          }
        >
          <FilterField label="Search" className="min-w-72 flex-1">
            <Input
              className={filterInputClass}
              name="q"
              placeholder="Institution, device, model, serial..."
              defaultValue={params.q ?? ""}
            />
          </FilterField>
          <FilterField label="Institution" className="min-w-72">
            <SelectNative name="customer" defaultValue={selectedCustomer} className={filterSelectClass}>
            <option value="">All institutions</option>
            {customers.map((customer) => (
              <option key={customer.CustomerID} value={customer.CustomerID}>
                {customer.HospitalName}
              </option>
            ))}
            </SelectNative>
          </FilterField>
          <FilterField label="Status" className="min-w-52">
            <SelectNative name="status" defaultValue={selectedStatus} className={filterSelectClass}>
            <option value="">All machine status</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
            </SelectNative>
          </FilterField>
        </FilterToolbar>
      </LiveFilterForm>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Matched equipment</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{filtered.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Institutions shown</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{grouped.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Pending linked tickets</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{openTicketCount}</p>
        </div>
      </div>

      <div className="space-y-5">
        {grouped.map(({ customer, machines }) => (
          <section key={customer.CustomerID} className="space-y-3">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-sky-600" />
                  <h2 className="text-lg font-semibold text-slate-950">{customer.HospitalName}</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {customer.Department ? `${customer.Department} - ` : ""}
                  {customer.Address || customer.District || customer.Phone}
                </p>
              </div>
              <Badge variant="blue">{machines.length} machines</Badge>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {machines.map((machine) => (
                <Link
                  key={machine.MachineID}
                  href={`/machines/${machine.MachineID}`}
                  className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:grid-cols-[168px_1fr]"
                >
                  <div className="aspect-[4/3] sm:aspect-auto sm:min-h-full">
                    <MachinePhoto machine={machine} />
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">
                          {machine.DeviceName || "Unnamed device"}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {[machine.Brand, machine.Model, machine.SerialNumber].filter(Boolean).join(" - ")}
                        </p>
                      </div>
                      <Badge variant={statusVariant(machine.Status)}>{machine.Status || "Unknown"}</Badge>
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 size-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-700">{machine.customerName}</p>
                          <p className="text-slate-500">
                            {[machine.Department, machine.customerAddress || machine.customerDistrict || "Location not set"]
                              .filter(Boolean)
                              .join(" - ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CalendarCheck className="mt-0.5 size-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-700">Next PMS {machine.NextPMS || "not set"}</p>
                          <p className="text-slate-500">Last PMS {machine.LastPMS || "not set"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-slate-500">Contract</p>
                        <p className="font-medium text-slate-900">{machine.ContractType || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Warranty</p>
                        <p className="font-medium text-slate-900">{machine.WarrantyExpiry || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Tickets</p>
                        <p className="font-medium text-slate-900">
                          {machine.openTickets.length} open / {machine.ticketCount} total
                        </p>
                      </div>
                    </div>

                    {machine.openTickets.length ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Pending ticket context</p>
                        {machine.openTickets.slice(0, 2).map((ticket) => (
                          <Link
                            key={ticket.TicketID}
                            href={`/tickets/${ticket.TicketID}`}
                            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm transition hover:border-sky-200 hover:bg-sky-50"
                          >
                            <span className="font-medium text-slate-800">{ticket.TicketTitle}</span>
                            <Badge variant="amber">{ticket.TicketStatus}</Badge>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {!filtered.length ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Cpu className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-3 text-lg font-semibold text-slate-950">No equipment matched</h2>
            <p className="mt-1 text-sm text-slate-500">Try another institution, device name, model, or serial number.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
