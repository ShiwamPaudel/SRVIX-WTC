"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const [, startTransition] = useTransition();

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    let timeout: number | undefined;
    const applyFilters = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        const data = new FormData(form);
        const params = new URLSearchParams();
        data.forEach((value, key) => {
          const text = String(value).trim();
          if (text) params.set(key, text);
        });
        startTransition(() => {
          router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
          router.refresh();
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
    <form
      ref={formRef}
      className={cn(className)}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
