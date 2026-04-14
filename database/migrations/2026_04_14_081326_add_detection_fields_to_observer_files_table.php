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
        Schema::table('observer_files', function (Blueprint $table) {
            $table->string('unique_id')->nullable()->after('extension');
            $table->integer('passenger_count')->default(0)->after('unique_id');
            $table->foreignId('device_id')->nullable()->after('observer_data_request_id');
            $table->index('device_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('observer_files', function (Blueprint $table) {
            $table->dropIndex(['device_id']);
            $table->dropForeign(['device_id']);
            $table->dropColumn(['device_id', 'unique_id', 'passenger_count']);
        });
    }
};
