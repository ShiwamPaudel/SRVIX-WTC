"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/service";

function variant(status: LeaveRequestStatus) {
  if (status === "Approved") return "green";
  if (status === "Rejected") return "rose";
  return "amber";
}

export function LeaveRequestsAdmin({ initialRequests }: { initialRequests: LeaveRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState("");

  async function review(leaveRequestId: string, status: "Approved" | "Rejected") {
    setLoadingId(leaveRequestId);
    try {
      const response = await fetch("/api/leave-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveRequestId, status, reviewReason: reasons[leaveRequestId] ?? "" }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Could not save leave decision");
      }
      const data = (await response.json()) as { leaveRequest: LeaveRequest };
      setRequests((items) => items.map((item) => (item.LeaveRequestID === leaveRequestId ? data.leaveRequest : item)));
      toast.success(`Leave ${status.toLowerCase()}`);
    } catch (error) {
      toast.error("Leave decision failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoadingId("");
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-[#12384f]">Leave Requests</h2>
        <p className="text-sm text-slate-500">Approve or reject engineer leave requests.</p>
      </div>
      <div className="grid gap-3">
        {requests.map((request) => (
          <div key={request.LeaveRequestID} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{request.EngineerName}</p>
                <p className="text-sm text-slate-500">
                  {formatDate(request.LeaveDate)} requested {formatDateTime(request.CreatedAt)}
                </p>
              </div>
              <Badge variant={variant(request.Status)}>{request.Status}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-700">{request.Reason}</p>
            {request.Status === "Pending" ? (
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-start">
                <Textarea
                  className="min-h-20"
                  placeholder="Approval/rejection reason"
                  value={reasons[request.LeaveRequestID] ?? ""}
                  onChange={(event) => setReasons((current) => ({ ...current, [request.LeaveRequestID]: event.target.value }))}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loadingId === request.LeaveRequestID}
                  onClick={() => review(request.LeaveRequestID, "Approved")}
                >
                  <Check className="size-4" />
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={loadingId === request.LeaveRequestID}
                  onClick={() => review(request.LeaveRequestID, "Rejected")}
                >
                  <X className="size-4" />
                  Reject
                </Button>
              </div>
            ) : (
              <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                {request.ReviewReason || "No review reason added."}
              </p>
            )}
          </div>
        ))}
        {!requests.length ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            No leave requests yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}
