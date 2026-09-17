export const TICKET_ATTACHMENTS_EVENT = "srvix:ticket-attachments";

export type TicketAttachmentsDetail = {
  ticketId: string;
  urls: string[];
};

export function splitAttachmentUrls(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function hasAttachment(value?: string) {
  return splitAttachmentUrls(value).length > 0;
}

export function publishTicketAttachments(ticketId: string, urls: string[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<TicketAttachmentsDetail>(TICKET_ATTACHMENTS_EVENT, { detail: { ticketId, urls } }));
}

export function subscribeTicketAttachments(ticketId: string, onChange: (urls: string[]) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<TicketAttachmentsDetail>).detail;
    if (!detail || detail.ticketId !== ticketId) return;
    onChange(detail.urls);
  };
  window.addEventListener(TICKET_ATTACHMENTS_EVENT, handler);
  return () => window.removeEventListener(TICKET_ATTACHMENTS_EVENT, handler);
}
