<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GpsData extends Model
{
    protected $fillable = [
        'observer_file_id',
        'device_id',
        'latitude',
        'longitude',
        'gps_timestamp',
        'timezone',
        'passenger_count',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'gps_timestamp' => 'datetime',
    ];

    public function observerFile(): BelongsTo
    {
        return $this->belongsTo(ObserverFile::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
