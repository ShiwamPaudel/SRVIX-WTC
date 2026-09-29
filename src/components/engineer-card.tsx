import { Mail, MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EngineerStatusButton } from "@/components/engineer-status-button";
import { isEngineerActive, isEngineerResigned } from "@/lib/engineers";
import { minutesAgo } from "@/lib/utils";
import type { Engineer } from "@/types/service";

export function EngineerCard({ engineer, canManage = false }: { engineer: Engineer; canManage?: boolean }) {
  const active = isEngineerActive(engineer);
  const resigned = isEngineerResigned(engineer);

  return (
    <Card className={resigned ? "border-slate-200 bg-slate-50/80" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={`font-semibold ${resigned ? "text-slate-600" : "text-slate-950"}`}>{engineer.EngineerName}</h3>
            <p className="text-sm text-slate-500">{[engineer.Department, engineer.Role].filter(Boolean).join(" - ")}</p>
          </div>
          <Badge variant={active ? "green" : "slate"}>{engineer.ActiveStatus}</Badge>
        </div>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p className="flex items-center gap-2"><Phone className="size-4 text-slate-400" />{engineer.Phone}</p>
          <p className="flex items-center gap-2"><Mail className="size-4 text-slate-400" />{engineer.Email}</p>
          {resigned ? (
            <p className="flex items-center gap-2 text-slate-500"><MapPin className="size-4 text-slate-400" />Login disabled - history kept</p>
          ) : (
            <p className="flex items-center gap-2"><MapPin className="size-4 text-slate-400" />{minutesAgo(engineer.LastLocationUpdate)}</p>
          )}
        </div>
        {canManage ? (
          <div className="mt-4">
            <EngineerStatusButton engineerId={engineer.EngineerID} engineerName={engineer.EngineerName} resigned={resigned} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
