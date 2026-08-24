/** FoodClub is live in Bengaluru only; other cities show coming-soon. */

export const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946, label: 'Bengaluru' };

/** Max distance from city centre to count as in-service. */
export const SERVICE_RADIUS_KM = 45;

export const BENGALURU_AREAS = [
  { label: 'Koramangala', lat: 12.9352, lng: 77.6245, city: 'Bengaluru', supported: true },
  { label: 'Indiranagar', lat: 12.9784, lng: 77.6408, city: 'Bengaluru', supported: true },
  { label: 'HSR Layout', lat: 12.9121, lng: 77.6446, city: 'Bengaluru', supported: true },
  { label: 'Whitefield', lat: 12.9698, lng: 77.7500, city: 'Bengaluru', supported: true },
  { label: 'MG Road', lat: 12.9750, lng: 77.6063, city: 'Bengaluru', supported: true },
  { label: 'Jayanagar', lat: 12.9250, lng: 77.5938, city: 'Bengaluru', supported: true },
];

export const COMING_SOON_CITIES = [
  { label: 'Mumbai', lat: 19.076, lng: 72.8777, city: 'Mumbai', supported: false, comingSoon: true },
  { label: 'Delhi NCR', lat: 28.6139, lng: 77.209, city: 'Delhi', supported: false, comingSoon: true },
  { label: 'Hyderabad', lat: 17.385, lng: 78.4867, city: 'Hyderabad', supported: false, comingSoon: true },
  { label: 'Chennai', lat: 13.0827, lng: 80.2707, city: 'Chennai', supported: false, comingSoon: true },
  { label: 'Pune', lat: 18.5204, lng: 73.8567, city: 'Pune', supported: false, comingSoon: true },
];

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isSupportedLocation(loc) {
  if (!loc?.lat || !loc?.lng) return false;
  if (loc.comingSoon || loc.supported === false) return false;
  return haversineKm(loc.lat, loc.lng, BENGALURU_CENTER.lat, BENGALURU_CENTER.lng) <= SERVICE_RADIUS_KM;
}

export function normalizeLocation(loc) {
  if (!loc) return { ...BENGALURU_CENTER, supported: true };
  const supported = isSupportedLocation(loc);
  return {
    ...loc,
    city: loc.city || (supported ? 'Bengaluru' : loc.label),
    supported,
    comingSoon: !supported,
  };
}
