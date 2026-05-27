"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadWidget } from "@/components/upload-widget";

function splitUrls(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function TicketReportUpload({
  ticketId,
  attachmentUrls,
  canRemove = false,
}: {
  ticketId: string;
  attachmentUrls?: string;
  canRemove?: boolean;
}) {
  const router = useRouter();

  async function saveAttachments(urls: string[]) {
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ AttachmentURLs: urls.join(", ") }),
    });

    if (!response.ok) {
      toast.error("Report uploaded, but could not attach it to the ticket");
      return;
    }

    toast.success("Service report attached");
    router.refresh();
  }

  return (
    <UploadWidget
      initialUrls={splitUrls(attachmentUrls)}
      title="Attach Service Report"
      description="PDFs and images are accepted. Each file must be less than 2 MB."
      buttonLabel="Capture / Upload report"
      accept="image/*,application/pdf"
      maxFileSizeMB={2}
      uploadContext={{ ticketId }}
      canRemove={canRemove}
      onUploaded={saveAttachments}
    />
  );
}
