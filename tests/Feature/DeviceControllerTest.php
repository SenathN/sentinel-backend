<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\ObserverFile;
use App\Models\ObserverDataRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_index_returns_devices_list(): void
    {
        $device1 = Device::create([
            'device_id' => 'device-001',
            'name' => 'Device 1',
            'is_active' => true,
        ]);

        $device2 = Device::create([
            'device_id' => 'device-002',
            'name' => 'Device 2',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/observers/devices');

        $response->assertStatus(200);
    }

    public function test_index_requires_authentication(): void
    {
        $response = $this->get('/observers/devices');

        $response->assertRedirect('/login');
    }

    public function test_show_displays_device_details(): void
    {
        $device = Device::create([
            'device_id' => 'device-003',
            'name' => 'Device 3',
            'description' => 'Test description',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->get("/observers/devices/{$device->id}");

        $response->assertStatus(200);
    }

    public function test_show_requires_authentication(): void
    {
        $device = Device::create([
            'device_id' => 'device-004',
            'name' => 'Device 4',
            'is_active' => true,
        ]);

        $response = $this->get("/observers/devices/{$device->id}");

        $response->assertRedirect('/login');
    }

    public function test_show_includes_device_statistics(): void
    {
        $device = Device::create([
            'device_id' => 'device-005',
            'name' => 'Device 5',
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

        ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => 'unique-001',
            'passenger_count' => 5,
            'original_name' => 'test.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'extension' => 'jpg',
            'file_path' => 'test/path.jpg',
        ]);

        ObserverFile::create([
            'observer_data_request_id' => $observerDataRequest->id,
            'device_id' => $device->id,
            'unique_id' => 'unique-002',
            'passenger_count' => 3,
            'original_name' => 'test2.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 2048,
            'extension' => 'jpg',
            'file_path' => 'test/path2.jpg',
        ]);

        $response = $this->actingAs($this->user)
            ->get("/observers/devices/{$device->id}");

        $response->assertStatus(200);
    }

    public function test_store_creates_new_device(): void
    {
        $response = $this->actingAs($this->user)
            ->post('/observers/devices', [
                'device_id' => 'device-006',
                'name' => 'New Device',
                'description' => 'A new device',
                'is_active' => true,
            ]);

        $response->assertRedirect('/observers/devices');

        $this->assertDatabaseHas('devices', [
            'device_id' => 'device-006',
            'name' => 'New Device',
        ]);
    }

    public function test_store_requires_authentication(): void
    {
        $response = $this->post('/observers/devices', [
            'device_id' => 'device-007',
            'name' => 'New Device',
        ]);

        $response->assertRedirect('/login');
    }

    public function test_store_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user)
            ->post('/observers/devices', [
                'name' => 'Device without device_id',
            ]);

        $response->assertSessionHasErrors(['device_id']);
    }

    public function test_store_validates_unique_device_id(): void
    {
        Device::create([
            'device_id' => 'device-008',
            'name' => 'Existing Device',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->post('/observers/devices', [
                'device_id' => 'device-008',
                'name' => 'Duplicate Device',
            ]);

        $response->assertSessionHasErrors(['device_id']);
    }

    public function test_update_modifies_existing_device(): void
    {
        $device = Device::create([
            'device_id' => 'device-009',
            'name' => 'Original Name',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->put("/observers/devices/{$device->id}", [
                'device_id' => 'device-009',
                'name' => 'Updated Name',
                'description' => 'Updated description',
                'is_active' => false,
            ]);

        $response->assertRedirect('/observers/devices');

        $this->assertDatabaseHas('devices', [
            'id' => $device->id,
            'name' => 'Updated Name',
            'description' => 'Updated description',
            'is_active' => false,
        ]);
    }

    public function test_update_requires_authentication(): void
    {
        $device = Device::create([
            'device_id' => 'device-010',
            'name' => 'Test Device',
            'is_active' => true,
        ]);

        $response = $this->put("/observers/devices/{$device->id}", [
            'name' => 'Updated Name',
        ]);

        $response->assertRedirect('/login');
    }

    public function test_update_validates_unique_device_id_excluding_current(): void
    {
        $device1 = Device::create([
            'device_id' => 'device-011',
            'name' => 'Device 1',
            'is_active' => true,
        ]);

        $device2 = Device::create([
            'device_id' => 'device-012',
            'name' => 'Device 2',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->put("/observers/devices/{$device2->id}", [
                'device_id' => 'device-011',
                'name' => 'Updated Device 2',
            ]);

        $response->assertSessionHasErrors(['device_id']);
    }

    public function test_destroy_deletes_device(): void
    {
        $device = Device::create([
            'device_id' => 'device-013',
            'name' => 'Device to Delete',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->delete("/observers/devices/{$device->id}");

        $response->assertRedirect('/observers/devices');

        $this->assertDatabaseMissing('devices', [
            'id' => $device->id,
        ]);
    }

    public function test_destroy_requires_authentication(): void
    {
        $device = Device::create([
            'device_id' => 'device-014',
            'name' => 'Test Device',
            'is_active' => true,
        ]);

        $response = $this->delete("/observers/devices/{$device->id}");

        $response->assertRedirect('/login');
    }

    public function test_destroy_prevents_deletion_when_device_has_files(): void
    {
        $device = Device::create([
            'device_id' => 'device-015',
            'name' => 'Device with Files',
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
            ->delete("/observers/devices/{$device->id}");

        $response->assertRedirect('/observers/devices');

        $this->assertDatabaseHas('devices', [
            'id' => $device->id,
        ]);
    }

    public function test_index_returns_devices_ordered_by_created_at_desc(): void
    {
        $device1 = Device::create([
            'device_id' => 'device-016',
            'name' => 'Device 1',
            'is_active' => true,
            'created_at' => now()->subDays(2),
        ]);

        $device2 = Device::create([
            'device_id' => 'device-017',
            'name' => 'Device 2',
            'is_active' => true,
            'created_at' => now()->subDay(),
        ]);

        $device3 = Device::create([
            'device_id' => 'device-018',
            'name' => 'Device 3',
            'is_active' => true,
            'created_at' => now(),
        ]);

        $response = $this->actingAs($this->user)
            ->get('/observers/devices');

        $response->assertStatus(200);
    }

    public function test_show_paginates_observer_data_requests(): void
    {
        $device = Device::create([
            'device_id' => 'device-019',
            'name' => 'Device 19',
            'is_active' => true,
        ]);

        for ($i = 0; $i < 30; $i++) {
            $observerDataRequest = ObserverDataRequest::create([
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Test Agent',
                'request_method' => 'POST',
                'request_url' => 'http://test.com',
                'device_id' => $device->id,
                'files_count' => 1,
            ]);
        }

        $response = $this->actingAs($this->user)
            ->get("/observers/devices/{$device->id}?per_page=25&page=1");

        $response->assertStatus(200);
    }

    public function test_show_validates_per_page_parameter(): void
    {
        $device = Device::create([
            'device_id' => 'device-020',
            'name' => 'Device 20',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->get("/observers/devices/{$device->id}?per_page=15");

        $response->assertStatus(200);
    }
}
