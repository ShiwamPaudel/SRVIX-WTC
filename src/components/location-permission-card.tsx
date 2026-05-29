"use client";

import { useEffect, useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PermissionStateText = "granted" | "prompt" | "denied" | "unsupported" | "unknown";

function labelForState(state: PermissionStateText) {
  if (state === "granted") return "Location permission is enabled on this device.";
  if (state === "denied") return "Location permission is blocked for this browser.";
  if (state === "prompt") return "Allow location before sending live location.";
  if (state === "unsupported") return "Location is not available in this browser.";
  return "Check this device before sending live location.";
}

export function LocationPermissionCard() {
  const [permission, setPermission] = useState<PermissionStateText>("unknown");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPermission("unsupported");
      return;
    }

    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => {
        setPermission(status.state);
        status.onchange = () => setPermission(status.state);
      })
      .catch(() => setPermission("prompt"));
  }, []);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("GPS is not available in this browser");
      setPermission("unsupported");
      return;
    }

    setChecking(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setPermission("granted");
        setChecking(false);
        toast.success("Location permission enabled");
      },
      (error) => {
        setPermission(error.code === error.PERMISSION_DENIED ? "denied" : "prompt");
        setChecking(false);
        toast.error("Location permission not enabled", {
          description: error.message || "Open browser settings and allow location for SRVIX.",
        });
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 },
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#12384f]">Location permission</p>
          <p className="mt-1 text-sm text-slate-500">{labelForState(permission)}</p>
        </div>
        <Button type="button" variant={permission === "granted" ? "secondary" : "default"} onClick={requestLocation} disabled={checking || permission === "unsupported"}>
          <LocateFixed className="size-4" />
          {checking ? "Checking..." : permission === "granted" ? "Test" : "Enable"}
        </Button>
      </div>
    </div>
  );
}
