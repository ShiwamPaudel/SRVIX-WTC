import { formatDateTime } from "@/lib/utils";
import type { TicketLog } from "@/types/service";
import { StatusBadge } from "@/components/status-badge";

export function ActivityTimeline({ logs }: { logs: TicketLog[] }) {
  if (!logs.length) {
    return <p className="text-sm text-slate-500">No service activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {logs.map((log) => (
        <li key={log.LogID} className="relative border-l border-slate-200 pl-4">
          <span className="absolute -left-1.5 top-1 size-3 rounded-full bg-sky-500 ring-4 ring-sky-50" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={log.Status} />
            <span className="text-xs text-slate-500">{formatDateTime(log.UpdateDate)}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-950">{log.UpdatedBy}</p>
          <p className="mt-1 text-sm text-slate-600">{log.Remarks}</p>
        </li>
      ))}
    </ol>
  );
}
