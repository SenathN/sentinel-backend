<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Device extends Model
{
    protected $fillable = [
        'device_id',
        'name',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function observerFiles(): HasMany
    {
        return $this->hasMany(ObserverFile::class);
    }

    /**
     * Get or create device by device_id
     */
    public static function findByDeviceIdOrCreate(string $deviceId): self
    {
        return self::firstOrCreate(
            ['device_id' => $deviceId],
            [
                'name' => $deviceId,
                'is_active' => true,
            ]
        );
    }
}
