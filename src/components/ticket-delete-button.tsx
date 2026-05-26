"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function TicketDeleteButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function deleteTicket() {
    const confirmed = window.confirm("Delete this ticket permanently? This is only for tickets opened by mistake.");
    if (!confirmed) return;

    setLoading(true);
    const response = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
    setLoading(false);

    if (!response.ok) {
      toast.error("Could not delete ticket");
      return;
    }

    toast.success("Ticket deleted");
    router.push("/tickets");
    router.refresh();
  }

  return (
    <Button type="button" variant="destructive" onClick={deleteTicket} disabled={loading}>
      <Trash2 className="size-4" />
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}
