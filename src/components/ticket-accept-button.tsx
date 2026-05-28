"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function TicketAcceptButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function acceptTicket() {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ AcceptTicket: true }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Could not accept ticket");
      }
      toast.success("Ticket accepted");
      router.refresh();
    } catch (error) {
      toast.error("Ticket acceptance failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" onClick={acceptTicket} disabled={loading}>
      <CheckCircle2 className="size-4" />
      {loading ? "Accepting..." : "Accept ticket"}
    </Button>
  );
}
