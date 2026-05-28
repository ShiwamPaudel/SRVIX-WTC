"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function LeaveRequestForm() {
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveDate, reason }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Could not submit leave request");
      }
      setReason("");
      toast.success("Leave request sent");
    } catch (error) {
      toast.error("Leave request failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Leave date</span>
          <Input type="date" value={leaveDate} onChange={(event) => setLeaveDate(event.target.value)} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Reason</span>
          <Textarea
            className="min-h-10 py-2 md:min-h-10"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for leave"
            required
          />
        </label>
        <Button disabled={loading}>
          <CalendarPlus className="size-4" />
          {loading ? "Sending..." : "Request"}
        </Button>
      </div>
    </form>
  );
}
