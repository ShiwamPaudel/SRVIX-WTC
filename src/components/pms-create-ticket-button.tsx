"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardPlus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PMSCreateTicketButton({ pmsId, ticketId }: { pmsId: string; ticketId?: string }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  if (ticketId) {
    return (
      <Button asChild size="sm" variant="secondary">
        <Link href={`/tickets/${ticketId}`}>
          <ExternalLink className="size-4" />
          Open Ticket
        </Link>
      </Button>
    );
  }

  async function createTicket() {
    setIsCreating(true);
    const response = await fetch(`/api/pms/${pmsId}/ticket`, { method: "POST" });
    setIsCreating(false);

    if (!response.ok) {
      toast.error("Could not create PMS ticket");
      return;
    }

    const data = (await response.json()) as { ticket: { TicketID: string } };
    toast.success("PMS ticket created");
    router.push(`/tickets/${data.ticket.TicketID}`);
    router.refresh();
  }

  return (
    <Button size="sm" type="button" onClick={createTicket} disabled={isCreating}>
      <ClipboardPlus className="size-4" />
      {isCreating ? "Creating..." : "Create Ticket"}
    </Button>
  );
}
