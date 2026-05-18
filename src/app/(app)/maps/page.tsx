import { GoogleMapView } from "@/components/google-map-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceDataset } from "@/lib/data";

export default async function MapsPage() {
  const { customers, engineers, tickets } = await getServiceDataset();
  const points = [
    ...customers.map((customer) => ({
      id: customer.CustomerID,
      title: customer.NameOfCustomer || customer.HospitalName || "Customer not named",
      subtitle: `${customer.Department || "Customer site"} - customer`,
      latitude: Number(customer.Latitude),
      longitude: Number(customer.Longitude),
      status: "Customer",
    })),
    ...engineers.map((engineer) => ({
      id: engineer.EngineerID,
      title: engineer.EngineerName,
      subtitle: `${engineer.ActiveStatus} - engineer`,
      latitude: Number(engineer.LiveLatitude),
      longitude: Number(engineer.LiveLongitude),
      status: engineer.ActiveStatus,
    })),
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Maps Overview</h1>
        <p className="text-sm text-slate-500">Customer sites, ticket locations, live engineer markers, clustering, and directions support.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Operational Map</CardTitle></CardHeader>
        <CardContent><GoogleMapView points={points} height={620} /></CardContent>
      </Card>
    </div>
  );
}
