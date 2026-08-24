import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const restaurantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p) => p && p.length === 2 && !Number.isNaN(p[0]));
    if (valid.length >= 2) {
      map.fitBounds(valid, { padding: [40, 40] });
    } else if (valid.length === 1) {
      map.setView(valid[0], 14);
    }
  }, [map, points]);
  return null;
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
}) {
  const mapCenter = center || userLocation || { lat: 12.9716, lng: 77.5946 };
  const points = [];
  if (userLocation) points.push([userLocation.lat, userLocation.lng]);
  if (restaurantLocation) points.push([restaurantLocation.lat, restaurantLocation.lng]);
  if (driverLocation) points.push([driverLocation.lat, driverLocation.lng]);
  if (deliveryLocation) points.push([deliveryLocation.lat, deliveryLocation.lng]);

  const routePoints = showRoute && restaurantLocation && (deliveryLocation || userLocation)
    ? [
        [restaurantLocation.lat, restaurantLocation.lng],
        driverLocation
          ? [driverLocation.lat, driverLocation.lng]
          : [(deliveryLocation || userLocation).lat, (deliveryLocation || userLocation).lng],
        [(deliveryLocation || userLocation).lat, (deliveryLocation || userLocation).lng],
      ]
    : [];

  return (
    <div className="map-view" style={{ height }}>
      <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
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

        {restaurants.map((r) => r.location && (
          <Marker key={r.id || r._id} position={[r.location.lat, r.location.lng]} icon={restaurantIcon}>
            <Popup><strong>{r.name}</strong><br />{r.etaLabel || r.deliveryTime}</Popup>
          </Marker>
        ))}

        {routePoints.length >= 2 && (
          <Polyline positions={routePoints} color="#0F9F4F" weight={4} opacity={0.7} dashArray="8 8" />
        )}
      </MapContainer>
    </div>
  );
}
