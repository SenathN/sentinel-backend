import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';

export default function TestHeatmap() {
    const [map, setMap] = useState<any>(null);

    const createMapWithHeatmap = () => {
        try {
            // Create simple map
            const leafletMap = window.L.map('test-map').setView([6.9271, 79.8612], 10);
            
            // Add tiles
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(leafletMap);

            // Create sample heatmap data
            const heatData = [
                [6.9271, 79.8612, 0.8], // High intensity
                [6.9281, 79.8622, 0.6], // Medium intensity
                [6.9261, 79.8602, 0.4], // Low intensity
                [6.9291, 79.8632, 0.9], // Very high intensity
                [6.9251, 79.8592, 0.3], // Low intensity
                [6.8, 79.9, 0.7], // Medium-high intensity
                [6.81, 79.91, 0.5], // Medium intensity
                [6.79, 79.89, 0.6], // Medium intensity
                [6.9, 79.85, 0.4], // Low-medium intensity
                [6.91, 79.84, 0.8], // High intensity
            ];

            console.log('Creating heatmap with', heatData.length, 'points');

            // Create heatmap layer
            const heat = window.L.heat(heatData, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: {
                    0.0: 'blue',
                    0.25: 'cyan',
                    0.5: 'lime',
                    0.75: 'yellow',
                    1.0: 'red'
                }
            }).addTo(leafletMap);

            console.log('Heatmap layer created successfully');

            // Add test markers for reference
            const marker = window.L.marker([6.9271, 79.8612])
                .addTo(leafletMap)
                .bindPopup('High Density Area')
                .openPopup();

            const marker2 = window.L.marker([6.8, 79.9])
                .addTo(leafletMap)
                .bindPopup('Medium Density Area');

            setMap(leafletMap);
            console.log('Map with heatmap created successfully');
        } catch (error) {
            console.error('Error creating map with heatmap:', error);
        }
    };

    const createMapWithCircles = () => {
        try {
            console.log('Creating fallback map with colored circles...');
            
            // Create simple map
            const leafletMap = window.L.map('test-map').setView([6.9271, 79.8612], 10);
            
            // Add tiles
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(leafletMap);

            // Create sample data with colored circles as fallback
            const circleData = [
                {lat: 6.9271, lng: 79.8612, intensity: 0.8, color: '#ff0000'}, // Red
                {lat: 6.9281, lng: 79.8622, intensity: 0.6, color: '#ffff00'}, // Yellow
                {lat: 6.9261, lng: 79.8602, intensity: 0.4, color: '#00ff00'}, // Green
                {lat: 6.9291, lng: 79.8632, intensity: 0.9, color: '#ff0000'}, // Red
                {lat: 6.9251, lng: 79.8592, intensity: 0.3, color: '#00ffff'}, // Cyan
                {lat: 6.8, lng: 79.9, intensity: 0.7, color: '#ff8800'}, // Orange
                {lat: 6.81, lng: 79.91, intensity: 0.5, color: '#ffff00'}, // Yellow
                {lat: 6.79, lng: 79.89, intensity: 0.6, color: '#ffff00'}, // Yellow
                {lat: 6.9, lng: 79.85, intensity: 0.4, color: '#00ff00'}, // Green
                {lat: 6.91, lng: 79.84, intensity: 0.8, color: '#ff0000'}, // Red
            ];

            // Add colored circles
            circleData.forEach((point, index) => {
                const radius = 500 + (point.intensity * 1000); // Radius based on intensity
                const circle = window.L.circle([point.lat, point.lng], {
                    color: point.color,
                    fillColor: point.color,
                    fillOpacity: 0.3 * point.intensity,
                    radius: radius
                }).addTo(leafletMap);
                
                circle.bindPopup(`Point ${index + 1}: Intensity ${point.intensity}`);
            });

            // Add test markers for reference
            const marker = window.L.marker([6.9271, 79.8612])
                .addTo(leafletMap)
                .bindPopup('High Density Area')
                .openPopup();

            const marker2 = window.L.marker([6.8, 79.9])
                .addTo(leafletMap)
                .bindPopup('Medium Density Area');

            setMap(leafletMap);
            console.log('Fallback map with colored circles created successfully');
        } catch (error) {
            console.error('Error creating fallback map:', error);
        }
    };

    useEffect(() => {
        console.log('Test heatmap loading...');
        
        // Load CSS first
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);

        // Load Leaflet
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            console.log('Leaflet loaded');
            
            // Load Leaflet.heat plugin with correct CDN
            const heatScript = document.createElement('script');
            heatScript.src = 'https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js';
            heatScript.onload = () => {
                console.log('Leaflet.heat loaded');
                console.log('window.L available:', !!window.L);
                console.log('window.L.heat available:', !!window.L?.heat);
                
                // Wait a moment for the plugin to attach
                setTimeout(() => {
                    if (window.L && window.L.heat) {
                        console.log('L.heat is available, creating map...');
                        createMapWithHeatmap();
                    } else {
                        console.log('Trying manual attachment...');
                        // Try manual attachment if CDN doesn't work
                        try {
                            // Create a simple heatmap visualization manually
                            createMapWithCircles();
                        } catch (error) {
                            console.error('Manual heatmap failed:', error);
                        }
                    }
                }, 200);
            };
            heatScript.onerror = () => console.error('Failed to load Leaflet.heat');
            document.head.appendChild(heatScript);
        };
        script.onerror = () => console.error('Failed to load Leaflet');
        document.head.appendChild(script);

        return () => {
            if (map) map.remove();
        };
    }, []);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Test Map
                    </h2>
                </div>
            }
        >
            <Head title="Test Map" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Heatmap Test</CardTitle>
                            <CardDescription>
                                Testing Leaflet map with colored density circles
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div 
                                id="test-map" 
                                className="w-full h-96 rounded-lg border border-gray-200"
                            />
                            <div className="mt-4 text-sm text-gray-600">
                                <p>· Check browser console for logs</p>
                                <p>· Should see OpenStreetMap tiles</p>
                                <p>· Should see colored density circles (blue to red gradient)</p>
                                <p>· Should see 2 test markers for reference</p>
                                <p>· Map should be centered on Sri Lanka</p>
                                <p>· Blue = low density, Red = high density</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
