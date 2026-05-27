"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LiveFilterForm({
  children,
  className,
  debounceMs = 350,
}: {
  children: React.ReactNode;
  className?: string;
  debounceMs?: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isWaiting, setIsWaiting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const busy = isWaiting || isPending;

  useEffect(() => {
    setIsWaiting(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    let timeout: number | undefined;
    const applyFilters = () => {
      window.clearTimeout(timeout);
      setIsWaiting(true);
      timeout = window.setTimeout(() => {
        const data = new FormData(form);
        const params = new URLSearchParams();
        data.forEach((value, key) => {
          const text = String(value).trim();
          if (text) params.set(key, text);
        });
        const nextHref = params.size ? `${pathname}?${params.toString()}` : pathname;
        const currentHref = `${window.location.pathname}${window.location.search}`;
        if (nextHref === currentHref) {
          setIsWaiting(false);
          return;
        }
        startTransition(() => {
          router.replace(nextHref, { scroll: false });
        });
      }, debounceMs);
    };

    form.addEventListener("input", applyFilters);
    form.addEventListener("change", applyFilters);
    return () => {
      window.clearTimeout(timeout);
      form.removeEventListener("input", applyFilters);
      form.removeEventListener("change", applyFilters);
    };
  }, [debounceMs, pathname, router]);

  return (
    <div className="space-y-2">
      <form
        ref={formRef}
        className={cn(className)}
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        {children}
      </form>
      {busy ? (
        <div className="grid gap-2 rounded-md border border-sky-100 bg-white p-3 shadow-sm" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24 bg-sky-100" />
            <Skeleton className="h-3 flex-1 bg-sky-100" />
          </div>
          <Skeleton className="h-2 w-full bg-sky-100" />
        </div>
      ) : null}
    </div>
  );
}
