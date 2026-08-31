"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearServiceWorkerCache } from "@/lib/clear-service-worker-cache";

// The app shell signs out through a server action, which cannot reach the service worker. This
// submits that same form unchanged and only adds the cache clear on the client beforehand.
export function SignOutButton() {
  return (
    <Button type="submit" variant="secondary" size="sm" onClick={() => clearServiceWorkerCache()}>
      <LogOut className="size-4" />
      Sign out
    </Button>
  );
}
