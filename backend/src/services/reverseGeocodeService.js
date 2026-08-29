const { URL } = require('node:url');
const { haversineKm } = require('./geoService');

const BENGALURU_AREAS = [
  { label: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { label: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { label: 'HSR Layout', lat: 12.9121, lng: 77.6446 },
  { label: 'Whitefield', lat: 12.9698, lng: 77.75 },
  { label: 'MG Road', lat: 12.975, lng: 77.6063 },
  { label: 'Jayanagar', lat: 12.925, lng: 77.5938 },
];

function nearestBengaluruArea(lat, lng) {
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

function buildAreaLabel(lat, lng) {
  const area = nearestBengaluruArea(lat, lng);
  return area ? `${area.label}, Bengaluru` : 'Bengaluru';
}

async function reverseGeocode(lat, lng) {
  const areaFallback = buildAreaLabel(lat, lng);
  const area = nearestBengaluruArea(lat, lng);

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');
    url.searchParams.set('zoom', '16');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'FoodClub/1.0 (food-delivery-app; contact@foodclub.local)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};
      const neighbourhood = a.suburb
        || a.neighbourhood
        || a.residential
        || a.quarter
        || a.city_district
        || a.town
        || a.village;
      const city = a.city || a.state_district || 'Bengaluru';
      const road = a.road || a.pedestrian || a.footway;

      if (neighbourhood && road) {
        return {
          label: `${road}, ${neighbourhood}`,
          shortLabel: `${neighbourhood}, ${city}`,
          area: area?.label || neighbourhood,
          city,
          source: 'nominatim',
        };
      }
      if (neighbourhood) {
        return {
          label: `${neighbourhood}, ${city}`,
          shortLabel: `${neighbourhood}, ${city}`,
          area: area?.label || neighbourhood,
          city,
          source: 'nominatim',
        };
      }
      if (data.display_name) {
        const short = data.display_name.split(',').slice(0, 2).join(',').trim();
        if (short) {
          return {
            label: short,
            shortLabel: short,
            area: area?.label,
            city: 'Bengaluru',
            source: 'nominatim',
          };
        }
      }
    }
  } catch {
    /* fall through to area label */
  }

  return {
    label: areaFallback,
    shortLabel: areaFallback,
    area: area?.label,
    city: 'Bengaluru',
    source: 'area',
  };
}

module.exports = {
  reverseGeocode,
  nearestBengaluruArea,
  buildAreaLabel,
  BENGALURU_AREAS,
};
