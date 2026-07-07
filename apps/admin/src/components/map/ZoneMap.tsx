'use client';

import { MapContainer, Polygon, TileLayer, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { Zone } from '@/types/api';

const KARACHI_CENTER: LatLngExpression = [24.86, 67.03];

const STATUS_COLOR: Record<Zone['status'], string> = {
  active: '#0FA958',
  inactive: '#9CA3AF',
};

function ClickCapture({ onClick }: { onClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface ZoneMapProps {
  zones: Zone[];
  /** When set, clicking the map appends a vertex to the in-progress draw. */
  drawing?: boolean;
  drawPoints?: { lat: number; lon: number }[];
  onDrawPoint?: (lat: number, lon: number) => void;
}

/** Read-only zone overview + optional click-to-draw for creating a new zone.
 * Uses OpenStreetMap tiles (no API key) per docs/techstack.md §6 cost fallback. */
export function ZoneMap({ zones, drawing, drawPoints = [], onDrawPoint }: ZoneMapProps) {
  return (
    <MapContainer center={KARACHI_CENTER} zoom={12} className="h-full w-full rounded-card">
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {drawing && onDrawPoint && <ClickCapture onClick={onDrawPoint} />}
      {zones.map((zone) => (
        <Polygon
          key={zone.id}
          positions={zone.boundary.coordinates[0].map(([lon, lat]) => [lat, lon] as LatLngExpression)}
          pathOptions={{ color: STATUS_COLOR[zone.status], fillOpacity: 0.15, weight: 2 }}
        />
      ))}
      {drawPoints.length > 0 && (
        <Polygon
          positions={drawPoints.map((p) => [p.lat, p.lon] as LatLngExpression)}
          pathOptions={{ color: '#00C2A8', fillOpacity: 0.25, dashArray: '6 4', weight: 2 }}
        />
      )}
    </MapContainer>
  );
}
