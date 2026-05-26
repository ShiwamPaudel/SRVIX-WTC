"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

export type MapPoint = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  latitude: number;
  longitude: number;
  status?: string;
  kind?: string;
};

type LeafletMap = {
  remove: () => void;
  fitBounds: (bounds: unknown, options?: Record<string, unknown>) => void;
};

type LeafletLayer = {
  addTo: (map: LeafletMap) => LeafletLayer;
  bindPopup?: (content: string) => LeafletLayer;
  bindTooltip?: (content: string, options?: Record<string, unknown>) => LeafletLayer;
};

type LeafletRuntime = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => LeafletLayer;
  circleMarker: (latLng: [number, number], options?: Record<string, unknown>) => LeafletLayer;
  latLngBounds: (latLngs: [number, number][]) => unknown;
};

declare global {
  interface Window {
    L?: LeafletRuntime;
  }
};

const leafletCssId = "leaflet-css";
const leafletScriptId = "leaflet-script";
const leafletCssUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const leafletScriptUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const nepalCenter: [number, number] = [28.3949, 84.1240];
const nepalBounds: [number, number][] = [
  [26.347, 80.058],
  [30.447, 88.201],
];

function markerColor(status?: string) {
  if (status === "Critical" || status === "Pending") return "#e11d48";
  if (status === "On Visit") return "#0284c7";
  if (status === "Closed" || status === "Available") return "#059669";
  return "#64748b";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);

  let css = document.getElementById(leafletCssId) as HTMLLinkElement | null;
  if (!css) {
    css = document.createElement("link");
    css.id = leafletCssId;
    css.rel = "stylesheet";
    css.href = leafletCssUrl;
    css.crossOrigin = "";
    document.head.appendChild(css);
  }

  let script = document.getElementById(leafletScriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = leafletScriptId;
    script.src = leafletScriptUrl;
    script.crossOrigin = "";
    script.async = true;
    document.body.appendChild(script);
  }

  return new Promise<LeafletRuntime>((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }
    script.addEventListener("load", () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet did not load"));
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Leaflet could not be loaded")), { once: true });
  });
}

export function GoogleMapView({ points, height = 420 }: { points: MapPoint[]; height?: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    let map: LeafletMap | undefined;
    let cancelled = false;
    setReady(false);
    setFailed(false);

    loadLeaflet()
      .then((leaflet) => {
        if (!mapRef.current || cancelled) return;
        map = leaflet.map(mapRef.current, {
          center: nepalCenter,
          zoom: 7,
          zoomControl: true,
          scrollWheelZoom: true,
        });
        leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        const latLngs = points.map<[number, number]>((point) => [point.latitude, point.longitude]);
        points.forEach((point) => {
          const lines = [
            `<strong>${escapeHtml(point.title)}</strong>`,
            point.subtitle ? escapeHtml(point.subtitle) : "",
            point.description ? escapeHtml(point.description) : "",
          ].filter(Boolean);
          const marker = leaflet.circleMarker([point.latitude, point.longitude], {
            radius: point.kind === "Engineer" ? 9 : 7,
            color: "#ffffff",
            weight: 2,
            fillColor: markerColor(point.status),
            fillOpacity: 0.95,
          }).addTo(map as LeafletMap);
          marker.bindPopup?.(lines.join("<br/>"));
          marker.bindTooltip?.(escapeHtml(point.title), {
            permanent: true,
            direction: "top",
            offset: [0, -10],
            className: "srvix-map-label",
          });
        });

        if (!latLngs.length) {
          map.fitBounds(leaflet.latLngBounds(nepalBounds), { padding: [24, 24] });
        } else if (latLngs.length === 1) {
          map.fitBounds(leaflet.latLngBounds(latLngs), { maxZoom: 14, padding: [48, 48] });
        } else {
          map.fitBounds(leaflet.latLngBounds(latLngs), { maxZoom: 13, padding: [48, 48] });
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  if (failed) {
    return (
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="grid place-items-center bg-slate-100 p-6" style={{ height }}>
          <div className="max-w-md text-center">
            <MapPin className="mx-auto size-8 text-sky-600" />
            <p className="mt-3 font-semibold text-slate-950">{failed ? "Map could not load" : "No map points yet"}</p>
            <p className="mt-1 text-sm text-slate-600">
              {failed
                ? "The OpenStreetMap viewer needs internet access to load map assets."
                : "Engineer check-ins will appear here after a location is submitted."}
            </p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {points.map((point) => (
            <div key={point.id} className="p-3 text-sm">
              <p className="font-medium text-slate-800">{point.title}</p>
              {point.subtitle ? <p className="mt-0.5 text-xs text-slate-500">{point.subtitle}</p> : null}
              {point.description ? <p className="mt-1 text-sm text-slate-600">{point.description}</p> : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div ref={mapRef} style={{ height }} className="w-full bg-slate-100" />
      {!ready ? <p className="p-3 text-sm text-slate-500">Loading map...</p> : null}
    </div>
  );
}
