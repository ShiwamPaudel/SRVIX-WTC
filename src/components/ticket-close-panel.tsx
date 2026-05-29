"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

function hasAttachment(value?: string) {
  return Boolean(
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean).length,
  );
}

export function TicketClosePanel({
  ticketId,
  attachmentUrls,
  canClose,
  isClosed,
}: {
  ticketId: string;
  attachmentUrls?: string;
  canClose: boolean;
  isClosed: boolean;
}) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const reportAttached = hasAttachment(attachmentUrls);

  async function closeTicket() {
    if (!reportAttached) {
      toast.error("Attach the service report before closing this ticket");
      return;
    }

    setSaving(true);
    try {
      const trimmedRemarks = remarks.trim();
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TicketStatus: "Closed",
          ...(trimmedRemarks ? { EngineerRemarks: trimmedRemarks, Resolution: trimmedRemarks } : {}),
          CompletionDate: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not close ticket");

      toast.success("Ticket closed");
      router.refresh();
    } catch (error) {
      toast.error("Could not close ticket", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Close Ticket</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder="Engineer remarks or resolution notes"
          disabled={!canClose || isClosed}
        />
        {!reportAttached && !isClosed ? (
          <p className="text-sm text-amber-700">Attach a service report before closing this ticket.</p>
        ) : null}
        <Button type="button" onClick={closeTicket} disabled={!canClose || isClosed || !reportAttached || saving} className="w-full justify-center">
          <CheckCircle2 className="size-4" />
          {isClosed ? "Ticket Closed" : saving ? "Closing..." : "Close Ticket"}
        </Button>
      </CardContent>
    </Card>
  );
}
