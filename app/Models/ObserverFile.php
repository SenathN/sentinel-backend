<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ObserverFile extends Model
{
    protected $fillable = [
        'observer_data_request_id',
        'device_id',
        'unique_id',
        'passenger_count',
        'original_name',
        'mime_type',
        'size',
        'extension',
        'file_path',
    ];

    public function observerDataRequest(): BelongsTo
    {
        return $this->belongsTo(ObserverDataRequest::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class, 'device_id');
    }

    public function gpsData(): HasMany
    {
        return $this->hasMany(GpsData::class);
    }
}
