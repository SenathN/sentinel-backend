<?php

namespace App\Http\Controllers;

use App\Models\GpsData;
use App\Models\Device;
use App\Models\ObserverFile;
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
                    'latest_timestamp' => $device->latest_timestamp,
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
            'total_passengers_week' => GpsData::where('gps_timestamp', '>=', now()->subDays(7))
                ->sum('passenger_count'),
            'avg_passengers_per_hour' => GpsData::whereDate('gps_timestamp', today())
                ->selectRaw('AVG(passenger_count) as avg')
                ->value('avg') ?? 0,
            'total_files_uploaded' => ObserverFile::count(),
            'data_coverage_percent' => $this->calculateDataCoverage(),
        ];

        // Hourly passenger flow for today (0-23 hours)
        // $hourlyPassengerFlow = GpsData::whereDate('gps_timestamp', today())
        //     ->selectRaw("CAST(strftime('%H', gps_timestamp) AS INTEGER) as hour, SUM(passenger_count) as passengers, COUNT(*) as gps_points")
        //     ->groupByRaw("strftime('%H', gps_timestamp)")
        //     ->orderBy('hour')
        //     ->get()
        //     ->keyBy('hour');
        $hourlyPassengerFlow = GpsData::whereDate('gps_timestamp', today())
            ->selectRaw("HOUR(gps_timestamp) as hour, SUM(passenger_count) as passengers, COUNT(*) as gps_points")
            ->groupByRaw("HOUR(gps_timestamp)")
            ->orderBy('hour')
            ->get()
            ->keyBy('hour');

        $hourlyFlow = [];
        for ($h = 0; $h < 24; $h++) {
            $data = $hourlyPassengerFlow->get($h);
            $hourlyFlow[] = [
                'hour' => str_pad($h, 2, '0', STR_PAD_LEFT) . ':00',
                'passengers' => $data ? (int) $data->passengers : 0,
                'gps_points' => $data ? (int) $data->gps_points : 0,
            ];
        }

        // Device contribution breakdown (passengers + data points per device)
        $deviceContribution = GpsData::with('device')
            ->selectRaw('device_id, SUM(passenger_count) as total_passengers, COUNT(*) as total_points')
            ->groupBy('device_id')
            ->orderByDesc('total_passengers')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'device_id' => $item->device_id,
                    'device_name' => $item->device?->name ?? 'Unknown Device',
                    'total_passengers' => (int) $item->total_passengers,
                    'total_points' => (int) $item->total_points,
                ];
            });

        // 7-day upload trend (daily GPS points + passengers)
        $uploadTrend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dayData = GpsData::whereDate('gps_timestamp', $date->toDateString())
                ->selectRaw('COUNT(*) as points, SUM(passenger_count) as passengers')
                ->first();
            $uploadTrend[] = [
                'date' => $date->format('M d'),
                'day' => $date->format('D'),
                'points' => $dayData ? (int) $dayData->points : 0,
                'passengers' => $dayData ? (int) $dayData->passengers : 0,
            ];
        }

        // Peak hours analysis (top hours by passenger count across all data)
        // $peakHours = GpsData::selectRaw("CAST(strftime('%H', gps_timestamp) AS INTEGER) as hour, AVG(passenger_count) as avg_passengers, SUM(passenger_count) as total_passengers, COUNT(*) as frequency")
        //     ->groupByRaw("strftime('%H', gps_timestamp)")
        //     ->orderByDesc('total_passengers')
        //     ->limit(12)
        //     ->get()
        //     ->map(function ($item) {
        //         return [
        //             'hour' => str_pad($item->hour, 2, '0', STR_PAD_LEFT) . ':00',
        //             'avg_passengers' => round((float) $item->avg_passengers, 1),
        //             'total_passengers' => (int) $item->total_passengers,
        //             'frequency' => (int) $item->frequency,
        //         ];
        //     })
        //     ->sortBy('hour')
        //     ->values();
        $peakHours = GpsData::selectRaw("
            HOUR(gps_timestamp) as hour,
            AVG(passenger_count) as avg_passengers,
            SUM(passenger_count) as total_passengers,
            COUNT(*) as frequency
        ")
        ->groupByRaw("HOUR(gps_timestamp)")
        ->orderByDesc('total_passengers')
        ->limit(12)
        ->get()
        ->map(function ($item) {
            return [
                'hour' => str_pad($item->hour, 2, '0', STR_PAD_LEFT) . ':00',
                'avg_passengers' => round((float) $item->avg_passengers, 1),
                'total_passengers' => (int) $item->total_passengers,
                'frequency' => (int) $item->frequency,
            ];
        })
        ->sortBy('hour')
        ->values();

        // Weekly comparison (this week vs last week by day)
        $weeklyComparison = [];
        for ($i = 6; $i >= 0; $i--) {
            $thisWeekDate = now()->subDays($i);
            $lastWeekDate = now()->subDays($i + 7);

            $thisWeekData = GpsData::whereDate('gps_timestamp', $thisWeekDate->toDateString())
                ->selectRaw('SUM(passenger_count) as passengers, COUNT(*) as points')
                ->first();
            $lastWeekData = GpsData::whereDate('gps_timestamp', $lastWeekDate->toDateString())
                ->selectRaw('SUM(passenger_count) as passengers, COUNT(*) as points')
                ->first();

            $weeklyComparison[] = [
                'day' => $thisWeekDate->format('D'),
                'date' => $thisWeekDate->format('M d'),
                'this_week_passengers' => $thisWeekData ? (int) $thisWeekData->passengers : 0,
                'last_week_passengers' => $lastWeekData ? (int) $lastWeekData->passengers : 0,
                'this_week_points' => $thisWeekData ? (int) $thisWeekData->points : 0,
                'last_week_points' => $lastWeekData ? (int) $lastWeekData->points : 0,
            ];
        }

        return Inertia::render('Dashboard', [
            'gpsData' => $recentGpsData,
            'activeDevices' => $activeDevices,
            'stats' => $stats,
            'hourlyFlow' => $hourlyFlow,
            'deviceContribution' => $deviceContribution,
            'uploadTrend' => $uploadTrend,
            'peakHours' => $peakHours,
            'weeklyComparison' => $weeklyComparison,
        ]);
    }

    private function calculateDataCoverage(): float
    {
        $totalDevices = Device::where('is_active', true)->count();
        if ($totalDevices === 0) return 0;

        $activeToday = GpsData::whereDate('gps_timestamp', today())
            ->distinct('device_id')
            ->count();

        return round(($activeToday / $totalDevices) * 100, 1);
    }
}
