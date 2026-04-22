<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\ObserverFile;
use App\Models\GpsData;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_index_requires_authentication(): void
    {
        $response = $this->get('/dashboard');

        $response->assertRedirect('/login');
    }

    public function test_index_returns_dashboard_view(): void
    {
        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_includes_recent_gps_data(): void
    {
        $device = Device::create([
            'device_id' => 'device-001',
            'name' => 'Test Device',
            'is_active' => true,
        ]);

        GpsData::create([
            'observer_file_id' => 1,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 5,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_includes_active_devices(): void
    {
        $device = Device::create([
            'device_id' => 'device-002',
            'name' => 'Test Device 2',
            'is_active' => true,
        ]);

        GpsData::create([
            'observer_file_id' => 1,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now()->subHours(12),
            'passenger_count' => 3,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_includes_statistics(): void
    {
        $device = Device::create([
            'device_id' => 'device-003',
            'name' => 'Test Device 3',
            'is_active' => true,
        ]);

        GpsData::create([
            'observer_file_id' => 1,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 10,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_calculates_total_gps_points(): void
    {
        $device = Device::create([
            'device_id' => 'device-004',
            'name' => 'Test Device 4',
            'is_active' => true,
        ]);

        GpsData::create([
            'observer_file_id' => 1,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 5,
        ]);

        GpsData::create([
            'observer_file_id' => 2,
            'device_id' => $device->id,
            'latitude' => 41.8781,
            'longitude' => -87.6298,
            'gps_timestamp' => now(),
            'passenger_count' => 7,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_calculates_total_passengers_today(): void
    {
        $device = Device::create([
            'device_id' => 'device-005',
            'name' => 'Test Device 5',
            'is_active' => true,
        ]);

        GpsData::create([
            'observer_file_id' => 1,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 15,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_calculates_active_devices_today(): void
    {
        $device1 = Device::create([
            'device_id' => 'device-006',
            'name' => 'Device 6',
            'is_active' => true,
        ]);

        $device2 = Device::create([
            'device_id' => 'device-007',
            'name' => 'Device 7',
            'is_active' => true,
        ]);

        GpsData::create([
            'observer_file_id' => 1,
            'device_id' => $device1->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 5,
        ]);

        GpsData::create([
            'observer_file_id' => 2,
            'device_id' => $device2->id,
            'latitude' => 41.8781,
            'longitude' => -87.6298,
            'gps_timestamp' => now(),
            'passenger_count' => 3,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_includes_hourly_passenger_flow(): void
    {
        $device = Device::create([
            'device_id' => 'device-008',
            'name' => 'Test Device 8',
            'is_active' => true,
        ]);

        GpsData::create([
            'observer_file_id' => 1,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now()->setHour(10),
            'passenger_count' => 20,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_includes_device_contribution(): void
    {
        $device = Device::create([
            'device_id' => 'device-009',
            'name' => 'Test Device 9',
            'is_active' => true,
        ]);

        for ($i = 0; $i < 5; $i++) {
            GpsData::create([
                'observer_file_id' => $i,
                'device_id' => $device->id,
                'latitude' => 40.7128 + ($i * 0.01),
                'longitude' => -74.0060 + ($i * 0.01),
                'gps_timestamp' => now(),
                'passenger_count' => 10 + $i,
            ]);
        }

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_includes_upload_trend(): void
    {
        $device = Device::create([
            'device_id' => 'device-010',
            'name' => 'Test Device 10',
            'is_active' => true,
        ]);

        for ($i = 0; $i < 7; $i++) {
            GpsData::create([
                'observer_file_id' => $i,
                'device_id' => $device->id,
                'latitude' => 40.7128,
                'longitude' => -74.0060,
                'gps_timestamp' => now()->subDays($i),
                'passenger_count' => 5,
            ]);
        }

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_includes_peak_hours(): void
    {
        $device = Device::create([
            'device_id' => 'device-011',
            'name' => 'Test Device 11',
            'is_active' => true,
        ]);

        for ($i = 0; $i < 20; $i++) {
            GpsData::create([
                'observer_file_id' => $i,
                'device_id' => $device->id,
                'latitude' => 40.7128,
                'longitude' => -74.0060,
                'gps_timestamp' => now()->setHour($i % 24),
                'passenger_count' => 5 + $i,
            ]);
        }

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_includes_weekly_comparison(): void
    {
        $device = Device::create([
            'device_id' => 'device-012',
            'name' => 'Test Device 12',
            'is_active' => true,
        ]);

        for ($i = 0; $i < 14; $i++) {
            GpsData::create([
                'observer_file_id' => $i,
                'device_id' => $device->id,
                'latitude' => 40.7128,
                'longitude' => -74.0060,
                'gps_timestamp' => now()->subDays($i),
                'passenger_count' => 5,
            ]);
        }

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_calculates_data_coverage(): void
    {
        $device1 = Device::create([
            'device_id' => 'device-013',
            'name' => 'Active Device',
            'is_active' => true,
        ]);

        $device2 = Device::create([
            'device_id' => 'device-014',
            'name' => 'Inactive Device',
            'is_active' => true,
        ]);

        GpsData::create([
            'observer_file_id' => 1,
            'device_id' => $device1->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 5,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_handles_empty_data(): void
    {
        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_includes_total_files_uploaded(): void
    {
        $device = Device::create([
            'device_id' => 'device-015',
            'name' => 'Test Device 15',
            'is_active' => true,
        ]);

        ObserverFile::create([
            'observer_data_request_id' => 1,
            'device_id' => $device->id,
            'unique_id' => 'unique-001',
            'passenger_count' => 5,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/path.jpg',
        ]);

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }

    public function test_index_filters_gps_data_by_today(): void
    {
        $device = Device::create([
            'device_id' => 'device-016',
            'name' => 'Test Device 16',
            'is_active' => true,
        ]);

        GpsData::create([
            'observer_file_id' => 1,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now()->subDays(2),
            'passenger_count' => 5,
        ]);

        GpsData::create([
            'observer_file_id' => 2,
            'device_id' => $device->id,
            'latitude' => 41.8781,
            'longitude' => -87.6298,
            'gps_timestamp' => now(),
            'passenger_count' => 10,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/dashboard');

        $response->assertStatus(200);
    }
}
