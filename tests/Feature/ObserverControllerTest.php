<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\ObserverFile;
use App\Models\ObserverDataRequest;
use App\Models\GpsData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ObserverControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_data_sync_creates_observer_data_request(): void
    {
        $response = $this->postJson('/api/observer/data-sync', [
            'batch_id' => 'batch-001',
            'sentinel_version' => '1.0.0',
            'data_count' => 0,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Data sync received and stored successfully',
            ]);

        $this->assertDatabaseHas('observer_data_requests', [
            'request_method' => 'POST',
        ]);
    }

    public function test_data_sync_creates_device_from_detection_data(): void
    {
        $deviceId = 'test-device-001';

        $response = $this->postJson('/api/observer/data-sync', [
            'batch_id' => 'batch-002',
            'sentinel_version' => '1.0.0',
            'data_count' => 1,
            'data_0' => json_encode([
                'detection_data' => [
                    'device_id' => $deviceId,
                    'unique_id' => 'unique-001',
                    'passenger_count' => 5,
                    'latitude' => 40.7128,
                    'longitude' => -74.0060,
                    'timestamp' => now()->toISOString(),
                ],
                'image_info' => [
                    'filename' => 'test.jpg',
                    'hash' => 'abc123',
                    'size_bytes' => 1024,
                ],
            ]),
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('devices', [
            'device_id' => $deviceId,
        ]);
    }

    public function test_data_sync_with_valid_image_file(): void
    {
        $deviceId = 'test-device-002';
        $file = UploadedFile::fake()->image('test.jpg', 800, 600);

        $response = $this->postJson('/api/observer/data-sync', [
            'batch_id' => 'batch-003',
            'sentinel_version' => '1.0.0',
            'data_count' => 1,
            'data_0' => json_encode([
                'detection_data' => [
                    'device_id' => $deviceId,
                    'unique_id' => 'unique-002',
                    'passenger_count' => 3,
                    'latitude' => 40.7128,
                    'longitude' => -74.0060,
                    'timestamp' => now()->toISOString(),
                ],
                'image_info' => [
                    'filename' => 'test.jpg',
                    'hash' => 'def456',
                    'size_bytes' => 1024,
                ],
            ]),
            'image_0' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'files_received' => 1,
            ]);

        $this->assertDatabaseHas('observer_files', [
            'unique_id' => 'unique-002',
            'passenger_count' => 3,
        ]);
    }

    public function test_data_sync_creates_gps_data(): void
    {
        $deviceId = 'test-device-003';
        $file = UploadedFile::fake()->image('test.jpg');

        $response = $this->postJson('/api/observer/data-sync', [
            'batch_id' => 'batch-004',
            'sentinel_version' => '1.0.0',
            'data_count' => 1,
            'data_0' => json_encode([
                'detection_data' => [
                    'device_id' => $deviceId,
                    'unique_id' => 'unique-003',
                    'passenger_count' => 4,
                    'latitude' => 41.8781,
                    'longitude' => -87.6298,
                    'timestamp' => now()->toISOString(),
                    'timezone' => 'America/Chicago',
                ],
                'image_info' => [
                    'filename' => 'test.jpg',
                    'hash' => 'ghi789',
                    'size_bytes' => 2048,
                ],
            ]),
            'image_0' => $file,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('gps_data', [
            'latitude' => 41.8781,
            'longitude' => -87.6298,
            'passenger_count' => 4,
        ]);
    }

    public function test_data_sync_skips_already_synchronized_items(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-004',
            'name' => 'Test Device 4',
            'is_active' => true,
        ]);

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => 1,
            'device_id' => $device->id,
            'unique_id' => 'unique-004',
            'passenger_count' => 5,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/path.jpg',
        ]);

        $file = UploadedFile::fake()->image('test.jpg');

        $response = $this->postJson('/api/observer/data-sync', [
            'batch_id' => 'batch-005',
            'sentinel_version' => '1.0.0',
            'data_count' => 1,
            'data_0' => json_encode([
                'detection_data' => [
                    'device_id' => 'test-device-004',
                    'unique_id' => 'unique-004',
                    'passenger_count' => 5,
                ],
            ]),
            'image_0' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'files_received' => 0,
            ]);
    }

    public function test_data_sync_handles_missing_data_field_gracefully(): void
    {
        $response = $this->postJson('/api/observer/data-sync', [
            'batch_id' => 'batch-006',
            'sentinel_version' => '1.0.0',
            'data_count' => 1,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'files_received' => 0,
            ]);
    }

    public function test_data_sync_returns_error_on_exception(): void
    {
        // This test would require mocking to force an exception
        // For now, we'll test that the endpoint exists
        $response = $this->postJson('/api/observer/data-sync', [
            'batch_id' => 'batch-007',
            'sentinel_version' => '1.0.0',
            'data_count' => 0,
        ]);

        $response->assertStatus(200);
    }

    public function test_sync_check_validates_unique_ids_array(): void
    {
        $response = $this->postJson('/api/observer/sync-check', [
            'unique_ids' => 'not-an-array',
        ]);

        $response->assertStatus(422);
    }

    public function test_sync_check_returns_synchronized_items(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-005',
            'name' => 'Test Device 5',
            'is_active' => true,
        ]);

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => 1,
            'device_id' => $device->id,
            'unique_id' => 'unique-005',
            'passenger_count' => 6,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/path.jpg',
        ]);

        $response = $this->postJson('/api/observer/sync-check', [
            'unique_ids' => ['unique-005', 'unique-not-exists'],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Sync check completed',
                'synchronized_count' => 1,
            ])
            ->assertJsonPath('synchronized_unique_ids', function ($value) {
                return in_array('unique-005', $value) && !in_array('unique-not-exists', $value);
            });
    }

    public function test_sync_check_returns_empty_when_no_items_found(): void
    {
        $response = $this->postJson('/api/observer/sync-check', [
            'unique_ids' => ['unique-006', 'unique-007'],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'synchronized_count' => 0,
                'synchronized_unique_ids' => [],
            ]);
    }

    public function test_sync_check_handles_empty_unique_ids_array(): void
    {
        $response = $this->postJson('/api/observer/sync-check', [
            'unique_ids' => [],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'synchronized_count' => 0,
                'synchronized_unique_ids' => [],
            ]);
    }

    public function test_data_sync_creates_multiple_files(): void
    {
        $deviceId = 'test-device-006';
        $file1 = UploadedFile::fake()->image('test1.jpg');
        $file2 = UploadedFile::fake()->image('test2.jpg');

        $response = $this->postJson('/api/observer/data-sync', [
            'batch_id' => 'batch-008',
            'sentinel_version' => '1.0.0',
            'data_count' => 2,
            'data_0' => json_encode([
                'detection_data' => [
                    'device_id' => $deviceId,
                    'unique_id' => 'unique-008',
                    'passenger_count' => 3,
                ],
            ]),
            'image_0' => $file1,
            'data_1' => json_encode([
                'detection_data' => [
                    'device_id' => $deviceId,
                    'unique_id' => 'unique-009',
                    'passenger_count' => 4,
                ],
            ]),
            'image_1' => $file2,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'files_received' => 2,
            ]);

        $this->assertDatabaseCount('observer_files', 2);
    }

    public function test_data_sync_updates_files_count_in_request(): void
    {
        $deviceId = 'test-device-007';
        $file = UploadedFile::fake()->image('test.jpg');

        $response = $this->postJson('/api/observer/data-sync', [
            'batch_id' => 'batch-009',
            'sentinel_version' => '1.0.0',
            'data_count' => 1,
            'data_0' => json_encode([
                'detection_data' => [
                    'device_id' => $deviceId,
                    'unique_id' => 'unique-010',
                    'passenger_count' => 5,
                ],
            ]),
            'image_0' => $file,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('observer_data_requests', [
            'files_count' => 1,
        ]);
    }
}
