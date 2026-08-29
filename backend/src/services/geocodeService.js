const { URL } = require('node:url');
const { BENGALURU_CENTER } = require('./geoService');
const { BENGALURU_AREAS } = require('./reverseGeocodeService');

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'en',
  'User-Agent': 'FoodClub/1.0 (food-delivery-app; contact@foodclub.local)',
};

function areaFallbackCoords(address = {}) {
  const haystack = [address.street, address.city, address.state, address.zipCode]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const area of BENGALURU_AREAS) {
    if (haystack.includes(area.label.toLowerCase())) {
      return { lat: area.lat, lng: area.lng, source: 'area_match' };
    }
  }

  if (haystack.includes('bengaluru') || haystack.includes('bangalore')) {
    return { lat: BENGALURU_CENTER.lat, lng: BENGALURU_CENTER.lng, source: 'city_default' };
  }

  return null;
}

/** Forward-geocode a restaurant address to lat/lng (Nominatim with Bengaluru fallbacks). */
async function geocodeAddress(address = {}) {
  const query = [address.street, address.city, address.state, address.zipCode, 'India']
    .filter(Boolean)
    .join(', ')
    .trim();

  if (query) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'in');

      const res = await fetch(url.toString(), { headers: NOMINATIM_HEADERS });
      if (res.ok) {
        const results = await res.json();
        if (results?.[0]?.lat != null && results[0].lon != null) {
          return {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
            source: 'nominatim',
          };
        }
      }
    } catch {
      /* fall through */
    }
  }

  return areaFallbackCoords(address);
}

module.exports = { geocodeAddress, areaFallbackCoords };
