import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CalendarCheck, Cpu, Edit, History, Wrench } from "lucide-react";
import { auth } from "@/auth";
import { ActivityTimeline } from "@/components/activity-timeline";
import { BackButton } from "@/components/back-button";
import { TicketAcceptButton } from "@/components/ticket-accept-button";
import { TicketDeleteButton } from "@/components/ticket-delete-button";
import { TicketReportUpload } from "@/components/ticket-report-upload";
import { TicketClosePanel } from "@/components/ticket-close-panel";
import { ContractBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getTicket } from "@/lib/data";
import { dataService } from "@/lib/turso/service";

export default async function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const session = await auth();
  const ticket = await getTicket(ticketId);
  if (!ticket) notFound();
  if (session?.user.role === "Engineer" && session.user.engineerId !== ticket.AssignedEngineer) notFound();

  const [pmsSchedule, tickets] = await Promise.all([dataService.pmsSchedule(), dataService.tickets()]);
  const machineId = ticket.machine?.MachineID || ticket.MachineID || ticket.InstallationID || "";
  const relatedPms = pmsSchedule
    .filter((pms) => pms.MachineID === machineId || pms.MachineID === ticket.MachineID || pms.MachineID === ticket.InstallationID)
    .sort((a, b) => (a.DueDate || "").localeCompare(b.DueDate || ""));
  const today = new Date().toISOString().slice(0, 10);
  const completedPms = relatedPms
    .filter((pms) => pms.Status === "Completed" || pms.CompletionDate)
    .sort((a, b) => (b.CompletionDate || b.DueDate || "").localeCompare(a.CompletionDate || a.DueDate || ""));
  const upcomingPms = relatedPms.find((pms) => pms.Status !== "Completed" && (!pms.DueDate || pms.DueDate >= today)) ??
    relatedPms.find((pms) => pms.Status !== "Completed");
  const machineTickets = tickets
    .filter((item) => {
      const sameMachine = (item.MachineID || item.InstallationID) === machineId && item.TicketID !== ticket.TicketID;
      if (!sameMachine) return false;
      if (session?.user.role === "Engineer") return item.AssignedEngineer === session.user.engineerId;
      return true;
    })
    .sort((a, b) => (b.TicketDate || b.Date || "").localeCompare(a.TicketDate || a.Date || ""));
  const openMachineTickets = machineTickets.filter((item) => item.TicketStatus !== "Closed");
  const canAcceptTicket =
    session?.user.role === "Engineer" &&
    session.user.engineerId === ticket.AssignedEngineer &&
    ticket.TicketStatus !== "Closed" &&
    !ticket.TicketAcceptedAt;
  const canCloseTicket =
    ticket.TicketStatus !== "Closed" &&
    (session?.user.role === "Admin" || (session?.user.role === "Engineer" && session.user.engineerId === ticket.AssignedEngineer));
  const canEditTicket = session?.user.role !== "Engineer";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-sky-700">{formatDate(ticket.TicketDate)}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{ticket.TicketTitle}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={ticket.TicketStatus} />
            <ContractBadge contract={ticket.ContractType} />
          </div>
        </div>
        <div className="flex gap-2">
          <BackButton />
          {canAcceptTicket ? <TicketAcceptButton ticketId={ticket.TicketID} /> : null}
          {canEditTicket ? (
            <Button asChild variant="secondary">
              <Link href={`/tickets/${ticket.TicketID}/edit`}><Edit className="size-4" />Edit</Link>
            </Button>
          ) : null}
          {session?.user.role === "Admin" ? <TicketDeleteButton ticketId={ticket.TicketID} /> : null}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_390px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Service Detail</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="Customer" value={ticket.customer?.HospitalName ?? "Customer not linked"} />
              <Info label="Machine" value={`${ticket.machine?.DeviceName ?? "Machine not linked"} ${ticket.machine?.Model ?? ""}`.trim()} />
              <Info label="Assigned engineer" value={ticket.engineer?.EngineerName ?? "Engineer not assigned"} />
              <Info label="Acceptance" value={ticket.TicketAcceptedAt ? `Accepted ${formatDateTime(ticket.TicketAcceptedAt)}` : "Waiting for engineer acceptance"} />
              <Info label="Visit date" value={formatDate(ticket.VisitDate)} />
              <Info label="Last updated" value={formatDateTime(ticket.LastUpdated)} />
              <Info label="Service type" value={ticket.ServiceType} />
              {ticket.PMSID ? <Info label="PMS number" value={ticket.PMSNumber ? `PMS No. ${ticket.PMSNumber}` : ticket.PMSID} /> : null}
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-slate-500">Problem</p>
                <p className="mt-1 text-sm leading-6 text-slate-800">{ticket.ProblemDescription}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-slate-500">Resolution</p>
                <p className="mt-1 text-sm leading-6 text-slate-800">{ticket.Resolution || "Resolution pending."}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Service Logs</CardTitle></CardHeader>
            <CardContent><ActivityTimeline logs={ticket.logs ?? []} /></CardContent>
          </Card>
          <TicketReportUpload
            ticketId={ticket.TicketID}
            attachmentUrls={ticket.AttachmentURLs}
            canRemove={session?.user.role === "Admin" || session?.user.role === "Manager"}
          />
          <TicketClosePanel
            ticketId={ticket.TicketID}
            attachmentUrls={ticket.AttachmentURLs}
            canClose={canCloseTicket}
            isClosed={ticket.TicketStatus === "Closed"}
          />
        </div>
        <div className="space-y-4">
          <MachineDetails
            machineName={`${ticket.machine?.DeviceName ?? "Machine not linked"} ${ticket.machine?.Model ?? ""}`.trim()}
            serialNumber={ticket.machine?.SerialNumber}
            contractType={ticket.machine?.ContractType || ticket.ContractType}
            warrantyExpiry={ticket.machine?.WarrantyExpiry}
            lastPms={completedPms[0]?.CompletionDate || completedPms[0]?.DueDate || ticket.machine?.LastPMS}
            nextPms={upcomingPms?.DueDate || ticket.machine?.NextPMS}
            upcomingPmsStatus={upcomingPms?.Status}
            openTicketCount={openMachineTickets.length}
            recentTickets={machineTickets.slice(0, 3)}
          />
        </div>
      </div>
    </div>
  );
}

function MachineDetails({
  machineName,
  serialNumber,
  contractType,
  warrantyExpiry,
  lastPms,
  nextPms,
  upcomingPmsStatus,
  openTicketCount,
  recentTickets,
}: {
  machineName: string;
  serialNumber?: string;
  contractType?: string;
  warrantyExpiry?: string;
  lastPms?: string;
  nextPms?: string;
  upcomingPmsStatus?: string;
  openTicketCount: number;
  recentTickets: { TicketID: string; TicketTitle: string; TicketStatus: string; TicketDate: string; Date?: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Machine Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="flex items-start gap-3">
            <Cpu className="mt-0.5 size-5 text-sky-600" />
            <div>
              <p className="font-semibold text-slate-950">{machineName || "Machine not linked"}</p>
              <p className="text-sm text-slate-500">Serial {serialNumber || "not set"}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 text-sm">
          <Insight icon={<Wrench className="size-4" />} label="Contract" value={contractType || "Not set"} />
          <Insight icon={<CalendarCheck className="size-4" />} label="Warranty expiry" value={formatDate(warrantyExpiry)} />
          <Insight icon={<History className="size-4" />} label="Previous PMS" value={formatDate(lastPms)} />
          <Insight
            icon={<CalendarCheck className="size-4" />}
            label="Next PMS"
            value={`${formatDate(nextPms)}${upcomingPmsStatus ? ` - ${upcomingPmsStatus}` : ""}`}
          />
        </div>
        <div className="rounded-md border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-950">{openTicketCount} open tickets on this machine</p>
          <div className="mt-3 space-y-2">
            {recentTickets.map((item) => (
              <Link
                key={item.TicketID}
                href={`/tickets/${item.TicketID}`}
                className="block rounded-md bg-slate-50 px-3 py-2 text-sm transition hover:bg-sky-50"
              >
                <span className="font-medium text-slate-900">{item.TicketTitle}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {item.TicketStatus} - {formatDate(item.TicketDate || item.Date)}
                </span>
              </Link>
            ))}
            {!recentTickets.length ? <p className="text-sm text-slate-500">No previous ticket history for this machine.</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Insight({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
      <span className="flex items-center gap-2 text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  );
}
