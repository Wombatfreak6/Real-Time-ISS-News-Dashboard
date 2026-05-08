import { useEffect, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// ── Fix Leaflet's broken default icon paths when bundled with Vite ─────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ── Map lifecycle helpers ───────────────────────────────────────────────────
function MapResizer() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }, [map]);

  return null;
}

function AutoFollow({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 3, { duration: 1.5 });
    }
  }, [center, map]);

  return null;
}

// ── Main map component ─────────────────────────────────────────────────────
function IssMap({ data, trajectory }) {
  if (!data) {
    return (
      <div
        className="flex items-center justify-center rounded-xl animate-pulse text-sm"
        style={{
          minHeight: '500px',
          width: '100%',
          backgroundColor: 'var(--secondary)',
          color: 'var(--muted-foreground)',
        }}
      >
        Acquiring ISS position…
      </div>
    );
  }

  const center = [data.latitude, data.longitude];

  // Only draw the polyline when we have at least 2 points
  const polylinePositions =
    trajectory.length >= 2 ? trajectory.map((p) => [p.lat, p.lng]) : [];

  return (
    <div className="h-[520px] w-full rounded-2xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={3}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <MapResizer />
        
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: '#3b82f6', weight: 2, opacity: 0.7, dashArray: '6 4' }}
          />
        )}

        <Marker position={center}>
          <Popup>ISS Current Position</Popup>
        </Marker>

        <AutoFollow center={center} />
      </MapContainer>
    </div>
  );
}

// Memoize: only re-render when lat/lng actually change
export default memo(IssMap, (prev, next) => {
  if (!prev.data && !next.data) return true;
  if (!prev.data || !next.data) return false;
  return (
    prev.data.latitude === next.data.latitude &&
    prev.data.longitude === next.data.longitude &&
    prev.trajectory.length === next.trajectory.length
  );
});
