<?php

namespace Tests\Unit;

use App\Models\GpsData;
use App\Models\ObserverFile;
use App\Models\Device;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GpsDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_gps_data_can_be_created(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-001',
            'name' => 'Test Device',
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

        $gpsData = GpsData::create([
            'observer_file_id' => $observerFile->id,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'timezone' => 'America/New_York',
            'passenger_count' => 5,
        ]);

        $this->assertDatabaseHas('gps_data', [
            'observer_file_id' => $observerFile->id,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
        ]);
    }

    public function test_gps_data_has_fillable_attributes(): void
    {
        $gpsData = new GpsData();
        
        $this->assertEquals([
            'observer_file_id',
            'device_id',
            'latitude',
            'longitude',
            'gps_timestamp',
            'timezone',
            'passenger_count',
        ], $gpsData->getFillable());
    }

    public function test_latitude_is_cast_to_decimal(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-002',
            'name' => 'Test Device 2',
            'is_active' => true,
        ]);

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => 1,
            'device_id' => $device->id,
            'unique_id' => 'unique-002',
            'passenger_count' => 3,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/path.jpg',
        ]);

        $gpsData = GpsData::create([
            'observer_file_id' => $observerFile->id,
            'device_id' => $device->id,
            'latitude' => 40.71281234,
            'longitude' => -74.00601234,
            'gps_timestamp' => now(),
            'passenger_count' => 3,
        ]);

        $this->assertEquals('40.71281234', (string) $gpsData->latitude);
    }

    public function test_longitude_is_cast_to_decimal(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-003',
            'name' => 'Test Device 3',
            'is_active' => true,
        ]);

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => 1,
            'device_id' => $device->id,
            'unique_id' => 'unique-003',
            'passenger_count' => 4,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/path.jpg',
        ]);

        $gpsData = GpsData::create([
            'observer_file_id' => $observerFile->id,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.00601234,
            'gps_timestamp' => now(),
            'passenger_count' => 4,
        ]);

        $this->assertEquals('-74.00601234', (string) $gpsData->longitude);
    }

    public function test_gps_timestamp_is_cast_to_datetime(): void
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
            'passenger_count' => 2,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/path.jpg',
        ]);

        $gpsData = GpsData::create([
            'observer_file_id' => $observerFile->id,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => '2024-01-15 10:30:00',
            'passenger_count' => 2,
        ]);

        $this->assertInstanceOf(\Carbon\Carbon::class, $gpsData->gps_timestamp);
    }

    public function test_gps_data_belongs_to_observer_file(): void
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

        $gpsData = GpsData::create([
            'observer_file_id' => $observerFile->id,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 6,
        ]);

        $this->assertEquals($observerFile->id, $gpsData->observerFile->id);
    }

    public function test_gps_data_belongs_to_device(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-006',
            'name' => 'Test Device 6',
            'is_active' => true,
        ]);

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => 1,
            'device_id' => $device->id,
            'unique_id' => 'unique-006',
            'passenger_count' => 7,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/path.jpg',
        ]);

        $gpsData = GpsData::create([
            'observer_file_id' => $observerFile->id,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 7,
        ]);

        $this->assertEquals($device->id, $gpsData->device->id);
    }

    public function test_gps_data_can_be_updated(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-007',
            'name' => 'Test Device 7',
            'is_active' => true,
        ]);

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => 1,
            'device_id' => $device->id,
            'unique_id' => 'unique-007',
            'passenger_count' => 8,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/path.jpg',
        ]);

        $gpsData = GpsData::create([
            'observer_file_id' => $observerFile->id,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 8,
        ]);

        $gpsData->update([
            'latitude' => 41.8781,
            'longitude' => -87.6298,
            'passenger_count' => 10,
        ]);

        $this->assertDatabaseHas('gps_data', [
            'id' => $gpsData->id,
            'latitude' => 41.8781,
            'longitude' => -87.6298,
            'passenger_count' => 10,
        ]);
    }

    public function test_gps_data_can_be_deleted(): void
    {
        $device = Device::create([
            'device_id' => 'test-device-008',
            'name' => 'Test Device 8',
            'is_active' => true,
        ]);

        $observerFile = ObserverFile::create([
            'observer_data_request_id' => 1,
            'device_id' => $device->id,
            'unique_id' => 'unique-008',
            'passenger_count' => 9,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/path.jpg',
        ]);

        $gpsData = GpsData::create([
            'observer_file_id' => $observerFile->id,
            'device_id' => $device->id,
            'latitude' => 40.7128,
            'longitude' => -74.0060,
            'gps_timestamp' => now(),
            'passenger_count' => 9,
        ]);

        $gpsData->delete();

        $this->assertDatabaseMissing('gps_data', [
            'id' => $gpsData->id,
        ]);
    }
}
