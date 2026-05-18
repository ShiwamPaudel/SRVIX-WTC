"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LiveLocationTracker({ engineerId }: { engineerId?: string }) {
  const [tracking, setTracking] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  function start() {
    if (!engineerId) {
      toast.error("Engineer profile missing");
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.error("GPS is not available in this browser");
      return;
    }
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        if (now - lastSent.current < 60000) return;
        lastSent.current = now;
        await fetch("/api/engineers/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            engineerId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });
      },
      () => toast.error("Location permission denied"),
      { enableHighAccuracy: false, maximumAge: 45000, timeout: 15000 },
    );
    toast.success("Live tracking started", { description: "Updates are throttled to preserve battery." });
  }

  function stop() {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setTracking(false);
  }

  return (
    <Button type="button" variant={tracking ? "destructive" : "default"} onClick={tracking ? stop : start}>
      <Navigation className="size-4" />
      {tracking ? "Stop tracking" : "Start GPS tracking"}
    </Button>
  );
}
