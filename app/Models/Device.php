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

    protected $appends = ['last_activity_at'];

    public function observerFiles(): HasMany
    {
        return $this->hasMany(ObserverFile::class);
    }

    public function observerDataRequests(): HasMany
    {
        return $this->hasMany(ObserverDataRequest::class);
    }

    /**
     * Get the last activity timestamp for this device
     */
    public function getLastActivityAtAttribute()
    {
        $lastFile = $this->observerFiles()->latest('created_at')->first();
        return $lastFile ? $lastFile->created_at : null;
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
