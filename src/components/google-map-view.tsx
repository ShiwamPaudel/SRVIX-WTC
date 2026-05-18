"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

export type MapPoint = {
  id: string;
  title: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
  status?: string;
};

type GoogleMapsRuntime = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: Record<string, unknown>,
    ) => object;
    InfoWindow: new () => {
      setContent: (content: string) => void;
      open: (options: Record<string, unknown>) => void;
    };
    Marker: new (options: Record<string, unknown>) => {
      addListener: (event: string, handler: () => void) => void;
    };
    SymbolPath: {
      CIRCLE: string | number | symbol;
    };
  };
};

function markerColor(status?: string) {
  if (status === "Critical" || status === "Pending") return "#e11d48";
  if (status === "On Visit") return "#0284c7";
  if (status === "Closed" || status === "Available") return "#059669";
  return "#64748b";
}

export function GoogleMapView({ points, height = 420 }: { points: MapPoint[]; height?: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current || !points.length) return;

    let clusterer: MarkerClusterer | undefined;

    setOptions({
      key: apiKey,
      v: "weekly",
      mapIds: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ? [process.env.NEXT_PUBLIC_GOOGLE_MAP_ID] : undefined,
    });

    Promise.all([importLibrary("maps"), importLibrary("marker")]).then(([mapsLibrary, markerLibrary]) => {
      if (!mapRef.current) return;
      const googleApi = (window as typeof window & { google: GoogleMapsRuntime }).google;
      const center = { lat: points[0].latitude, lng: points[0].longitude };
      const map = new mapsLibrary.Map(mapRef.current, {
        center,
        zoom: 7,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
        streetViewControl: false,
        fullscreenControl: false,
      });
      const info = new mapsLibrary.InfoWindow();
      const markers = points.map((point) => {
        const marker = new markerLibrary.Marker({
          position: { lat: point.latitude, lng: point.longitude },
          title: point.title,
          icon: {
            path: googleApi.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: markerColor(point.status),
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
        marker.addListener("click", () => {
          info.setContent(`<strong>${point.title}</strong><br/>${point.subtitle ?? ""}`);
          info.open({ anchor: marker, map });
        });
        return marker;
      });
      clusterer = new MarkerClusterer({ map, markers });
      setReady(true);
    });

    return () => clusterer?.clearMarkers();
  }, [apiKey, points]);

  if (!apiKey) {
    return (
      <Card className="overflow-hidden">
        <div className="grid place-items-center bg-slate-100 p-6" style={{ height }}>
          <div className="max-w-md text-center">
            <MapPin className="mx-auto size-8 text-sky-600" />
            <p className="mt-3 font-semibold text-slate-950">Google Maps ready</p>
            <p className="mt-1 text-sm text-slate-600">
              Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to render live clustered maps. Current points are shown below.
            </p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {points.map((point) => (
            <div key={point.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="font-medium text-slate-800">{point.title}</span>
              <span className="text-slate-500">{point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div ref={mapRef} style={{ height }} className="w-full bg-slate-100" />
      {!ready ? <p className="p-3 text-sm text-slate-500">Loading map...</p> : null}
    </Card>
  );
}
