"use client";

import { useEffect, useState } from "react";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }
  return output;
}

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    const hasWebPush = window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const isSupported = hasWebPush && (!isIos || isStandalone);
    setSupported(isSupported);
    if (!isSupported) {
      if (isIos && !isStandalone) {
        setSupportMessage("On iPhone/iPad, add SRVIX to Home Screen and open it from the app icon to enable push notifications.");
      } else if (!window.isSecureContext) {
        setSupportMessage("Push notifications require HTTPS.");
      } else {
        setSupportMessage("This browser does not support web push notifications.");
      }
      return;
    }

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEnabled(Boolean(subscription)))
      .catch(() => undefined);
  }, []);

  async function serviceWorkerRegistration() {
    const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    return registration;
  }

  async function enable() {
    if (!supported) {
      toast.error("Push notifications are not supported on this device");
      return;
    }

    setLoading(true);
    try {
      const keyResponse = await fetch("/api/push/public-key");
      const keyData = (await keyResponse.json()) as { publicKey?: string; configured?: boolean; missing?: string[]; error?: string };
      if (!keyResponse.ok || !keyData.publicKey || !keyData.configured) {
        throw new Error(
          keyData.error ||
            (keyData.missing?.length ? `Push notifications missing: ${keyData.missing.join(", ")}` : "Push notifications are not configured"),
        );
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted");

      const registration = await serviceWorkerRegistration();
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) await existingSubscription.unsubscribe();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Could not save this device");
      }

      setEnabled(true);
      toast.success("Push notifications enabled");
    } catch (error) {
      toast.error("Could not enable push notifications", {
        description: error instanceof Error ? error.message : "Check browser permissions and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function testPush() {
    setTesting(true);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        result?: {
          sent?: number;
          failed?: number;
          subscriptionCount?: number;
          skipped?: boolean;
          errors?: { statusCode?: number; body?: string; message?: string }[];
        };
      } | null;
      if (!response.ok) {
        const firstError = data?.result?.errors?.[0];
        const detail = [firstError?.statusCode ? `Provider status ${firstError.statusCode}` : "", firstError?.body || firstError?.message]
          .filter(Boolean)
          .join(": ");
        throw new Error([data?.error, detail].filter(Boolean).join(" "));
      }
      toast.success("Test push sent", {
        description: data?.result ? `${data.result.sent ?? 0}/${data.result.subscriptionCount ?? 0} device subscription sent.` : undefined,
      });
    } catch (error) {
      toast.error("Test push failed", {
        description: error instanceof Error ? error.message : "Enable push again and retry.",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#12384f]">Push notifications</p>
          <p className="mt-1 text-sm text-slate-500">{enabled ? "Enabled on this device." : "Enable this device for SRVIX alerts."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <Button type="button" variant="secondary" onClick={testPush} disabled={testing || loading}>
              <Send className="size-4" />
              {testing ? "Sending..." : "Test"}
            </Button>
          ) : null}
          <Button type="button" variant={enabled ? "secondary" : "default"} onClick={enable} disabled={loading || !supported}>
            <Bell className="size-4" />
            {loading ? "Saving..." : enabled ? "Re-enable" : "Enable"}
          </Button>
        </div>
      </div>
      {!supported && supportMessage ? <p className="mt-3 text-sm text-amber-700">{supportMessage}</p> : null}
    </div>
  );
}
