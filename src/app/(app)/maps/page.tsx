import { auth } from "@/auth";
import { GoogleMapView } from "@/components/google-map-view";
import { LiveLocationTracker } from "@/components/live-location-tracker";
import { MapAutoRefresh } from "@/components/map-auto-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataService } from "@/lib/turso/service";
import { formatDateTime, minutesAgo } from "@/lib/utils";
import type { EngineerLocationLog } from "@/types/service";

export const dynamic = "force-dynamic";
const ACTIVE_LOCATION_WINDOW_MS = 8 * 60 * 60 * 1000;

function locationUpdateLabel(value?: string) {
  if (!value) return "No recent check in";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const ageInMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  return ageInMinutes <= 24 * 60 ? `Updated ${minutesAgo(value)}` : `Last updated at ${formatDateTime(value)}`;
}

export default async function MapsPage() {
  const session = await auth();
  const [engineers, locationLogs] = await Promise.all([dataService.engineers(), dataService.engineerLocationLogs()]);
  const latestLocationByEngineer = locationLogs.reduce<Map<string, EngineerLocationLog>>((latest, log) => {
    const current = latest.get(log.EngineerID);
    const currentTime = current ? new Date(current.CreatedAt).getTime() : 0;
    const nextTime = new Date(log.CreatedAt).getTime();
    if (!current || nextTime >= currentTime) latest.set(log.EngineerID, log);
    return latest;
  }, new Map());
  const engineerById = new Map(engineers.map((engineer) => [engineer.EngineerID, engineer]));

  const points = Array.from(latestLocationByEngineer.values())
    .filter((location) => {
      const updatedAt = new Date(location.CreatedAt).getTime();
      return Number.isFinite(updatedAt) && Date.now() - updatedAt <= ACTIVE_LOCATION_WINDOW_MS;
    })
    .map((location) => {
      const engineer = engineerById.get(location.EngineerID);
      return {
        id: location.EngineerID,
        title: location.EngineerName || engineer?.EngineerName || "Engineer",
        subtitle: locationUpdateLabel(location.CreatedAt),
        description: location.Remarks || "No remarks added",
        latitude: Number(location.Latitude),
        longitude: Number(location.Longitude),
        status: engineer?.ActiveStatus,
        kind: "Engineer",
      };
    })
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  return (
    <div className="space-y-5">
      <MapAutoRefresh />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Live Map</h1>
        <p className="text-sm text-slate-500">Engineers appear on the map only when their latest location is less than 8 hours old.</p>
      </div>
      {session?.user.engineerId ? (
        <Card>
          <CardHeader><CardTitle>Location Check In</CardTitle></CardHeader>
          <CardContent>
            <LiveLocationTracker engineerId={session.user.engineerId} />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader><CardTitle>Engineer Location Map</CardTitle></CardHeader>
        <CardContent><GoogleMapView points={points} height={620} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent Location Updates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {locationLogs.slice(-8).reverse().map((log) => (
            <div key={log.LocationLogID} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-950">{log.EngineerName}</p>
                <p className="text-xs text-slate-500">{locationUpdateLabel(log.CreatedAt)}</p>
              </div>
              {log.Remarks ? <p className="mt-1 text-sm text-slate-600">{log.Remarks}</p> : null}
            </div>
          ))}
          {!locationLogs.length ? <p className="text-sm text-slate-500">No engineer location submissions yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
