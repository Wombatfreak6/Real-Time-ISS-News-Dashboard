import { useEffect, useRef, memo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix Leaflet's broken default icon paths when bundled with Vite ─────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom ISS icon using a reliable inline SVG data URL
const issIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
        <rect x="24" y="28" width="16" height="8" rx="2" fill="#60a5fa"/>
        <rect x="4" y="30" width="20" height="4" rx="1" fill="#93c5fd"/>
        <rect x="40" y="30" width="20" height="4" rx="1" fill="#93c5fd"/>
        <rect x="28" y="12" width="8" height="16" rx="1" fill="#bfdbfe"/>
        <rect x="28" y="36" width="8" height="16" rx="1" fill="#bfdbfe"/>
        <circle cx="32" cy="32" r="3" fill="#1d4ed8"/>
      </svg>
    `),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  tooltipAnchor: [0, -22],
});

// ── Inner component that has access to the map instance ────────────────────
function MapUpdater({ center }) {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!center || !center[0] || !center[1]) return;

    // On first mount call invalidateSize to fix blank-tile issue in flex containers
    if (!hasInitialized.current) {
      setTimeout(() => {
        map.invalidateSize();
        hasInitialized.current = true;
      }, 100);
    }

    // Smoothly pan to new ISS position
    map.setView(center, map.getZoom(), { animate: true, duration: 1 });
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
    <div
      style={{ minHeight: '500px', width: '100%', borderRadius: '0.75rem', overflow: 'hidden', display: 'flex' }}
    >
      <MapContainer
        center={center}
        zoom={3}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        // Do NOT set key here — it remounts the map on every data update
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        {polylinePositions.length >= 2 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: '#3b82f6', weight: 2, opacity: 0.7, dashArray: '6 4' }}
          />
        )}

        <Marker position={center} icon={issIcon}>
          <Tooltip permanent direction="top" offset={[0, -24]}>
            <span className="text-xs font-semibold">
              ISS · {data.velocity.toFixed(0)} km/h · {data.altitude.toFixed(0)} km alt
            </span>
          </Tooltip>
        </Marker>

        <MapUpdater center={center} />
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
