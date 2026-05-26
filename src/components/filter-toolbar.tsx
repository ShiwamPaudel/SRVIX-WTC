import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterToolbar({
  children,
  actions,
  summary,
  className,
}: {
  children: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-slate-200 bg-[#f5f7fc] p-3 shadow-sm", className)}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
            <SlidersHorizontal className="size-4 text-sky-600" />
            Filters
          </div>
          {children}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {summary}
          {actions}
        </div>
      </div>
    </div>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("relative min-w-36", className)}>
      <span className="pointer-events-none absolute left-3 top-1.5 z-10 text-[10px] font-semibold uppercase leading-none tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export const filterInputClass =
  "h-12 rounded-md border-slate-400 bg-white px-3 pb-1.5 pt-5 text-sm font-medium text-slate-800 shadow-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-sky-500/20";

export const filterSelectClass =
  "h-12 rounded-md border-slate-400 bg-white pb-1.5 pt-5 text-sm font-medium text-slate-800 shadow-none focus:border-sky-500 focus:ring-sky-500/20";

export function FilterSummary({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{children}</span>;
}
