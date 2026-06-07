"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function LiveLocationTracker({ engineerId }: { engineerId?: string }) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [locationStatus, setLocationStatus] = useState<"In" | "Out">("In");
  const [sending, setSending] = useState(false);

  function sendLocation() {
    const trimmedRemarks = remarks.trim();
    if (!engineerId) {
      toast.error("Engineer profile missing");
      return;
    }
    if (!trimmedRemarks) {
      toast.error("Remarks are required");
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.error("GPS is not available in this browser");
      return;
    }

    setSending(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const response = await fetch("/api/engineers/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            engineerId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            remarks: trimmedRemarks,
            locationStatus,
          }),
        });
        setSending(false);
        if (!response.ok) {
          toast.error("Location could not be sent");
          return;
        }
        setRemarks("");
        toast.success("Location sent", { description: "The live map has your latest position." });
        router.refresh();
      },
      (error) => {
        setSending(false);
        toast.error("Location could not be sent", {
          description: error.message || "Allow location permission for SRVIX and try again.",
        });
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-[#12384f]">Location Check In</p>
        <div className="grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Location status">
          {(["In", "Out"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setLocationStatus(status)}
              className={cn(
                "h-8 min-w-14 rounded px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
                locationStatus === status ? "bg-[#087fb6] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-[#12384f]",
              )}
              aria-pressed={locationStatus === status}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
        placeholder="Remarks / description"
        required
        aria-label="Remarks / description"
        rows={3}
      />
      <Button type="button" onClick={sendLocation} disabled={sending}>
        <LocateFixed className="size-4" />
        {sending ? "Sending..." : "Send Location"}
      </Button>
    </div>
  );
}
