<?php

namespace App\Http\Controllers;

use App\Models\GpsData;
use App\Models\Device;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        // Get recent GPS data from the last 24 hours
        $recentGpsData = GpsData::with(['device'])
            ->where('gps_timestamp', '>=', now()->startOfDay())
            ->orderBy('gps_timestamp', 'desc')
            ->get()
            ->map(function ($gps) {
                return [
                    'id' => $gps->id,
                    'latitude' => (float) $gps->latitude,
                    'longitude' => (float) $gps->longitude,
                    'gps_timestamp' => $gps->gps_timestamp->toISOString(),
                    'passenger_count' => $gps->passenger_count,
                    'device_id' => $gps->device_id,
                    'device_name' => $gps->device?->name ?? 'Unknown Device',
                ];
            });

        // Get active devices with their latest activity and dataset counts
        $activeDevices = GpsData::with(['device'])
            ->where('gps_timestamp', '>=', now()->subHours(24))
            ->selectRaw('
                device_id,
                MAX(gps_timestamp) as latest_timestamp,
                COUNT(*) as dataset_count,
                SUM(passenger_count) as total_passengers,
                MAX(latitude) as latest_latitude,
                MAX(longitude) as latest_longitude
            ')
            ->groupBy('device_id')
            ->orderBy('latest_timestamp', 'desc')
            ->get()
            ->map(function ($device) {
                $deviceModel = $device->device;
                return [
                    'device_id' => $device->device_id,
                    'device_name' => $deviceModel?->name ?? 'Unknown Device',
                    'latest_timestamp' => $device->latest_timestamp, //->toISOString(),
                    'dataset_count' => $device->dataset_count,
                    'total_passengers' => $device->total_passengers,
                    'latest_latitude' => (float) $device->latest_latitude,
                    'latest_longitude' => (float) $device->latest_longitude,
                ];
            });

        // Get statistics
        $stats = [
            'total_gps_points' => GpsData::count(),
            'total_passengers_today' => GpsData::whereDate('gps_timestamp', today())
                ->sum('passenger_count'),
            'active_devices_today' => GpsData::whereDate('gps_timestamp', today())
                ->distinct('device_id')
                ->count(),
            'latest_gps_time' => GpsData::max('gps_timestamp'),
        ];

        return Inertia::render('Dashboard', [
            'gpsData' => $recentGpsData,
            'activeDevices' => $activeDevices,
            'stats' => $stats,
        ]);
    }
}
