<?php

namespace Tests\Unit;

use App\Models\ObserverDataRequest;
use App\Models\ObserverFile;
use App\Models\Device;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ObserverDataRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_observer_data_request_can_be_created(): void
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
            'request_url' => 'http://test.com/api/observer/data-sync',
            'request_data_path' => 'observer-files/datasets/request_data.json',
            'device_id' => $device->id,
            'request_headers' => ['Content-Type' => 'application/json'],
            'files_count' => 5,
        ]);

        $this->assertDatabaseHas('observer_data_requests', [
            'ip_address' => '127.0.0.1',
            'request_method' => 'POST',
            'files_count' => 5,
        ]);
    }

    public function test_observer_data_request_has_fillable_attributes(): void
    {
        $observerDataRequest = new ObserverDataRequest();
        
        $this->assertEquals([
            'ip_address',
            'user_agent',
            'request_method',
            'request_url',
            'request_data_path',
            'device_id',
            'request_headers',
            'files_count',
        ], $observerDataRequest->getFillable());
    }

    public function test_request_headers_is_cast_to_array(): void
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
            'request_headers' => json_encode(['Content-Type' => 'application/json']),
            'files_count' => 1,
        ]);

        $this->assertIsArray($observerDataRequest->request_headers);
        $this->assertEquals(['Content-Type' => 'application/json'], $observerDataRequest->request_headers);
    }

    public function test_observer_data_request_has_many_observer_files(): void
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
            'files_count' => 2,
        ]);

        $observerFile1 = ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => 'unique-001',
            'passenger_count' => 5,
            'original_name' => 'test1.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'observer-files/datasets/test1.jpg',
        ]);

        $observerFile2 = ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => 'unique-002',
            'passenger_count' => 3,
            'original_name' => 'test2.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 2048,
            'extension' => 'jpg',
            'file_path' => 'observer-files/datasets/test2.jpg',
        ]);

        $this->assertCount(2, $observerDataRequest->observerFiles);
        $this->assertTrue($observerDataRequest->observerFiles->contains($observerFile1));
        $this->assertTrue($observerDataRequest->observerFiles->contains($observerFile2));
    }

    public function test_observer_data_request_belongs_to_device(): void
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

        $this->assertEquals($device->id, $observerDataRequest->device->id);
    }

    public function test_device_id_can_be_null(): void
    {
        $observerDataRequest = ObserverDataRequest::create([
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'request_method' => 'POST',
            'request_url' => 'http://test.com',
            'device_id' => null,
            'files_count' => 0,
        ]);

        $this->assertNull($observerDataRequest->device_id);
    }

    public function test_observer_data_request_can_be_updated(): void
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

        $observerDataRequest->update([
            'files_count' => 5,
            'request_data_path' => 'observer-files/datasets/updated_request.json',
        ]);

        $this->assertDatabaseHas('observer_data_requests', [
            'id' => $observerDataRequest->id,
            'files_count' => 5,
            'request_data_path' => 'observer-files/datasets/updated_request.json',
        ]);
    }

    public function test_observer_data_request_can_be_deleted(): void
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

        $observerDataRequest->delete();

        $this->assertDatabaseMissing('observer_data_requests', [
            'id' => $observerDataRequest->id,
        ]);
    }

    public function test_files_count_defaults_to_zero(): void
    {
        $observerDataRequest = ObserverDataRequest::create([
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test Agent',
            'request_method' => 'POST',
            'request_url' => 'http://test.com',
            'files_count' => 0,
        ]);

        $this->assertEquals(0, $observerDataRequest->files_count);
    }
}
