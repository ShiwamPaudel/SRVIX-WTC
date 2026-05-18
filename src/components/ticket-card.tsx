import Link from "next/link";
import { Clock, ImageIcon, MapPin, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ContractBadge, PriorityBadge, StatusBadge } from "@/components/status-badge";
import { formatDate, minutesAgo } from "@/lib/utils";
import type { TicketWithRelations } from "@/types/service";

export function TicketCard({ ticket }: { ticket: TicketWithRelations }) {
  return (
    <Link href={`/tickets/${ticket.TicketID}`} className="block">
      <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_130px_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={ticket.Priority} />
              </div>
              <h3 className="mt-2 text-base font-semibold text-slate-950">{ticket.TicketTitle}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{ticket.ProblemDescription}</p>
            </div>
            <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {ticket.machine?.ImageURL ? (
                <img src={ticket.machine.ImageURL} alt={ticket.machine.Model || "Machine"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <ImageIcon className="size-5" />
                  <span className="text-xs font-medium">Machine Photo</span>
                </div>
              )}
            </div>
            <div className="flex justify-start lg:justify-center">
              <StatusBadge status={ticket.TicketStatus} />
            </div>
            <div className="flex justify-start lg:justify-end">
              <ContractBadge contract={ticket.ContractType} />
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-slate-400" />
              {ticket.customer?.HospitalName ?? "Customer not linked"}
            </span>
            <span className="flex items-center gap-2">
              <Wrench className="size-4 text-slate-400" />
              {ticket.machine?.DeviceName ?? "Machine not linked"}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="size-4 text-slate-400" />
              {formatDate(ticket.VisitDate)} - {minutesAgo(ticket.LastUpdated)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
