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
        Schema::table('observer_data_requests', function (Blueprint $table) {
            $table->dropColumn('request_data');
            $table->string('request_data_path')->nullable()->after('request_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('observer_data_requests', function (Blueprint $table) {
            $table->dropColumn('request_data_path');
            $table->json('request_data')->nullable()->after('request_url');
        });
    }
};
