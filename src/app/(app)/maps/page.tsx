import { auth } from "@/auth";
import { GoogleMapView } from "@/components/google-map-view";
import { LiveLocationTracker } from "@/components/live-location-tracker";
import { MapAutoRefresh } from "@/components/map-auto-refresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceDataset } from "@/lib/data";
import { formatDateTime, minutesAgo } from "@/lib/utils";
import type { EngineerLocationLog } from "@/types/service";

export const dynamic = "force-dynamic";

function locationUpdateLabel(value?: string) {
  if (!value) return "No recent check in";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const ageInMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  return ageInMinutes <= 24 * 60 ? `Updated ${minutesAgo(value)}` : `Last updated at ${formatDateTime(value)}`;
}

export default async function MapsPage() {
  const session = await auth();
  const { customers, engineers, tickets, locationLogs } = await getServiceDataset();
  const latestLocationByEngineer = locationLogs.reduce<Map<string, EngineerLocationLog>>((latest, log) => {
    const current = latest.get(log.EngineerID);
    const currentTime = current ? new Date(current.CreatedAt).getTime() : 0;
    const nextTime = new Date(log.CreatedAt).getTime();
    if (!current || nextTime >= currentTime) latest.set(log.EngineerID, log);
    return latest;
  }, new Map());

  const points = [
    ...customers.map((customer) => ({
      id: customer.CustomerID,
      title: customer.NameOfCustomer || customer.HospitalName || "Customer not named",
      subtitle: `${customer.Department || "Customer site"} - customer`,
      latitude: Number(customer.Latitude),
      longitude: Number(customer.Longitude),
      status: "Customer",
    })),
    ...engineers.map((engineer) => {
      const latestLocation = latestLocationByEngineer.get(engineer.EngineerID);
      return {
        id: engineer.EngineerID,
        title: engineer.EngineerName,
        subtitle: locationUpdateLabel(engineer.LastLocationUpdate),
        description: latestLocation?.Remarks || "No remarks added",
        latitude: Number(engineer.LiveLatitude),
        longitude: Number(engineer.LiveLongitude),
        status: engineer.ActiveStatus,
        kind: "Engineer",
      };
    }),
    ...tickets.map((ticket) => ({
      id: ticket.TicketID,
      title: ticket.TicketTitle,
      subtitle: `${ticket.TicketStatus} - ticket`,
      latitude: Number(ticket.Latitude),
      longitude: Number(ticket.Longitude),
      status: ticket.TicketStatus,
    })),
  ].filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  return (
    <div className="space-y-5">
      <MapAutoRefresh />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Live Map</h1>
        <p className="text-sm text-slate-500">Customer sites, ticket locations, and live engineer check-ins.</p>
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
        <CardHeader><CardTitle>Operational Map</CardTitle></CardHeader>
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
