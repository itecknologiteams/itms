import { LatLon } from '@itms/common';
import { GeoJsonPolygon } from '../entities/zone.entity';

/** Convert a GeoJSON Polygon (outer ring, [lon,lat]) to the {lat,lon} ring the geo utils use. */
export function polygonToRing(poly: GeoJsonPolygon): LatLon[] {
  const outer = poly.coordinates[0] ?? [];
  return outer.map(([lon, lat]) => ({ lat, lon }));
}

/** Basic structural validation of a GeoJSON Polygon ring. */
export function isValidPolygon(poly: GeoJsonPolygon): boolean {
  if (poly.type !== 'Polygon' || !Array.isArray(poly.coordinates)) return false;
  const outer = poly.coordinates[0];
  if (!Array.isArray(outer) || outer.length < 4) return false; // ≥3 distinct + closing point
  return outer.every(
    (p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number'),
  );
}
