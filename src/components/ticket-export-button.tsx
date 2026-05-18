"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TicketWithRelations } from "@/types/service";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function TicketExportButton({ tickets }: { tickets: TicketWithRelations[] }) {
  function exportCsv() {
    const headers = [
      "TicketID",
      "TicketDate",
      "Customer",
      "Machine",
      "Model",
      "Title",
      "ServiceType",
      "Priority",
      "ContractType",
      "Status",
      "AssignedEngineer",
      "VisitDate",
      "CompletionDate",
      "LastUpdated",
    ];
    const rows = tickets.map((ticket) => [
      ticket.TicketID,
      ticket.TicketDate || ticket.Date,
      ticket.customer?.HospitalName || ticket.NameOfCustomer,
      ticket.machine?.DeviceName,
      ticket.machine?.Model || ticket.Model,
      ticket.TicketTitle,
      ticket.ServiceType,
      ticket.Priority,
      ticket.ContractType,
      ticket.TicketStatus,
      ticket.engineer?.EngineerName || ticket.AssignedEngineer,
      ticket.VisitDate,
      ticket.CompletionDate,
      ticket.LastUpdated,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="secondary" onClick={exportCsv} disabled={!tickets.length}>
      <Download className="size-4" />
      Export CSV
    </Button>
  );
}
