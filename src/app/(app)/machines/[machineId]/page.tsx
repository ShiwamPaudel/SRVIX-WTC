import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, FileText, ImageIcon, Ticket, Wrench } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { ContractBadge, StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getServiceDataset } from "@/lib/data";
import type { Machine } from "@/types/service";

function MachinePhoto({ machine }: { machine: Machine }) {
  if (machine.ImageURL) {
    return <img src={machine.ImageURL} alt={machine.Model || "Machine"} className="h-full w-full object-cover" />;
  }

  return (
    <div className="grid h-full min-h-56 place-items-center bg-slate-100 text-slate-400">
      <div className="text-center">
        <ImageIcon className="mx-auto size-10" />
        <p className="mt-2 text-sm font-medium">No machine photo</p>
      </div>
    </div>
  );
}

export default async function MachineDetailPage({ params }: { params: Promise<{ machineId: string }> }) {
  const { machineId } = await params;
  const { machines, customers, tickets, pmsSchedule, contracts } = await getServiceDataset();
  const machine = machines.find((item) => item.MachineID === machineId || item.InstallationID === machineId);
  if (!machine) notFound();

  const customer = customers.find((item) => item.CustomerID === machine.CustomerID);
  const machineTickets = tickets
    .filter((ticket) => ticket.MachineID === machine.MachineID || ticket.InstallationID === machine.InstallationID)
    .sort((a, b) => (b.TicketDate || b.Date || "").localeCompare(a.TicketDate || a.Date || ""));
  const machinePms = pmsSchedule
    .filter((pms) => pms.MachineID === machine.MachineID || pms.MachineID === machine.InstallationID)
    .sort((a, b) => a.DueDate.localeCompare(b.DueDate));
  const machineContracts = contracts
    .filter((contract) => contract.InstallationID === machine.InstallationID)
    .sort((a, b) => b.ContractEnd.localeCompare(a.ContractEnd));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0077b6]">{customer?.HospitalName || machine.NameOfCustomer || "Customer not linked"}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#00000c]">
            {[machine.Brand, machine.Model].filter(Boolean).join(" ") || machine.DeviceName || "Machine"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{[machine.SerialNumber, machine.Department].filter(Boolean).join(" - ")}</p>
        </div>
        <div className="flex gap-2">
          <BackButton fallback="/machines" />
          <Button asChild>
            <Link href={`/tickets/new`}>
              <Ticket className="size-4" />
              New Ticket
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <div className="aspect-[4/3]">
            <MachinePhoto machine={machine} />
          </div>
          <CardContent className="space-y-3 pt-5">
            <Info label="Installation date" value={formatDate(machine.InstallationDate)} />
            <Info label="Warranty expiry" value={formatDate(machine.WarrantyExpiry)} />
            <Info label="Status" value={machine.Status || "Unknown"} />
            <div>
              <p className="text-sm font-medium text-slate-500">Current contract</p>
              <div className="mt-1">
                <ContractBadge contract={machine.ContractType || "Not set"} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Metric title="Tickets" value={machineTickets.length} icon={Ticket} />
          <Metric title="PMS records" value={machinePms.length} icon={CalendarCheck} />
          <Metric title="Contracts" value={machineContracts.length} icon={FileText} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Ticket History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {machineTickets.map((ticket) => (
            <Link
              key={ticket.TicketID}
              href={`/tickets/${ticket.TicketID}`}
              className="grid gap-3 rounded-md border border-slate-200 p-3 transition hover:border-[#38b6ff]/40 hover:bg-[#f4fbff] md:grid-cols-[1fr_140px_120px] md:items-center"
            >
              <div>
                <p className="font-semibold text-[#00000c]">{ticket.TicketTitle}</p>
                <p className="text-sm text-slate-500">{ticket.ServiceType}</p>
              </div>
              <p className="text-sm text-slate-600">{formatDate(ticket.TicketDate || ticket.Date)}</p>
              <div className="md:text-right"><StatusBadge status={ticket.TicketStatus} /></div>
            </Link>
          ))}
          {!machineTickets.length ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No tickets found for this machine.</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>PMS History</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {machinePms.map((pms, index) => (
              <div key={pms.PMSID} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_130px_120px] md:items-center">
                <div>
                  <p className="font-semibold text-[#00000c]">PMS No. {pms.PMSNumber || index + 1}</p>
                  <p className="text-sm text-slate-500">{pms.Remarks || "Scheduled PMS"}</p>
                </div>
                <p className="text-sm text-slate-600">{formatDate(pms.DueDate)}</p>
                <div className="md:text-right">
                  <Badge variant={pms.Status === "Completed" ? "green" : "amber"}>{pms.Status === "Completed" ? "Done" : pms.Status}</Badge>
                </div>
              </div>
            ))}
            {!machinePms.length ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No PMS history found.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contract History</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {machineContracts.map((contract) => (
              <div key={contract.ContractID} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#00000c]">{contract.ContractType}</p>
                    <p className="text-sm text-slate-500">{contract.Remarks || "No remarks"}</p>
                  </div>
                  <Badge variant={contract.Status === "Active" ? "green" : "slate"}>{contract.Status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {formatDate(contract.ContractStart)} to {formatDate(contract.ContractEnd)}
                </p>
              </div>
            ))}
            {!machineContracts.length ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No contract history found.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#00000c]">{value}</p>
    </div>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Wrench }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{title}</p>
        <span className="grid size-9 place-items-center rounded-md bg-[#e8f7ff] text-[#0077b6]">
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-[#00000c]">{value}</p>
    </div>
  );
}
