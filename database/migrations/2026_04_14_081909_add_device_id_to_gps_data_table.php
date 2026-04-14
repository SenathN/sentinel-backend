<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('gps_data', function (Blueprint $table) {
            $table->foreignId('device_id')->nullable()->after('observer_file_id');
            $table->index('device_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gps_data', function (Blueprint $table) {
            $table->dropIndex(['device_id']);
            $table->dropForeign(['device_id']);
            $table->dropColumn('device_id');
        });
    }
};
