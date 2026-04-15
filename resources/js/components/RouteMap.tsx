import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import { icon, DivIcon, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GpsPoint {
  id: number;
  latitude: number;
  longitude: number;
  gps_timestamp: string;
  passenger_count: number;
  device_id?: number;
}

interface RouteMapProps {
  gpsData: GpsPoint[];
  height?: string;
  selectedDeviceId?: number | null;
}

export default function RouteMap({ gpsData, height = '400px', selectedDeviceId }: RouteMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !gpsData || gpsData.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🗺️</div>
          <p>No GPS data available</p>
        </div>
      </div>
    );
  }

  // Filter out invalid coordinates and sort by timestamp
  const validGpsData = gpsData
    .filter(point => point.latitude && point.longitude && 
      point.latitude >= -90 && point.latitude <= 90 && 
      point.longitude >= -180 && point.longitude <= 180)
    .sort((a, b) => new Date(a.gps_timestamp).getTime() - new Date(b.gps_timestamp).getTime());

  if (validGpsData.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🗺️</div>
          <p>No valid GPS coordinates found</p>
        </div>
      </div>
    );
  }

  // Calculate center point for map
  const centerLat = validGpsData.reduce((sum, point) => sum + point.latitude, 0) / validGpsData.length;
  const centerLng = validGpsData.reduce((sum, point) => sum + point.longitude, 0) / validGpsData.length;

  // Create polyline coordinates
  const routeCoordinates = validGpsData.map(point => [point.latitude, point.longitude]);

  // Get passenger count color
  const getPassengerColor = (count: number) => {
    if (count === 0) return '#10b981'; // green
    if (count <= 5) return '#3b82f6'; // blue
    if (count <= 15) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  // Create custom dot icon for markers
  const createDotIcon = (passengerCount: number, isSelected: boolean = false) => {
    const color = getPassengerColor(passengerCount);
    const size = isSelected ? 12 : 8;
    const borderWidth = isSelected ? 3 : 1;
    return new DivIcon({
      className: 'custom-dot-marker',
      html: `<div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${borderWidth}px solid ${isSelected ? '#1e40af' : 'white'};
        box-shadow: ${isSelected ? '0 4px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.3)'};
        z-index: ${isSelected ? 1000 : 500};
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
    });
  };

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Draw route line */}
        {validGpsData.length > 1 && (
          <Polyline
            positions={routeCoordinates as LatLngExpression[]}
            color={selectedDeviceId ? "#94a3b8" : "#3b82f6"}
            weight={selectedDeviceId ? 2 : 3}
            opacity={selectedDeviceId ? 0.4 : 0.8}
          />
        )}

        {/* Draw highlighted route for selected device */}
        {selectedDeviceId && (() => {
          const selectedDeviceData = validGpsData.filter(point => point.device_id === selectedDeviceId);
          if (selectedDeviceData.length > 1) {
            const selectedRouteCoordinates = selectedDeviceData.map(point => [point.latitude, point.longitude]);
            return (
              <Polyline
                positions={selectedRouteCoordinates as LatLngExpression[]}
                color="#3b82f6"
                weight={4}
                opacity={1}
              />
            );
          }
          return null;
        })()}

        {/* Add small dot markers for each GPS point */}
        {validGpsData.map((point, index) => {
          const isSelected = selectedDeviceId && point.device_id === selectedDeviceId;
          const isDimmed = selectedDeviceId && !isSelected;
          
          return (
            <Marker
              key={point.id || index}
              position={[point.latitude, point.longitude]}
              icon={createDotIcon(point.passenger_count, isSelected)}
              opacity={isDimmed ? 0.3 : 1}
              zIndex={isSelected ? 1000 : 500}
            >
              <Popup>
                <div className="text-sm space-y-2">
                  <div className="font-semibold flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: getPassengerColor(point.passenger_count) }}
                    ></div>
                    Point {index + 1}
                    {isSelected && <span className="ml-2 text-blue-600 text-xs">(Selected)</span>}
                  </div>
                  <div>
                    <strong>Time:</strong><br />
                    {new Date(point.gps_timestamp).toLocaleString()}
                  </div>
                  <div>
                    <strong>Passengers:</strong>{' '}
                    <span 
                      className="font-bold"
                      style={{ color: getPassengerColor(point.passenger_count) }}
                    >
                      {point.passenger_count}
                    </span>
                  </div>
                  <div>
                    <strong>Coordinates:</strong><br />
                    <span className="font-mono text-xs">
                      {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                    </span>
                  </div>
                  {point.device_id && (
                    <div>
                      <strong>Device ID:</strong><br />
                      <span className="font-mono text-xs">{point.device_id}</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Add subtle circle markers for better visibility */}
        {validGpsData.map((point, index) => {
          const isSelected = selectedDeviceId && point.device_id === selectedDeviceId;
          const isDimmed = selectedDeviceId && !isSelected;
          
          return (
            <CircleMarker
              key={`circle-${point.id || index}`}
              center={[point.latitude, point.longitude]}
              radius={isSelected ? 15 : 10}
              fillColor={getPassengerColor(point.passenger_count)}
              color={isSelected ? '#1e40af' : 'white'}
              weight={isSelected ? 3 : 2}
              opacity={isDimmed ? 0.3 : 0.8}
              fillOpacity={isSelected ? 0.6 : 0.3}
              zIndex={isSelected ? 999 : 400}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
