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
        Schema::create('observer_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('observer_data_request_id')->constrained()->onDelete('cascade');
            $table->string('original_name');
            $table->string('mime_type');
            $table->bigInteger('size');
            $table->string('extension');
            $table->string('file_path');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('observer_files');
    }
};
