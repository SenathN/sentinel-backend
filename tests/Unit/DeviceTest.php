<?php

namespace Tests\Unit;

use App\Models\Device;
use App\Models\ObserverFile;
use App\Models\ObserverDataRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceTest extends TestCase
{
    use RefreshDatabase;

    public function test_device_can_be_created(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-001',
            'name' => 'Test Device',
            'description' => 'A test device',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('devices', [
            'device_id' => 'test-device-001',
            'name' => 'Test Device',
        ]);
        
        $this->assertTrue($device->is_active);
    }

    public function test_device_has_fillable_attributes(): void
    {
        $device = new Device();
        
        $this->assertEquals([
            'device_id',
            'name',
            'description',
            'is_active',
        ], $device->getFillable());
    }

    public function test_is_active_is_cast_to_boolean(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-002',
            'name' => 'Test Device 2',
            'is_active' => 1,
        ]);

        $this->assertIsBool($device->is_active);
        $this->assertTrue($device->is_active);
    }

    public function test_device_has_many_observer_files(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-003',
            'name' => 'Test Device 3',
            'is_active' => true,
        ]);

        $observerFile = ObserverFile::create([
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

        $this->assertCount(1, $device->observerFiles);
        $this->assertEquals($observerFile->id, $device->observerFiles->first()->id);
    }

    public function test_device_has_many_observer_data_requests(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-004',
            'name' => 'Test Device 4',
            'is_active' => true,
        ]);

        $observerDataRequest = ObserverDataRequest::create([
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'request_method' => 'POST',
            'request_url' => 'http://test.com',
            'device_id' => $device->id,
            'files_count' => 1,
        ]);

        $this->assertCount(1, $device->observerDataRequests);
        $this->assertEquals($observerDataRequest->id, $device->observerDataRequests->first()->id);
    }

    public function test_last_activity_at_attribute_returns_null_when_no_files(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-005',
            'name' => 'Test Device 5',
            'is_active' => true,
        ]);

        $this->assertNull($device->last_activity_at);
    }

    public function test_last_activity_at_attribute_returns_latest_file_created_at(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-006',
            'name' => 'Test Device 6',
            'is_active' => true,
        ]);

        $oldFile = ObserverFile::create([
            'observer_data_request_id' => 1,
            'device_id' => $device->id,
            'unique_id' => 'unique-002',
            'passenger_count' => 3,
            'original_name' => 'old.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/old.jpg',
            'created_at' => now()->subHours(2),
        ]);

        $newFile = ObserverFile::create([
            'observer_data_request_id' => 2,
            'device_id' => $device->id,
            'unique_id' => 'unique-003',
            'passenger_count' => 4,
            'original_name' => 'new.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 2048,
            'extension' => 'jpg',
            'file_path' => 'test/new.jpg',
            'created_at' => now()->subHour(),
        ]);

        $this->assertEquals($newFile->created_at, $device->last_activity_at);
    }

    public function test_find_by_device_id_or_create_creates_new_device(): void
    {
        $device = Device::findByDeviceIdOrCreate('new-device-001');

        $this->assertDatabaseHas('devices', [
            'device_id' => 'new-device-001',
            'name' => 'new-device-001',
            'is_active' => true,
        ]);
    }

    public function test_find_by_device_id_or_create_returns_existing_device(): void
    {
        $existingDevice = Device::create([
            'device_id' => 'existing-device-001',
            'name' => 'Existing Device',
            'is_active' => true,
        ]);

        $foundDevice = Device::findByDeviceIdOrCreate('existing-device-001');

        $this->assertEquals($existingDevice->id, $foundDevice->id);
        $this->assertEquals($existingDevice->name, $foundDevice->name);
    }

    public function test_device_can_be_updated(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-007',
            'name' => 'Original Name',
            'is_active' => true,
        ]);

        $device->update([
            'name' => 'Updated Name',
            'description' => 'Updated description',
        ]);

        $this->assertDatabaseHas('devices', [
            'id' => $device->id,
            'name' => 'Updated Name',
            'description' => 'Updated description',
        ]);
    }

    public function test_device_can_be_deleted(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-008',
            'name' => 'Test Device 8',
            'is_active' => true,
        ]);

        $device->delete();

        $this->assertDatabaseMissing('devices', [
            'id' => $device->id,
        ]);
    }
}
