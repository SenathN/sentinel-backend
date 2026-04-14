<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ObserverFile extends Model
{
    protected $fillable = [
        'observer_data_request_id',
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
}
