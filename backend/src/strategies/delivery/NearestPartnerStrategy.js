const geoService = require('../../services/geoService');

/**
 * Strategy Pattern — delivery partner assignment (LLD section 24).
 * Picks the nearest available partner to the restaurant pickup point.
 */
class NearestPartnerStrategy {
  assign(order, partners) {
    if (!partners.length) return null;

    const pickup = order.restaurantLocation || order.pickupLocation;
    if (!pickup?.lat) return partners[0];

    let best = partners[0];
    let bestDist = Infinity;

    for (const p of partners) {
      if (p.latitude == null) continue;
      const d = geoService.haversineKm(pickup.lat, pickup.lng, p.latitude, p.longitude);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }
}

module.exports = { NearestPartnerStrategy };
