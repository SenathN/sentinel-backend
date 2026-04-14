<?php

namespace App\Http\Controllers;

use App\Models\Device;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class DeviceController extends Controller
{
    /**
     * Display a listing of the devices.
     */
    public function index()
    {
        $devices = Device::withCount('observerFiles')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Observers/Devices', [
            'devices' => $devices,
        ]);
    }

    /**
     * Display the specified device.
     */
    public function show(Device $device)
    {
        $device->load(['observerDataRequests' => function ($query) {
            $query->with(['observerFiles' => function ($fileQuery) {
                $fileQuery->with('gpsData');
            }])
                ->latest()
                ->limit(10);
        }]);

        $stats = [
            'total_files' => $device->observerFiles()->count(),
            'files_this_month' => $device->observerFiles()
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
            'files_this_week' => $device->observerFiles()
                ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
            'files_today' => $device->observerFiles()
                ->whereDate('created_at', now()->today())
                ->count(),
            'last_activity' => $device->last_activity_at,
            'total_size' => $device->observerFiles()->sum('size') ?? 0,
        ];

        return Inertia::render('Observers/ShowDevice', [
            'device' => $device,
            'stats' => $stats,
        ]);
    }

    /**
     * Store a newly created device in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'device_id' => 'required|string|max:255|unique:devices,device_id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
        ]);

        $device = Device::create($validated);

        return redirect()->route('devices.index')
            ->with('success', 'Device created successfully.');
    }

    /**
     * Update the specified device in storage.
     */
    public function update(Request $request, Device $device)
    {
        $validated = $request->validate([
            'device_id' => [
                'required',
                'string',
                'max:255',
                Rule::unique('devices', 'device_id')->ignore($device->id),
            ],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
        ]);

        $device->update($validated);

        return redirect()->route('devices.index')
            ->with('success', 'Device updated successfully.');
    }

    /**
     * Remove the specified device from storage.
     */
    public function destroy(Device $device)
    {
        // Check if device has associated files
        if ($device->observerFiles()->count() > 0) {
            return redirect()->route('devices.index')
                ->with('error', 'Cannot delete device. It has associated files.');
        }

        $device->delete();

        return redirect()->route('devices.index')
            ->with('success', 'Device deleted successfully.');
    }
}
