"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { serviceReportRequiredForServiceType } from "@/lib/constants";
import { hasAttachment, subscribeTicketAttachments } from "@/lib/ticket-attachments";

export function TicketClosePanel({
  ticketId,
  attachmentUrls,
  engineerRemarks,
  serviceType,
  canClose,
  isClosed,
}: {
  ticketId: string;
  attachmentUrls?: string;
  engineerRemarks?: string;
  serviceType?: string;
  canClose: boolean;
  isClosed: boolean;
}) {
  const router = useRouter();
  const [savedRemarks, setSavedRemarks] = useState((engineerRemarks ?? "").trim());
  const [draftRemarks, setDraftRemarks] = useState<string | null>(null);
  const [uploadedInSession, setUploadedInSession] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingRemarks, setSavingRemarks] = useState(false);
  const remarks = draftRemarks ?? savedRemarks;
  const remarksChanged = remarks.trim() !== savedRemarks;
  const reportRequired = serviceReportRequiredForServiceType(serviceType);
  // An upload in this session wins over the server prop: the ticket read can still be a few
  // seconds stale, and the engineer must not have to upload a second report to unlock closing.
  const reportAttached = uploadedInSession ?? hasAttachment(attachmentUrls);

  useEffect(() => {
    setSavedRemarks((engineerRemarks ?? "").trim());
  }, [engineerRemarks]);

  useEffect(() => {
    setUploadedInSession(null);
  }, [attachmentUrls]);

  useEffect(
    () => subscribeTicketAttachments(ticketId, (urls) => setUploadedInSession(urls.length > 0)),
    [ticketId],
  );

  async function saveRemarks() {
    const trimmedRemarks = remarks.trim().slice(0, 1000);
    if (!trimmedRemarks) {
      toast.error("Write the remarks before saving");
      return;
    }

    setSavingRemarks(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ EngineerRemarks: trimmedRemarks }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not save remarks");

      setSavedRemarks(trimmedRemarks);
      setDraftRemarks(null);
      toast.success("Remarks saved");
      router.refresh();
    } catch (error) {
      toast.error("Could not save remarks", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSavingRemarks(false);
    }
  }

  async function closeTicket() {
    if (reportRequired && !reportAttached) {
      toast.error("Attach the service report before closing this ticket");
      return;
    }

    setSaving(true);
    try {
      const trimmedRemarks = remarks.trim().slice(0, 1000);
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

      setSavedRemarks(trimmedRemarks);
      setDraftRemarks(null);
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
        <CardTitle>{isClosed ? "Engineer Remarks" : "Engineer Remarks & Closure"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={remarks}
          onChange={(event) => setDraftRemarks(event.target.value)}
          placeholder="Engineer remarks or resolution notes"
          disabled={!canClose || isClosed}
        />
        {canClose && !isClosed ? (
          <p className="text-xs text-slate-500">
            Save remarks any time - for example a pending reason. The ticket stays pending until you close it.
          </p>
        ) : null}
        {reportRequired && !reportAttached && !isClosed ? (
          <p className="text-sm text-amber-700">Attach a service report before closing this ticket.</p>
        ) : null}
        {canClose && !isClosed ? (
          <Button
            type="button"
            variant="secondary"
            onClick={saveRemarks}
            disabled={savingRemarks || saving || !remarksChanged}
            className="w-full justify-center"
          >
            <Save className="size-4" />
            {savingRemarks ? "Saving..." : "Save Remarks"}
          </Button>
        ) : null}
        <Button type="button" onClick={closeTicket} disabled={!canClose || isClosed || (reportRequired && !reportAttached) || saving || savingRemarks} className="w-full justify-center">
          <CheckCircle2 className="size-4" />
          {isClosed ? "Ticket Closed" : saving ? "Closing..." : "Close Ticket"}
        </Button>
      </CardContent>
    </Card>
  );
}
