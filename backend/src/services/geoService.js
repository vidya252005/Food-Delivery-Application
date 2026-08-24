const EARTH_RADIUS_KM = 6371;
const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };
const BASE_PREP_MINUTES = 12;
const AVG_SPEED_KMH = 22; // Bengaluru traffic-adjusted

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateEtaMinutes(distanceKm) {
  if (distanceKm == null) return 35;
  const travel = (distanceKm / AVG_SPEED_KMH) * 60;
  return Math.max(15, Math.round(BASE_PREP_MINUTES + travel));
}

function formatEta(minutes) {
  if (minutes <= 20) return `${minutes} min`;
  const low = Math.max(15, minutes - 5);
  const high = minutes + 10;
  return `${low}-${high} min`;
}

function interpolateRoute(fromLat, fromLng, toLat, toLng, progress) {
  const t = Math.min(1, Math.max(0, progress));
  return {
    lat: fromLat + (toLat - fromLat) * t,
    lng: fromLng + (toLng - fromLng) * t,
  };
}

module.exports = {
  BENGALURU_CENTER,
  haversineKm,
  calculateEtaMinutes,
  formatEta,
  interpolateRoute,
};
