"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function LiveLocationTracker({ engineerId }: { engineerId?: string }) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
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
      () => {
        setSending(false);
        toast.error("Location permission denied");
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 },
    );
  }

  return (
    <div className="space-y-3">
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
