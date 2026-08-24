const reverseGeocodeService = require('../services/reverseGeocodeService');
const AppError = require('../utils/AppError');

async function reverse(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new AppError('lat and lng query params are required', 400);
    }
    const result = await reverseGeocodeService.reverseGeocode(lat, lng);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { reverse };
