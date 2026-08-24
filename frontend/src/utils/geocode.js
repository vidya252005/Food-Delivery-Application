import { BENGALURU_AREAS, haversineKm } from '../config/cities';
import { api } from './api';

/** Pick the closest known Bengaluru neighbourhood for a lat/lng pair. */
export function nearestBengaluruArea(lat, lng) {
  if (lat == null || lng == null) return null;
  let best = null;
  let bestKm = Infinity;
  for (const area of BENGALURU_AREAS) {
    const km = haversineKm(lat, lng, area.lat, area.lng);
    if (km < bestKm) {
      bestKm = km;
      best = area;
    }
  }
  return best ? { ...best, distanceKm: bestKm } : null;
}

/** Immediate label without network — used while geocoding and for stale saved locations. */
export function buildLocationLabelSync(lat, lng) {
  const area = nearestBengaluruArea(lat, lng);
  return area ? `${area.label}, Bengaluru` : 'Bengaluru';
}

export function enrichLocation(loc) {
  if (!loc?.lat || !loc?.lng) return loc;
  const stale = !loc.label || loc.label === 'Your location';
  if (!stale) return loc;
  const area = nearestBengaluruArea(loc.lat, loc.lng);
  return {
    ...loc,
    label: buildLocationLabelSync(loc.lat, loc.lng),
    area: loc.area || area?.label,
    city: loc.city || 'Bengaluru',
  };
}

/** Human-readable label: backend reverse geocode, then nearest area fallback. */
export async function resolveLocationLabel(lat, lng) {
  const syncLabel = buildLocationLabelSync(lat, lng);
  const area = nearestBengaluruArea(lat, lng);

  try {
    const { data } = await api.get('/geo/reverse', { params: { lat, lng } });
    if (data?.label) return data.label;
    if (data?.shortLabel) return data.shortLabel;
  } catch {
    /* use sync fallback */
  }

  return syncLabel;
}

export function restaurantsWithCoords(list = []) {
  return list.filter((r) => {
    const lat = r.location?.lat ?? r.latitude;
    const lng = r.location?.lng ?? r.longitude;
    return lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
  }).map((r) => ({
    ...r,
    location: {
      lat: Number(r.location?.lat ?? r.latitude),
      lng: Number(r.location?.lng ?? r.longitude),
    },
  }));
}
