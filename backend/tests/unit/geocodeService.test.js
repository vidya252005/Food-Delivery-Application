const { areaFallbackCoords } = require('../../src/services/geocodeService');

describe('geocodeService.areaFallbackCoords', () => {
  test('matches Bengaluru neighbourhood keywords', () => {
    const coords = areaFallbackCoords({
      street: '80 Feet Road',
      city: 'Koramangala, Bengaluru',
    });
    expect(coords).toEqual({ lat: 12.9352, lng: 77.6245, source: 'area_match' });
  });

  test('falls back to city center for generic Bengaluru addresses', () => {
    const coords = areaFallbackCoords({ street: 'Some Road', city: 'Bengaluru' });
    expect(coords).toEqual({ lat: 12.9716, lng: 77.5946, source: 'city_default' });
  });

  test('returns null when no Bengaluru signal is present', () => {
    expect(areaFallbackCoords({ street: 'Main St', city: 'Mumbai' })).toBeNull();
  });
});
