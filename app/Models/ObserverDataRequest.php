<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ObserverDataRequest extends Model
{
    protected $fillable = [
        'ip_address',
        'user_agent',
        'request_method',
        'request_url',
        'request_data_path',
        'request_headers',
        'files_count',
    ];

    protected $casts = [
        'request_headers' => 'array',
    ];

    public function observerFiles(): HasMany
    {
        return $this->hasMany(ObserverFile::class);
    }
}
