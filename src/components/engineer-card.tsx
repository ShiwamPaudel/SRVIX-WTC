import { Mail, MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { minutesAgo } from "@/lib/utils";
import type { Engineer } from "@/types/service";

export function EngineerCard({ engineer }: { engineer: Engineer }) {
  const active = engineer.ActiveStatus !== "Inactive";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-950">{engineer.EngineerName}</h3>
            <p className="text-sm text-slate-500">{[engineer.Department, engineer.Role].filter(Boolean).join(" - ")}</p>
          </div>
          <Badge variant={active ? "green" : "slate"}>{engineer.ActiveStatus}</Badge>
        </div>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p className="flex items-center gap-2"><Phone className="size-4 text-slate-400" />{engineer.Phone}</p>
          <p className="flex items-center gap-2"><Mail className="size-4 text-slate-400" />{engineer.Email}</p>
          <p className="flex items-center gap-2"><MapPin className="size-4 text-slate-400" />{minutesAgo(engineer.LastLocationUpdate)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
