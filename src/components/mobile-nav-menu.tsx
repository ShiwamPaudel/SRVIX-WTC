"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Menu, UserCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { visibleNavItems } from "@/components/nav-items";
import { clearServiceWorkerCache } from "@/lib/clear-service-worker-cache";
import type { UserRole } from "@/types/service";

export function MobileNavMenu({
  userName,
  role,
}: {
  userName?: string | null;
  role?: UserRole;
}) {
  const [open, setOpen] = useState(false);
  const visibleItems = visibleNavItems(role);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="flex size-10 items-center justify-center rounded-md border border-slate-200 bg-white text-[#12384f] shadow-sm transition hover:bg-[#f7fbff]"
      >
        <Menu className="size-5" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-30 cursor-default bg-slate-950/20"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-40 flex h-[calc(100dvh-5.5rem)] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-md border border-slate-200 bg-white p-3 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-2 pb-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[#12384f]">{userName ?? "Profile"}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{role}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-[#12384f] shadow-sm"
              >
                <X className="size-4" />
                Close
              </button>
            </div>

            <nav className="mt-3 flex-1 space-y-1 overflow-y-auto">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-md px-3 py-3 text-base font-semibold text-slate-700 transition hover:bg-[#e8f7ff] hover:text-[#12384f]"
                >
                  <item.icon className="size-5 text-[#38b6ff]" />
                  {item.label}
                </Link>
              ))}
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center gap-3 rounded-md px-3 py-3 text-base font-semibold text-slate-700 transition hover:bg-[#e8f7ff] hover:text-[#12384f]"
              >
                <UserCircle className="size-5 text-[#38b6ff]" />
                Profile
              </Link>
            </nav>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-11 w-full justify-center text-base"
                onClick={() => {
                  clearServiceWorkerCache();
                  signOut({ callbackUrl: "/login" });
                }}
              >
                <LogOut className="size-5" />
                Sign out
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
