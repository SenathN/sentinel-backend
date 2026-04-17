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
  selectedTime?: number;
  isReset?: boolean;
}

export default function RouteMap({ gpsData, height = '400px', selectedDeviceId, selectedTime = 100, isReset = true }: RouteMapProps) {

  // Get marker state for each point based on filters
  const getMarkerState = (point: GpsPoint): 'show' | 'faded' | 'hide' => {
    // State 1: Hide - completely removed
    if (selectedDeviceId && point.device_id !== selectedDeviceId) {
      return 'hide';
    }
    
    // If reset or no time filtering, show all
    if (isReset || !gpsData || gpsData.length === 0) {
      return 'show';
    }
    
    // State 2/3: Show vs Faded based on time window
    const timestamps = gpsData.map(d => new Date(d.gps_timestamp).getTime());
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    const selectedTimestamp = min + (selectedTime / 100) * (max - min);
    
    // Calculate time window (5% of total time range)
    const timeWindow = (max - min) * 0.05; // 5% window
    
    const pointTime = new Date(point.gps_timestamp).getTime();
    const isInTimeWindow = Math.abs(pointTime - selectedTimestamp) <= timeWindow;
    
    return isInTimeWindow ? 'show' : 'faded';
  };
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
  const createDotIcon = (passengerCount: number) => {
    const color = getPassengerColor(passengerCount);
    const size = 8;
    const borderWidth = 1;
    const borderColor = 'white';
    const boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    const zIndex = 500;
    
    return new DivIcon({
      className: 'custom-dot-marker',
      html: `<div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${borderWidth}px solid ${borderColor};
        box-shadow: ${boxShadow};
        z-index: ${zIndex};
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
            color="#3b82f6"
            weight={3}
            opacity={0.8}
          />
        )}

        {/* Add small dot markers for each GPS point */}
        {validGpsData.map((point, index) => {
          const markerState = getMarkerState(point);
          
          // State 3: Hide - completely removed
          if (markerState === 'hide') {
            return null;
          }
          
          // State 2: Faded - dim colored dot, no circle
          const isFaded = markerState === 'faded';
          const opacity = isFaded ? 0.3 : 1;
          const zIndex = isFaded ? 400 : 600;
          
          return (
            <Marker
              key={point.id || index}
              position={[point.latitude, point.longitude]}
              icon={createDotIcon(point.passenger_count)}
              opacity={opacity}
              zIndex={zIndex}
            >
              <Popup>
                <div className="text-sm space-y-2">
                  <div className="font-semibold flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: getPassengerColor(point.passenger_count) }}
                    ></div>
                    Point {index + 1}
                    {isFaded && <span className="ml-2 text-gray-400 text-xs">(Faded)</span>}
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

        {/* Add subtle circle markers for better visibility (only for 'show' state) */}
        {validGpsData.map((point, index) => {
          const markerState = getMarkerState(point);
          
          // State 1: Show - colored dot with subtle big circle
          // State 2: Faded - no circle
          // State 3: Hide - no circle (already handled above)
          
          if (markerState !== 'show') {
            return null;
          }
          
          return (
            <CircleMarker
              key={`circle-${point.id || index}`}
              center={[point.latitude, point.longitude]}
              radius={10}
              fillColor={getPassengerColor(point.passenger_count)}
              color="white"
              weight={2}
              opacity={0.8}
              fillOpacity={0.3}
              zIndex={500}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
