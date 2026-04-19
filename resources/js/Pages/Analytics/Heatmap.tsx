import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Map as MapIcon, 
    Users, 
    Calendar,
    Filter,
    Download,
    RefreshCw,
    MapPin,
    Search
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface HeatmapData {
    lat: number;
    lng: number;
    intensity: number;
    passenger_count: number;
    point_count: number;
}

interface Device {
    device_id: string;
    device_name: string;
}

interface HeatmapProps {
    heatmapData: HeatmapData[];
    devices: Device[];
    stats: {
        total_points: number;
        total_passengers: number;
        date_range: {
            start: string;
            end: string;
        };
    };
    filters: {
        start_date: string;
        end_date: string;
        device_id: number | null;
        type: string;
    };
}

export default function Heatmap({ heatmapData, devices, stats, filters }: HeatmapProps) {
    const [map, setMap] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Default to passenger density
    const [searchFilters, setSearchFilters] = useState({
        start_date: filters.start_date,
        end_date: filters.end_date,
        device_id: filters.device_id || '',
        type: 'passengers', // Default to passenger density
    });

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num);
    };

    const createHeatmapVisualization = (heatmapData: HeatmapData[]) => {
        if (!map) return;

        try {
            // Clean up any existing visualization layers first
            map.eachLayer((layer: any) => {
                if (layer instanceof window.L.Marker || layer instanceof window.L.Circle) {
                    map.removeLayer(layer);
                }
            });

            // Check if we have real data to work with
            const hasRealData = heatmapData && heatmapData.length > 0;
            
            if (!hasRealData) {
                const noDataBanner = document.createElement('div');
                noDataBanner.className = 'absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300';
                noDataBanner.innerHTML = `
                    <div class="text-center p-8">
                        <div class="text-6xl text-gray-400 mb-4">📊</div>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">No Data Found</h3>
                        <p class="text-gray-500 mb-4">Try adjusting your search filters to find passenger data</p>
                        <div class="text-sm text-gray-400">
                            <p>• Try a different date range</p>
                            <p>• Select a different device</p>
                            <p>• Check if data exists for the selected period</p>
                        </div>
                    </div>
                `;
                
                const mapContainer = document.getElementById('heatmap-map');
                if (mapContainer) {
                    mapContainer.appendChild(noDataBanner);
                }
                return;
            }

            console.log('Creating 2km grid-circle heatmap with', heatmapData.length, 'data points');

            const circleRadius = 2000; // 2km
            const gridSpacing = 4000; // 4km between centers so 2km circles don't overlap

            // Find bounding box of all data points
            const minLat = Math.min(...heatmapData.map(p => p.lat));
            const maxLat = Math.max(...heatmapData.map(p => p.lat));
            const minLng = Math.min(...heatmapData.map(p => p.lng));
            const maxLng = Math.max(...heatmapData.map(p => p.lng));

            // Reference latitude for longitude-to-meters conversion
            const refLat = (minLat + maxLat) / 2;
            const metersPerDegLat = 111320;
            const metersPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);

            // Convert grid spacing to degrees
            const gridDeltaLat = gridSpacing / metersPerDegLat;
            const gridDeltaLng = gridSpacing / metersPerDegLng;

            // Radius in degrees for point collection
            const radiusDeltaLat = circleRadius / metersPerDegLat;
            const radiusDeltaLng = circleRadius / metersPerDegLng;

            // Build a spatial index for fast lookups: bin points into grid cells
            const spatialIndex = new Map<string, HeatmapData[]>();
            heatmapData.forEach(point => {
                const cellLat = Math.floor((point.lat - minLat) / gridDeltaLat);
                const cellLng = Math.floor((point.lng - minLng) / gridDeltaLng);
                const key = `${cellLat},${cellLng}`;
                if (!spatialIndex.has(key)) spatialIndex.set(key, []);
                spatialIndex.get(key)!.push(point);
            });

            // Generate grid centers and collect points within 2km of each center
            const gridCells: {
                lat: number;
                lng: number;
                points: HeatmapData[];
                avgIntensity: number;
                avgPassengers: number;
                totalPassengers: number;
                count: number;
            }[] = [];

            // Extend grid slightly beyond data bounds with padding
            const padding = 1;
            const startLatIdx = -padding;
            const endLatIdx = Math.ceil((maxLat - minLat) / gridDeltaLat) + padding;
            const startLngIdx = -padding;
            const endLngIdx = Math.ceil((maxLng - minLng) / gridDeltaLng) + padding;

            for (let i = startLatIdx; i <= endLatIdx; i++) {
                for (let j = startLngIdx; j <= endLngIdx; j++) {
                    const centerLat = minLat + (i + 0.5) * gridDeltaLat;
                    const centerLng = minLng + (j + 0.5) * gridDeltaLng;

                    // Check this cell + neighboring cells (3x3) for points within radius
                    const nearbyPoints: HeatmapData[] = [];
                    for (let di = -1; di <= 1; di++) {
                        for (let dj = -1; dj <= 1; dj++) {
                            const key = `${i + di},${j + dj}`;
                            const cellPoints = spatialIndex.get(key);
                            if (!cellPoints) continue;
                            cellPoints.forEach(point => {
                                const dist = window.L.latLng(centerLat, centerLng)
                                    .distanceTo(window.L.latLng(point.lat, point.lng));
                                if (dist <= circleRadius) {
                                    nearbyPoints.push(point);
                                }
                            });
                        }
                    }

                    if (nearbyPoints.length === 0) continue;

                    const totalIntensity = nearbyPoints.reduce((sum, p) => sum + p.intensity, 0);
                    const totalPassengers = nearbyPoints.reduce((sum, p) => sum + p.passenger_count, 0);

                    gridCells.push({
                        lat: centerLat,
                        lng: centerLng,
                        points: nearbyPoints,
                        avgIntensity: totalIntensity / nearbyPoints.length,
                        avgPassengers: totalPassengers / nearbyPoints.length,
                        totalPassengers,
                        count: nearbyPoints.length,
                    });
                }
            }

            console.log(`Grid: ${gridCells.length} cells with data from ${heatmapData.length} total points`);

            // Find min/max average passenger counts for normalization
            const avgPassengerCounts = gridCells.map(c => c.avgPassengers);
            const minPassengers = Math.min(...avgPassengerCounts);
            const maxPassengers = Math.max(...avgPassengerCounts);
            const passengerRange = maxPassengers - minPassengers || 1; // avoid division by 0

            // Draw circles for each grid cell
            gridCells.forEach((cell) => {
                // Normalize avg passengers to [0, 1] using min-max
                const normalizedPassengers = (cell.avgPassengers - minPassengers) / passengerRange;
                // Opacity proportional to min-max, ranging from 0.3 to 0.9
                const opacity = 0.3 + normalizedPassengers * 0.6;

                // Color gradient: dark blue (low) -> deep orange (mid) -> dark crimson (high)
                let fillColor: string;
                if (normalizedPassengers < 0.33) {
                    const t = normalizedPassengers * 3;
                    const r = Math.round(30 + 100 * t);
                    const g = Math.round(60 + 40 * t);
                    const b = Math.round(180 - 80 * t);
                    fillColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                } else if (normalizedPassengers < 0.66) {
                    const t = (normalizedPassengers - 0.33) * 3;
                    const r = Math.round(130 + 125 * t);
                    const g = Math.round(100 - 60 * t);
                    const b = Math.round(100 - 80 * t);
                    fillColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                } else {
                    const t = (normalizedPassengers - 0.66) * 3;
                    const r = Math.round(200 + 40 * t);
                    const g = Math.round(40 - 30 * t);
                    const b = Math.round(20 - 10 * t);
                    fillColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                }

                const circle = window.L.circle([cell.lat, cell.lng], {
                    color: 'rgba(0, 0, 0, 0.2)',
                    weight: 1,
                    fillColor: fillColor,
                    fillOpacity: opacity,
                    radius: circleRadius,
                }).addTo(map);

                circle.bindPopup(`
                    <div class="text-sm">
                        <strong>Zone Summary (2km radius):</strong><br>
                        <strong>Points in zone:</strong> ${cell.count}<br>
                        <strong>Total Passengers:</strong> ${cell.totalPassengers}<br>
                        <strong>Avg Passengers:</strong> ${cell.avgPassengers.toFixed(2)}<br>
                        <strong>Normalized:</strong> ${(normalizedPassengers * 100).toFixed(1)}%
                    </div>
                `);
            });

            // Fit the map to show all data points
            const bounds = window.L.latLngBounds(heatmapData.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
            console.log('Map bounds fitted to data');

        } catch (error) {
            console.error('Error creating visualization:', error);
        }
    };

    useEffect(() => {
        // Load map scripts
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            setTimeout(() => {
                const leafletMap = window.L.map('heatmap-map').setView([6.9271, 79.8612], 10);
                window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(leafletMap);
                
                setMap(leafletMap);
                console.log('Map initialized');
            }, 200);
        };
        document.head.appendChild(script);

        return () => {
            if (map) map.remove();
        };
    }, []);

    useEffect(() => {
        if (map) {
            const heatmapdataArr : HeatmapData[] = Object.values(heatmapData);
            createHeatmapVisualization(heatmapdataArr);
        }
    }, [map, heatmapData]);

    const handleSearch = () => {
        setIsSearching(true);
        
        // Keep device_id as string since it's a string in database
        const filtersToSend = {
            ...searchFilters,
            device_id: searchFilters.device_id || null
        };
        
        console.log('Sending filters:', filtersToSend);
        
        router.get(
            route('analytics.heatmap'),
            filtersToSend,
            {
                onSuccess: () => setIsSearching(false),
                onError: () => setIsSearching(false),
            }
        );
    };

    const handleExport = () => {
        const dataToExport = heatmapData && heatmapData.length > 0 ? heatmapData : [];
        const csv = [
            ['Latitude', 'Longitude', 'Intensity', 'Passengers', 'Points'],
            ...dataToExport.map(p => [p.lat, p.lng, p.intensity, p.passenger_count, p.point_count])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passenger_density_${searchFilters.start_date}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Users className="h-6 w-6 text-gray-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-800">
                            Passenger Density Analysis
                        </h2>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Button onClick={handleExport} variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>
            }
        >
            <Head title="Passenger Density Analysis" />
            
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Passengers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(stats.total_passengers)}</div>
                                <p className="text-xs text-gray-500">Total passengers transported</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(stats.total_points)}</div>
                                <p className="text-xs text-gray-500">GPS data points analyzed</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Period</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold">
                                    {new Date(stats.date_range.start).toLocaleDateString()}
                                </div>
                                <p className="text-xs text-gray-500">
                                    to {new Date(stats.date_range.end).toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search Filters */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Search className="h-5 w-5 mr-2" />
                                Search Filters
                            </CardTitle>
                            <CardDescription>
                                Filter passenger density by date range and device
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <Label>Start Date</Label>
                                    <Input
                                        type="date"
                                        value={searchFilters.start_date}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, start_date: e.target.value }))}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={searchFilters.end_date}
                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, end_date: e.target.value }))}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label>Device</Label>
                                    <select
                                        value={searchFilters.device_id}
                                        onChange={(e) => setSearchFilters(prev => ({ 
                                            ...prev, 
                                            device_id: e.target.value 
                                        }))}
                                        className="w-full mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
                                    >
                                        <option value="">All Devices</option>
                                        {devices.map((device) => (
                                            <option key={device.device_id} value={device.device_id}>
                                                {device.device_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <Button 
                                        onClick={handleSearch} 
                                        disabled={isSearching}
                                        className="w-full"
                                    >
                                        <Search className="h-4 w-4 mr-2" />
                                        {isSearching ? 'Searching...' : 'Search'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Passenger Density Map */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Users className="h-5 w-5 mr-2" />
                                Passenger Density Heatmap
                            </CardTitle>
                            <CardDescription>
                                {heatmapData && heatmapData.length > 0 
                                    ? 'Passenger concentration across different zones'
                                    : 'Showing sample data - adjust filters to see real passenger data'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div 
                                id="heatmap-map" 
                                className="w-full h-96 rounded-lg border border-gray-200"
                            />
                            
                            {/* Legend */}
                            <div className="mt-4 flex justify-center space-x-6 text-sm">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full mr-2" style={{backgroundColor: 'rgba(30, 60, 180, 0.5)'}}></div>
                                    <span>Low Density</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full mr-2" style={{backgroundColor: 'rgba(200, 80, 40, 0.7)'}}></div>
                                    <span>Medium Density</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full mr-2" style={{backgroundColor: 'rgba(180, 15, 10, 0.9)'}}></div>
                                    <span>High Density</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded-full border border-gray-400 mr-2" style={{backgroundColor: 'transparent'}}></div>
                                    <span>2km radius zones</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
);
}
