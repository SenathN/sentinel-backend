<?php

namespace Tests\Unit;

use App\Models\ObserverFile;
use App\Models\ObserverDataRequest;
use App\Models\Device;
use App\Models\GpsData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ObserverFileTest extends TestCase
{
    use RefreshDatabase;

    public function test_observer_file_can_be_created(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-001',
            'name' => 'Test Device',
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

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => 'unique-001',
            'passenger_count' => 5,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'observer-files/datasets/test.jpg',
        ]);

        $this->assertDatabaseHas('observer_files', [
            'unique_id' => 'unique-001',
            'original_name' => 'test.jpg',
            'passenger_count' => 5,
        ]);
    }

    public function test_observer_file_has_fillable_attributes(): void
    {
        $observerFile = new ObserverFile();
        
        $this->assertEquals([
            'observer_data_request_id',
            'device_id',
            'unique_id',
            'passenger_count',
            'original_name',
            'mime_type',
            'size',
            'extension',
            'file_path',
        ], $observerFile->getFillable());
    }

    public function test_observer_file_belongs_to_observer_data_request(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-002',
            'name' => 'Test Device 2',
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

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => 'unique-002',
            'passenger_count' => 3,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'observer-files/datasets/test.jpg',
        ]);

        $this->assertEquals($observerDataRequest->id, $observerFile->observerDataRequest->id);
    }

    public function test_observer_file_belongs_to_device(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-003',
            'name' => 'Test Device 3',
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

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => 'unique-003',
            'passenger_count' => 4,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'observer-files/datasets/test.jpg',
        ]);

        $this->assertEquals($device->id, $observerFile->device->id);
    }

    public function test_observer_file_has_one_gps_data(): void
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

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => 'unique-004',
            'passenger_count' => 5,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'observer-files/datasets/test.jpg',
        ]);

        $gpsData = GpsData::create([
            'observer_file_id' => $observerFile->id,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 5,
        ]);

        $this->assertEquals($gpsData->id, $observerFile->gpsData->id);
    }

    public function test_observer_file_can_be_updated(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-005',
            'name' => 'Test Device 5',
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

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => 'unique-005',
            'passenger_count' => 6,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'observer-files/datasets/test.jpg',
        ]);

        $observerFile->update([
            'passenger_count' => 10,
            'size' => 2048,
        ]);

        $this->assertDatabaseHas('observer_files', [
            'id' => $observerFile->id,
            'passenger_count' => 10,
            'size' => 2048,
        ]);
    }

    public function test_observer_file_can_be_deleted(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-006',
            'name' => 'Test Device 6',
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

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => 'unique-006',
            'passenger_count' => 7,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'observer-files/datasets/test.jpg',
        ]);

        $observerFile->delete();

        $this->assertDatabaseMissing('observer_files', [
            'id' => $observerFile->id,
        ]);
    }

    public function test_unique_id_can_be_null(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-007',
            'name' => 'Test Device 7',
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

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => null,
            'passenger_count' => 8,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'observer-files/datasets/test.jpg',
        ]);

        $this->assertNull($observerFile->unique_id);
    }
}
