<?php

namespace App\Http\Controllers;

use App\Models\GpsData;
use App\Models\Device;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    public function heatmap(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'device_id' => 'nullable|string|exists:devices,device_id',
            'type' => 'nullable|in:density,passengers',
        ]);

        $startDate = $request->input('start_date', now()->subDays(7)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $deviceId = $request->input('device_id');
        $type = $request->input('type', 'density');

        \Log::info("Heatmap request: start=$startDate, end=$endDate, device=$deviceId, type=$type");

        $query = GpsData::with('device')
            ->whereBetween('gps_timestamp', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        if ($deviceId) {
            $query->whereHas('device', fn($q) => $q->where('device_id', $deviceId) );
            // $query->where('device_id', $deviceId);
        }

        $gpsData = $query->orderBy('gps_timestamp', 'desc')->get();
        // dd($gpsData->toArray());
        \Log::info("Found {$gpsData->count()} GPS data points");

        // Process data for heatmap
        $heatmapData = $this->processHeatmapData($gpsData, $type);
        
        \Log::info("Processed " . count($heatmapData) . " heatmap points");

        // Get available devices
        $devices = Device::orderBy('name')->get(['device_id', 'name as device_name']);

        // Calculate basic stats
        $stats = [
            'total_points' => $gpsData->count(),
            'total_passengers' => $gpsData->sum('passenger_count'),
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
        ];

        return Inertia::render('Analytics/Heatmap', [
            'heatmapData' => $heatmapData,
            'devices' => $devices,
            'stats' => $stats,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'device_id' => $deviceId,
                'type' => $type,
            ],
        ]);
    }

    private function processHeatmapData($gpsData, $type)
    {
        \Log::info("Processing heatmap data with type: $type");
        
        // Group data by geographical regions (simple grid)
        $gridSize = 0.01; // ~1km grid
        $heatmapGrid = [];

        foreach ($gpsData as $point) {
            $latGrid = floor($point->latitude / $gridSize) * $gridSize;
            $lngGrid = floor($point->longitude / $gridSize) * $gridSize;
            $gridKey = $latGrid . '_' . $lngGrid;
            
            if (!isset($heatmapGrid[$gridKey])) {
                $heatmapGrid[$gridKey] = [
                    'lat' => $latGrid + ($gridSize / 2),
                    'lng' => $lngGrid + ($gridSize / 2),
                    'weight' => 0,
                    'passenger_count' => 0,
                    'point_count' => 0,
                ];
            }
            
            $heatmapGrid[$gridKey]['weight'] += $type === 'passengers' ? $point->passenger_count : 1;
            $heatmapGrid[$gridKey]['passenger_count'] += $point->passenger_count;
            $heatmapGrid[$gridKey]['point_count'] += 1;
        }

        \Log::info("Created " . count($heatmapGrid) . " grid cells");

        // Normalize weights
        $maxWeight = count($heatmapGrid) > 0 ? max(array_column($heatmapGrid, 'weight')) : 0;
        \Log::info("Max weight: $maxWeight");
        
        $result = array_map(function ($cell) use ($maxWeight) {
            return [
                'lat' => $cell['lat'],
                'lng' => $cell['lng'],
                'weight' => 200,
                'intensity' => $maxWeight > 0 ? $cell['weight'] / $maxWeight : 0,
                'passenger_count' => $cell['passenger_count'],
                'point_count' => $cell['point_count'],
            ];
        }, $heatmapGrid);

        \Log::info("Sample heatmap data:", array_slice($result, 0, 3));
        
        return $result;
    }

    public function test()
    {
        // Simple test to check data
        $gpsCount = GpsData::count();
        $deviceCount = Device::count();
        
        // Get some sample data
        $sampleGps = GpsData::take(5)->get(['latitude', 'longitude', 'passenger_count']);
        
        return response()->json([
            'gps_count' => $gpsCount,
            'device_count' => $deviceCount,
            'sample_gps' => $sampleGps,
            'message' => $gpsCount > 0 ? 'Data available' : 'No GPS data found'
        ]);
    }
}
