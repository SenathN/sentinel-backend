<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AnalyticsController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public routes
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Authenticated routes
Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Profile management
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    
    // Device management
    Route::resource('observers/devices', DeviceController::class)->names([
        'index' => 'devices.index',
        'show' => 'devices.show',
        'store' => 'devices.store',
        'update' => 'devices.update',
        'destroy' => 'devices.destroy',
    ]);
    
    // Analytics
    Route::get('/analytics/heatmap', [AnalyticsController::class, 'heatmap'])->name('analytics.heatmap');
    Route::get('/analytics/test', function() {
        return Inertia::render('Analytics/TestHeatmap');
    })->name('analytics.test');
    Route::get('/api/analytics/test', [AnalyticsController::class, 'test'])->name('api.analytics.test');
});

require __DIR__.'/auth.php';
