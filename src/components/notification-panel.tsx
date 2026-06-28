"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCheck, Inbox, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { NotificationRecord } from "@/types/service";

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.ReadAt && notification.Status !== "Read").length,
    [notifications],
  );

  async function loadNotifications() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { notifications: NotificationRecord[] };
      setNotifications(data.notifications);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    loadNotifications();
    const loadWhenVisible = () => {
      if (document.visibilityState === "visible") loadNotifications();
    };
    const interval = window.setInterval(loadWhenVisible, 30000);
    document.addEventListener("visibilitychange", loadWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", loadWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((items) => items.map((item) => ({ ...item, Status: "Read", ReadAt: item.ReadAt || new Date().toISOString() })));
  }

  async function markRead(notification: NotificationRecord) {
    if (notification.ReadAt || notification.Status === "Read") return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: notification.NotificationID }),
    });
    setNotifications((items) =>
      items.map((item) =>
        item.NotificationID === notification.NotificationID
          ? { ...item, Status: "Read", ReadAt: item.ReadAt || new Date().toISOString() }
          : item,
      ),
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative size-10 shrink-0 cursor-pointer rounded-md border border-slate-200 bg-white text-[#12384f] shadow-sm hover:bg-[#f7fbff]"
        onClick={() => setOpen(true)}
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unreadCount ? (
          <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-rose-600 ring-2 ring-white">
            <span className="sr-only">{unreadCount} unread notifications</span>
          </span>
        ) : null}
        {unreadCount > 1 ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-5 text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open && mounted
        ? createPortal(
        <div className="fixed inset-0 z-[2147483000] overflow-hidden">
          <button
            className="absolute inset-0 cursor-default bg-slate-950/40 backdrop-blur-sm"
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-dvh w-full max-w-[27rem] flex-col border-l border-slate-200 bg-white shadow-2xl sm:right-4 sm:top-4 sm:h-[calc(100dvh-2rem)] sm:rounded-lg sm:border">
            <div className="flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200 px-5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-[#12384f]">Notifications</p>
                  {unreadCount ? <Badge variant="blue">{unreadCount} unread</Badge> : null}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{loading ? "Refreshing" : `${notifications.length} recent alerts`}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  onClick={markAllRead}
                  disabled={!unreadCount}
                  aria-label="Mark all read"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3 sm:p-4">
              {notifications.map((notification) => {
                const unread = !notification.ReadAt && notification.Status !== "Read";
                const content = (
                  <div
                    className={`relative rounded-md border bg-white p-4 text-left shadow-sm transition ${
                      unread ? "border-sky-300 ring-1 ring-sky-100" : "border-slate-200 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    {unread ? <span className="absolute left-0 top-4 h-8 w-1 rounded-r-full bg-sky-500" /> : null}
                    <div className="flex items-start gap-3 pl-2">
                      <span className={`mt-1 size-2 shrink-0 rounded-full ${unread ? "bg-sky-500" : "bg-slate-300"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{notification.Subject}</p>
                          <p className="shrink-0 text-[11px] font-medium text-slate-400">{formatDateTime(notification.CreatedAt)}</p>
                        </div>
                        <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600">{notification.Message}</p>
                      </div>
                    </div>
                  </div>
                );

                return notification.URL ? (
                  <Link
                    key={notification.NotificationID}
                    href={notification.URL}
                    className="block"
                    onClick={() => {
                      markRead(notification);
                      setOpen(false);
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={notification.NotificationID}
                    type="button"
                    className="block w-full"
                    onClick={() => markRead(notification)}
                  >
                    {content}
                  </button>
                );
              })}
              {!notifications.length ? (
                <div className="grid min-h-72 place-items-center rounded-md border border-dashed border-slate-200 bg-white p-6 text-center">
                  <div>
                    <Inbox className="mx-auto size-8 text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-700">No notifications</p>
                    <p className="mt-1 text-xs text-slate-500">Operational alerts will appear here.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>,
        document.body,
        )
        : null}
    </>
  );
}
