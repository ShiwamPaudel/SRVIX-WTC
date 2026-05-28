"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Inbox, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { NotificationRecord } from "@/types/service";

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.ReadAt && notification.Status !== "Read").length,
    [notifications],
  );

  async function loadNotifications() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { notifications: NotificationRecord[] };
      setNotifications(data.notifications);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(interval);
  }, []);

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
        className="relative size-10 shrink-0 rounded-md border border-slate-200 bg-white text-[#12384f] shadow-sm hover:bg-[#f7fbff]"
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

      {open ? (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <button
            className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-[1px]"
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-dvh w-full max-w-[26rem] flex-col border-l border-slate-200 bg-white shadow-2xl sm:right-3 sm:top-3 sm:h-[calc(100dvh-1.5rem)] sm:rounded-lg sm:border">
            <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 px-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#12384f]">Notifications</p>
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
            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50/70 p-3">
              {notifications.map((notification) => {
                const unread = !notification.ReadAt && notification.Status !== "Read";
                const content = (
                  <div
                    className={`relative rounded-md border bg-white p-3 text-left shadow-sm transition ${
                      unread ? "border-sky-200 ring-1 ring-sky-100" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {unread ? <span className="absolute left-0 top-3 h-8 w-1 rounded-r-full bg-sky-500" /> : null}
                    <div className="flex items-start justify-between gap-3 pl-2">
                      <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{notification.Subject}</p>
                      <p className="shrink-0 text-[11px] font-medium text-slate-400">{formatDateTime(notification.CreatedAt)}</p>
                    </div>
                    <p className="mt-1 line-clamp-3 pl-2 text-sm leading-5 text-slate-600">{notification.Message}</p>
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
        </div>
      ) : null}
    </>
  );
}
