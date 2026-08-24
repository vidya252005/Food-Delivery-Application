import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  BENGALURU_CENTER,
  normalizeLocation,
  isSupportedLocation,
} from '../config/cities';
import { resolveLocationLabel, nearestBengaluruArea, enrichLocation, buildLocationLabelSync } from '../utils/geocode';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem('userLocation');
    if (saved) {
      try {
        return normalizeLocation(enrichLocation(JSON.parse(saved)));
      } catch { /* fall through */ }
    }
    return normalizeLocation(BENGALURU_CENTER);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const saveLocation = useCallback((loc) => {
    const normalized = normalizeLocation(enrichLocation(loc));
    setLocation(normalized);
    localStorage.setItem('userLocation', JSON.stringify(normalized));
    if (!normalized.supported) {
      setError(`FoodClub is coming to ${normalized.label || normalized.city || 'your city'} soon!`);
    } else {
      setError('');
    }
  }, []);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const area = nearestBengaluruArea(lat, lng);
        const immediateLabel = buildLocationLabelSync(lat, lng);

        saveLocation({
          lat,
          lng,
          label: immediateLabel,
          area: area?.label,
          city: 'Bengaluru',
          accuracyM: accuracy,
        });

        const label = await resolveLocationLabel(lat, lng);
        saveLocation({
          lat,
          lng,
          label,
          area: area?.label,
          city: 'Bengaluru',
          accuracyM: accuracy,
        });
        setLoading(false);
      },
      () => {
        saveLocation(BENGALURU_CENTER);
        setError('Could not detect location — showing Bengaluru');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [saveLocation]);

  useEffect(() => {
    if (!localStorage.getItem('userLocation')) {
      saveLocation(BENGALURU_CENTER);
    }
  }, [saveLocation]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('userLocation');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const needsLabel = parsed?.lat && (!parsed.label || parsed.label === 'Your location');
      if (needsLabel) {
        saveLocation(enrichLocation(parsed));
      }
    } catch {
      /* ignore corrupt saved location */
    }
  }, [saveLocation]);

  const isSupported = useMemo(() => isSupportedLocation(location), [location]);

  return (
    <LocationContext.Provider value={{
      location,
      loading,
      error,
      saveLocation,
      detectLocation,
      isSupported,
      isComingSoon: !isSupported,
    }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
};

export default LocationContext;
