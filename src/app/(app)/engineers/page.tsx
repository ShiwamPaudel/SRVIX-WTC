import Link from "next/link";
import { UserPlus } from "lucide-react";
import { EngineerCard } from "@/components/engineer-card";
import { GoogleMapView } from "@/components/google-map-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceDataset } from "@/lib/data";

export default async function EngineersPage() {
  const { engineers } = await getServiceDataset();
  const points = engineers.map((engineer) => ({
    id: engineer.EngineerID,
    title: engineer.EngineerName,
    subtitle: `${engineer.ActiveStatus} - ${engineer.Department}`,
    latitude: Number(engineer.LiveLatitude),
    longitude: Number(engineer.LiveLongitude),
    status: engineer.ActiveStatus,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#00000c]">Engineers</h1>
          <p className="text-sm text-slate-500">Engineer accounts, field capacity, and live GPS coordinates.</p>
        </div>
        <Button asChild>
          <Link href="/engineers/new">
            <UserPlus className="size-4" />
            New Engineer
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {engineers.map((engineer) => <EngineerCard key={engineer.EngineerID} engineer={engineer} />)}
        </div>
        <Card>
          <CardHeader><CardTitle>Live Engineer Map</CardTitle></CardHeader>
          <CardContent><GoogleMapView points={points} height={440} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
