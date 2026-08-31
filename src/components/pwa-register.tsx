"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const installPromptStorageKey = "srvix-install-prompt-dismissed";

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isMobileBrowser() {
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isSafari = /^((?!CriOS|FxiOS|EdgiOS).)*Safari/i.test(ua);
  return isIos && isSafari;
}

export function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    }

    if (!isMobileBrowser() || isStandalone() || localStorage.getItem(installPromptStorageKey)) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const iosTimer = window.setTimeout(() => {
      if (!deferredPrompt && isIosSafari()) {
        setShowIosHelp(true);
        setShowInstallPrompt(true);
      }
    }, 1400);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.clearTimeout(iosTimer);
    };
  }, [deferredPrompt]);

  function dismissPrompt() {
    localStorage.setItem(installPromptStorageKey, "1");
    setShowInstallPrompt(false);
  }

  async function installApp() {
    if (!deferredPrompt) {
      dismissPrompt();
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => ({ outcome: "dismissed" as const, platform: "" }));
    if (choice.outcome === "accepted") {
      localStorage.setItem(installPromptStorageKey, "1");
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  }

  useEffect(() => {
    const handleInstalled = () => dismissPrompt();
    window.addEventListener("appinstalled", handleInstalled);
    return () => window.removeEventListener("appinstalled", handleInstalled);
  }, []);

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-md border border-slate-200 bg-white p-3 shadow-xl sm:bottom-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#e8f7ff] text-[#0077b6]">
          <Download className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#12384f]">Install SRVIX</p>
          <p className="mt-1 text-sm text-slate-600">
            {showIosHelp ? "Use Share, then Add to Home Screen for a faster phone experience." : "Add SRVIX to your home screen for a faster phone experience."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {showIosHelp ? (
              <Button type="button" size="sm" onClick={dismissPrompt}>
                Got it
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={installApp}>
                Install
              </Button>
            )}
            <Button type="button" size="sm" variant="secondary" onClick={dismissPrompt}>
              Later
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissPrompt}
          aria-label="Close install prompt"
          className="grid size-8 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
