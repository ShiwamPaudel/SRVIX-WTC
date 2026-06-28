"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MapAutoRefresh({ intervalMs = 15 * 60 * 1000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refreshWhenVisible, intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs, router]);

  return null;
}
