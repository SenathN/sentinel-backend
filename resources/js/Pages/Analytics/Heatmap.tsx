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
    weight: number;
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
                // Show a friendly "no data" message instead of fake data
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
                
                // Insert the banner into the map container
                const mapContainer = document.getElementById('heatmap-map');
                if (mapContainer) {
                    mapContainer.appendChild(noDataBanner);
                }
                return;
            }

            // We have real data! Let's create the heatmap visualization
            console.log('Creating heatmap with', heatmapData.length, 'data points');

            if (window.L.heat) {
                // Use the professional heatmap plugin for smooth gradients
                const heatData = heatmapData.map(point => [
                    point.lat,
                    point.lng,
                    point.intensity
                ]);

                const heat = window.L.heat(heatData, {
                    radius: 25,
                    blur: 15,
                    maxZoom: 17,
                    gradient: {
                        0.0: 'rgba(255, 0, 0, 0.1)',    // Light red with low opacity
                        0.5: 'rgba(255, 0, 0, 0.5)',    // Medium red with medium opacity
                        1.0: 'rgba(255, 0, 0, 1.0)'     // Full red with high opacity
                    }
                }).addTo(map);

                console.log('✅ Heatmap created successfully with', heatData.length, 'points');
            } else {
                // Fallback to colored circles if plugin doesn't load
                console.log('Using circle fallback visualization');
                
                heatmapData.forEach((point, index) => {
                    // Use red color with opacity based on weight/intensity
                    const intensity = point.intensity;
                    const opacity = 0 + (intensity * 0.7); // Opacity from 0.1 to 1.0
                    
                    // Create red circle with variable opacity
                    const circle = window.L.circle([point.lat, point.lng], {
                        color: 'transparent',
                        fillColor: 'rgba(255, 0, 0, ' + opacity + ')', // Red with opacity based on weight
                        fillOpacity: 1.0, // Full opacity for the fill color itself
                        radius: 2000
                    }).addTo(map);
                    
                    // Add informative popup with passenger details
                    circle.bindPopup(`
                        <div class="text-sm">
                            <strong>Passengers:</strong> ${point.passenger_count}<br>
                            <strong>Intensity:</strong> ${point.intensity.toFixed(2)}<br>
                            <strong>Weight:</strong> ${point.weight.toFixed(2)}<br>
                            <strong>Points:</strong> ${point.point_count}
                        </div>
                    `);
                });
            }

            // Fit the map to show all data points nicely
            const bounds = window.L.latLngBounds(heatmapData.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
            console.log('🗺️ Map bounds fitted to data');

        } catch (error) {
            console.error('❌ Error creating visualization:', error);
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
            const heatScript = document.createElement('script');
            heatScript.src = 'https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js';
            heatScript.onload = () => {
                setTimeout(() => {
                    const leafletMap = window.L.map('heatmap-map').setView([6.9271, 79.8612], 10);
                    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(leafletMap);
                    
                    setMap(leafletMap);
                    console.log('Map initialized');
                }, 200);
            };
            document.head.appendChild(heatScript);
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
                                    <div className="w-4 h-4 rounded mr-2" style={{backgroundColor: 'rgba(255, 0, 0, 0.1)'}}></div>
                                    <span>Low Density (10% opacity)</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded mr-2" style={{backgroundColor: 'rgba(255, 0, 0, 0.3)'}}></div>
                                    <span>Medium-Low (30% opacity)</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded mr-2" style={{backgroundColor: 'rgba(255, 0, 0, 0.6)'}}></div>
                                    <span>Medium-High (60% opacity)</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 rounded mr-2" style={{backgroundColor: 'rgba(255, 0, 0, 1.0)'}}></div>
                                    <span>High Density (100% opacity)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
