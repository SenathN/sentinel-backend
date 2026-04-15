<?php

use App\Http\Controllers\Api\ObserverController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::post('/observer/data-sync', [ObserverController::class, 'dataSync'])->name('api.observer.data-sync');
Route::post('/observer/sync-check', [ObserverController::class, 'syncCheck'])->name('api.observer.sync-check');
