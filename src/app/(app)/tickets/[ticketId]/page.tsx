import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, Navigation } from "lucide-react";
import { ActivityTimeline } from "@/components/activity-timeline";
import { BackButton } from "@/components/back-button";
import { GoogleMapView } from "@/components/google-map-view";
import { SignaturePad } from "@/components/signature-pad";
import { UploadWidget } from "@/components/upload-widget";
import { ContractBadge, PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getTicket } from "@/lib/data";

export default async function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const ticket = await getTicket(ticketId);
  if (!ticket) notFound();

  const point = ticket.Latitude && ticket.Longitude ? [{
    id: ticket.TicketID,
    title: ticket.customer?.HospitalName ?? "Customer not linked",
    subtitle: ticket.TicketTitle,
    latitude: Number(ticket.Latitude),
    longitude: Number(ticket.Longitude),
    status: ticket.TicketStatus,
  }] : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-sky-700">{formatDate(ticket.TicketDate)}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{ticket.TicketTitle}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={ticket.TicketStatus} />
            <PriorityBadge priority={ticket.Priority} />
            <ContractBadge contract={ticket.ContractType} />
          </div>
        </div>
        <div className="flex gap-2">
          <BackButton />
          <Button asChild variant="secondary">
            <Link href={`/tickets/${ticket.TicketID}/edit`}><Edit className="size-4" />Edit</Link>
          </Button>
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
          <div className="grid gap-4 lg:grid-cols-2">
            <UploadWidget />
            <SignaturePad />
          </div>
        </div>
        <div className="space-y-4">
          <GoogleMapView points={point} height={320} />
          <Card>
            <CardHeader><CardTitle>Directions</CardTitle></CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${ticket.Latitude},${ticket.Longitude}`} target="_blank" rel="noreferrer">
                  <Navigation className="size-4" />Open route
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
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
