import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  popupAnchor: [0, -40],
});

const restaurantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  popupAnchor: [0, -40],
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  popupAnchor: [0, -40],
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter(
      (p) => p && p.length === 2 && !Number.isNaN(p[0]) && !Number.isNaN(p[1])
    );
    if (valid.length >= 2) {
      map.fitBounds(valid, { padding: [48, 48], maxZoom: 15 });
    } else if (valid.length === 1) {
      map.setView(valid[0], 14);
    }
  }, [map, points]);
  return null;
}

function normalizeRestaurantCoords(r) {
  const lat = r.location?.lat ?? r.latitude;
  const lng = r.location?.lng ?? r.longitude;
  if (lat == null || lng == null) return null;
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (Number.isNaN(nLat) || Number.isNaN(nLng)) return null;
  return { lat: nLat, lng: nLng };
}

export default function MapView({
  center,
  userLocation,
  restaurantLocation,
  driverLocation,
  deliveryLocation,
  restaurants = [],
  height = '400px',
  showRoute = false,
  showDeliveryRadius = false,
}) {
  const mapCenter = center || userLocation || { lat: 12.9716, lng: 77.5946 };

  const mappedRestaurants = useMemo(
    () => restaurants
      .map((r) => ({ r, coords: normalizeRestaurantCoords(r) }))
      .filter((x) => x.coords),
    [restaurants]
  );

  const points = useMemo(() => {
    const pts = [];
    if (userLocation?.lat != null && userLocation?.lng != null) {
      pts.push([userLocation.lat, userLocation.lng]);
    }
    if (restaurantLocation?.lat != null) {
      pts.push([restaurantLocation.lat, restaurantLocation.lng]);
    }
    if (driverLocation?.lat != null) {
      pts.push([driverLocation.lat, driverLocation.lng]);
    }
    if (deliveryLocation?.lat != null) {
      pts.push([deliveryLocation.lat, deliveryLocation.lng]);
    }
    for (const { coords } of mappedRestaurants) {
      pts.push([coords.lat, coords.lng]);
    }
    return pts;
  }, [userLocation, restaurantLocation, driverLocation, deliveryLocation, mappedRestaurants]);

  const routePoints = showRoute && restaurantLocation && (deliveryLocation || userLocation)
    ? [
        [restaurantLocation.lat, restaurantLocation.lng],
        driverLocation
          ? [driverLocation.lat, driverLocation.lng]
          : [(deliveryLocation || userLocation).lat, (deliveryLocation || userLocation).lng],
        [(deliveryLocation || userLocation).lat, (deliveryLocation || userLocation).lng],
      ]
    : [];

  const userLabel = userLocation?.label
    || (userLocation?.area ? `${userLocation.area}, Bengaluru` : null)
    || (userLocation?.lat != null ? 'Near you' : 'Bengaluru');

  return (
    <div className="map-view" style={{ height }}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={13}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />

        {showDeliveryRadius && userLocation?.lat != null && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={3500}
            pathOptions={{
              color: '#176B45',
              fillColor: '#176B45',
              fillOpacity: 0.08,
              weight: 1.5,
              opacity: 0.35,
            }}
          />
        )}

        {userLocation?.lat != null && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <strong>{userLabel}</strong>
              {userLocation.area && userLocation.label && userLocation.area !== userLocation.label.split(',')[0] && (
                <>
                  <br />
                  <span>{userLocation.area}</span>
                </>
              )}
              <br />
              <span className="map-popup-coords">
                {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
              </span>
              {userLocation.accuracyM != null && (
                <>
                  <br />
                  <span className="map-popup-coords">±{Math.round(userLocation.accuracyM)} m</span>
                </>
              )}
            </Popup>
          </Marker>
        )}

        {restaurantLocation && (
          <Marker position={[restaurantLocation.lat, restaurantLocation.lng]} icon={restaurantIcon}>
            <Popup>Restaurant</Popup>
          </Marker>
        )}

        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup>Delivery partner</Popup>
          </Marker>
        )}

        {deliveryLocation && (
          <Marker position={[deliveryLocation.lat, deliveryLocation.lng]}>
            <Popup>Delivery address</Popup>
          </Marker>
        )}

        {mappedRestaurants.map(({ r, coords }) => (
          <Marker
            key={r.id || r._id}
            position={[coords.lat, coords.lng]}
            icon={restaurantIcon}
          >
            <Popup>
              <strong>{r.name}</strong>
              {r.qualityScore != null && (
                <>
                  <br />
                  Quality {r.qualityScore}/100
                </>
              )}
              <br />
              {r.etaLabel || r.deliveryTime || 'Open now'}
            </Popup>
          </Marker>
        ))}

        {routePoints.length >= 2 && (
          <Polyline positions={routePoints} color="#176B45" weight={4} opacity={0.7} dashArray="8 8" />
        )}
      </MapContainer>
    </div>
  );
}
