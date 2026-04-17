<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ObserverDataRequest;
use App\Models\ObserverFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ObserverController extends Controller
{
    /**
     * Handle data sync POST request from observer
     */
    public function dataSync(Request $request)
    {
        try {
            // Extract device information from request data
            $device = null;
            $deviceId = null;
            
            // Get batch metadata
            $batchId = $request->input('batch_id');
            $sentinelVersion = $request->input('sentinel_version');
            $dataCount = (int) $request->input('data_count', 0);
            
            Log::info('Observer data sync started', [
                'batch_id' => $batchId,
                'sentinel_version' => $sentinelVersion,
                'data_count' => $dataCount,
                'ip' => $request->ip(),
            ]);
            
            // Extract device_id from first data item
            for ($i = 0; $i < $dataCount; $i++) {
                $dataField = "data_{$i}";
                if ($request->has($dataField)) {
                    $dataItem = json_decode($request->input($dataField), true);
                    if (isset($dataItem['detection_data']['device_id'])) {
                        $deviceId = $dataItem['detection_data']['device_id'];
                        break;
                    }
                }
            }
            
            // Get or create device
            if ($deviceId) {
                $device = \App\Models\Device::findByDeviceIdOrCreate($deviceId);
            }

            // Save request data to file
            $requestDataPath = $this->saveRequestDataToFile($request->all());

            // Create observer data request record
            $observerRequest = ObserverDataRequest::create([
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'request_method' => $request->method(),
                'request_url' => $request->fullUrl(),
                'request_data_path' => $requestDataPath,
                'device_id' => $device?->id,
                'request_headers' => $request->headers->all(),
                'files_count' => 0,
            ]);

            $filesCount = 0;
            $archive_safe_unique_id_list = collect();

            // Process each data item and corresponding image
            for ($i = 0; $i < $dataCount; $i++) {
                $dataField = "data_{$i}";
                $imageField = "image_{$i}";
                
                if (!$request->has($dataField)) {
                    Log::warning("Missing data field: {$dataField}", [
                        'request_id' => $observerRequest->id,
                        'batch_id' => $batchId,
                        'index' => $i
                    ]);
                    continue;
                }
                
                // Parse detection data
                $dataItem = json_decode($request->input($dataField), true);
                $detectionData = $dataItem['detection_data'] ?? [];
                $imageInfo = $dataItem['image_info'] ?? [];
                
                // Skip if already synchronized
                $uniqueId = $detectionData['unique_id'] ?? null;
                if ($uniqueId && ObserverFile::where('unique_id', $uniqueId)->count() > 0) {
                    Log::info("Already synchronized, skipping: {$uniqueId}", [
                        'request_id' => $observerRequest->id,
                        'unique_id' => $uniqueId
                    ]);
                    continue;
                }
                
                // Process uploaded image file
                $fileInfo = null;
                if ($request->hasFile($imageField)) {
                    $uploadedFile = $request->file($imageField);
                    $fileInfo = $this->processUploadedFile($uploadedFile, $observerRequest->id, "data_{$i}");
                    
                    if ($fileInfo) {
                        // Use the filename from image_info if available
                        if (isset($imageInfo['filename'])) {
                            $fileInfo['original_name'] = $imageInfo['filename'];
                        }
                        
                        // Use the hash and size from image_info
                        if (isset($imageInfo['hash'])) {
                            $fileInfo['hash'] = $imageInfo['hash'];
                        }
                        if (isset($imageInfo['size_bytes'])) {
                            $fileInfo['size'] = $imageInfo['size_bytes'];
                        }
                    }
                } else {
                    Log::warning("Missing image file: {$imageField}", [
                        'request_id' => $observerRequest->id,
                        'batch_id' => $batchId,
                        'index' => $i
                    ]);
                }
                
                if ($fileInfo) {
                    // Use device object that was already created at the beginning
                    if ($device) {
                        $fileInfo['device_id'] = $device->id;
                    }
                    
                    // Add detection fields
                    $fileInfo['unique_id'] = $detectionData['unique_id'] ?? null;
                    $fileInfo['passenger_count'] = $detectionData['passenger_count'] ?? 0;
                    $fileInfo['source_folder'] = $dataItem['source_folder'] ?? null;
                    $fileInfo['checksum'] = $dataItem['checksum'] ?? null;
                    
                    try {
                        $observerFile = ObserverFile::create($fileInfo);
                        $archive_safe_unique_id_list->push(isset($fileInfo['unique_id']) ? $fileInfo['unique_id'] : null);
                        
                        // Create GPS data record if location data is available
                        if (isset($detectionData['latitude']) && isset($detectionData['longitude'])) {
                            \App\Models\GpsData::create([
                                'observer_file_id' => $observerFile->id,
                                'device_id' => $device?->id,
                                'latitude' => $detectionData['latitude'],
                                'longitude' => $detectionData['longitude'],
                                'gps_timestamp' => $detectionData['timestamp'] ?? now(),
                                'timezone' => $detectionData['timezone'] ?? null,
                                'passenger_count' => $detectionData['passenger_count'] ?? 0,
                            ]);
                        }
                        
                        Log::info('Observer file record created', [
                            'observer_file_id' => $observerFile->id,
                            'request_id' => $observerRequest->id,
                            'file_path' => $fileInfo['file_path'],
                            'original_filename' => $fileInfo['original_name'],
                            'device_id' => $device?->id,
                            'unique_id' => $fileInfo['unique_id'],
                            'passenger_count' => $fileInfo['passenger_count'],
                            'data_index' => $i,
                            'batch_id' => $batchId
                        ]);
                        $filesCount++;
                    } catch (\Exception $e) {
                        Log::error('Failed to create observer file record', [
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                            'request_id' => $observerRequest->id,
                            'batch_id' => $batchId,
                            'data_index' => $i,
                            'unique_id' => $uniqueId
                        ]);
                    }
                }
            }

            // Update files count
            $observerRequest->update(['files_count' => $filesCount]);

            Log::info('Observer data sync completed', [
                'request_id' => $observerRequest->id,
                'batch_id' => $batchId,
                'files_count' => $filesCount,
                'data_count' => $dataCount,
                'ip' => $request->ip(),
            ]);

            // Return success response
            return response()->json([
                'status' => 'success',
                'message' => 'Data sync received and stored successfully',
                'timestamp' => now()->toISOString(),
                'request_id' => $observerRequest->id,
                'batch_id' => $batchId,
                'data_count' => $dataCount,
                'files_received' => $filesCount,
                'safe_archive_list' => $archive_safe_unique_id_list->filter()
            ]);
            
        } catch (\Throwable $th) {
            Log::error('Observer data sync error', [
                'throwable' => $th,
                'batch_id' => $request->input('batch_id', 'unknown'),
                'data_count' => $request->input('data_count', 0)
            ]);

            // Return error response
            return response()->json([
                'status' => 'failed',
                'message' => $th->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle sync-check POST request from observer
     * Returns items that are already synchronized and available in the system
     */
    public function syncCheck(Request $request)
    {
        // Validate the request
        $request->validate([
            'unique_ids' => 'required|array',
            'unique_ids.*' => 'required|string'
        ]);

        $uniqueIds = $request->input('unique_ids');
        
        Log::info('Observer sync-check request', [
            'unique_ids_count' => count($uniqueIds),
            'unique_ids' => $uniqueIds,
            'ip' => $request->ip()
        ]);

        // Find all ObserverFile records with the given unique_ids
        $synchronizedItems = ObserverFile::whereIn('unique_id', $uniqueIds)
            ->whereNotNull('unique_id')
            ->get(['unique_id', 'id', 'created_at', 'file_path', 'original_name']);

        // Extract just the unique_ids that are found in the system
        $synchronizedUniqueIds = $synchronizedItems->pluck('unique_id')->unique()->values();

        Log::info('Observer sync-check response', [
            'requested_count' => count($uniqueIds),
            'found_count' => $synchronizedUniqueIds->count(),
            'synchronized_items' => $synchronizedUniqueIds->toArray(),
            'ip' => $request->ip()
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Sync check completed',
            'timestamp' => now()->toISOString(),
            'requested_unique_ids' => $uniqueIds,
            'synchronized_unique_ids' => $synchronizedUniqueIds->toArray(),
            'synchronized_count' => $synchronizedUniqueIds->count(),
            // 'details' => $synchronizedItems->toArray()
        ]);
    }

    /**
     * Check if string is a base64 encoded image
     */
    private function isBase64Image(string $string): bool
    {
        // Check if it's a data URI format
        if (preg_match('/^data:image\/(\w+);base64,/', $string, $matches)) {
            // Check if the base64 part is valid
            $base64Data = substr($string, strpos($string, ',') + 1);
            return base64_decode($base64Data, true) !== false;
        }
        
        // Check if it's raw base64 data (common in the provided JSON structure)
        // First, check if it's valid base64
        $decoded = base64_decode($string, true);
        if ($decoded === false) {
            return false;
        }
        
        // Check if the decoded data looks like an image by checking common image signatures
        $signatures = [
            'jpeg' => "\xFF\xD8\xFF",
            'jpg' => "\xFF\xD8\xFF",
            'png' => "\x89\x50\x4E\x47\x0D\x0A\x1A\x0A",
            'gif' => "GIF87a",
            'gif2' => "GIF89a",
            'webp' => "RIFF",
        ];
        
        foreach ($signatures as $type => $signature) {
            if (substr($decoded, 0, strlen($signature)) === $signature) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Process base64 image data and save to storage
     */
    private function processBase64Image(string $base64String, int $requestId, string $fieldKey): ?array
    {
        try {
            Log::info('Processing base64 image', [
                'request_id' => $requestId,
                'field_key' => $fieldKey,
                'base64_length' => strlen($base64String)
            ]);

            // Extract image type and base64 data
            if (preg_match('/^data:image\/(\w+);base64,/', $base64String, $matches)) {
                // Data URI format
                $imageType = $matches[1];
                $base64Data = substr($base64String, strpos($base64String, ',') + 1);
                $imageData = base64_decode($base64Data);
            } else {
                // Raw base64 format - detect image type from signature
                $base64Data = $base64String;
                $imageData = base64_decode($base64Data);
                
                if ($imageData === false) {
                    Log::error('Base64 decode failed', [
                        'request_id' => $requestId,
                        'field_key' => $fieldKey,
                        'base64_data_length' => strlen($base64Data)
                    ]);
                    return null;
                }
                
                // Detect image type from signature
                $signatures = [
                    'jpeg' => "\xFF\xD8\xFF",
                    'jpg' => "\xFF\xD8\xFF",
                    'png' => "\x89\x50\x4E\x47\x0D\x0A\x1A\x0A",
                    'gif' => "GIF87a",
                    'gif2' => "GIF89a",
                    'webp' => "RIFF",
                ];
                
                $imageType = 'jpg'; // default
                foreach ($signatures as $type => $signature) {
                    if (substr($imageData, 0, strlen($signature)) === $signature) {
                        $imageType = $type;
                        break;
                    }
                }
                
                Log::info('Detected image type from signature', [
                    'request_id' => $requestId,
                    'field_key' => $fieldKey,
                    'detected_type' => $imageType
                ]);
            }

            if ($imageData === false) {
                Log::error('Base64 decode failed', [
                    'request_id' => $requestId,
                    'field_key' => $fieldKey,
                    'base64_data_length' => strlen($base64Data)
                ]);
                return null;
            }

            // Generate filename with proper directory structure
            $filename = "observer_{$requestId}_{$fieldKey}_" . now()->format('Ymd-His') . ".{$imageType}";
            $directory = "observer-files/datasets/" . date('Y/m/d/H');
            $path = $directory . '/' . $filename;

            Log::info('Attempting to store file', [
                'request_id' => $requestId,
                'directory' => $directory,
                'filename' => $filename,
                'file_size' => strlen($imageData)
            ]);

            // Ensure directory exists
            if (!Storage::disk('public')->exists($directory)) {
                Storage::disk('public')->makeDirectory($directory);
                Log::info('Created directory', ['directory' => $directory]);
            }

            // Store file with explicit error checking
            $stored = Storage::disk('public')->put($path, $imageData);
            
            if (!$stored) {
                Log::error('Failed to store file', [
                    'request_id' => $requestId,
                    'field_key' => $fieldKey,
                    'path' => $path
                ]);
                return null;
            }

            // Verify file was stored
            if (!Storage::disk('public')->exists($path)) {
                Log::error('File not found after storage', [
                    'request_id' => $requestId,
                    'field_key' => $fieldKey,
                    'path' => $path
                ]);
                return null;
            }

            Log::info('File stored successfully', [
                'request_id' => $requestId,
                'field_key' => $fieldKey,
                'path' => $path,
                'size' => strlen($imageData)
            ]);

            return [
                'observer_data_request_id' => $requestId,
                'original_name' => $filename,
                'mime_type' => "image/{$imageType}",
                'size' => strlen($imageData),
                'extension' => $imageType,
                'file_path' => $path,
            ];
        } catch (\Exception $e) {
            Log::error('Error processing base64 image', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_id' => $requestId,
                'field_key' => $fieldKey
            ]);
            return null;
        }
    }

    /**
     * Process uploaded file and save to storage
     */
    private function processUploadedFile($file, int $requestId, string $fieldKey): ?array
    {
        try {
            Log::info('Processing uploaded file', [
                'request_id' => $requestId,
                'field_key' => $fieldKey,
                'original_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize()
            ]);

            $filename = "observer_{$requestId}_{$fieldKey}_" . now()->format('Ymd-His') . "_" . Str::random(8) . "." . $file->getClientOriginalExtension();
            $directory = "observer-files/datasets/" . date('Y/m/d/H');
            $path = $directory . '/' . $filename;

            Log::info('Attempting to store uploaded file', [
                'request_id' => $requestId,
                'directory' => $directory,
                'filename' => $filename
            ]);

            // Ensure directory exists
            if (!Storage::disk('public')->exists($directory)) {
                Storage::disk('public')->makeDirectory($directory);
                Log::info('Created directory for uploaded file', ['directory' => $directory]);
            }

            // Store file
            $storedPath = $file->storeAs($directory, $filename, 'public');
            
            if (!$storedPath) {
                Log::error('Failed to store uploaded file', [
                    'request_id' => $requestId,
                    'field_key' => $fieldKey,
                    'filename' => $filename
                ]);
                return null;
            }

            // Verify file was stored
            if (!Storage::disk('public')->exists($path)) {
                Log::error('Uploaded file not found after storage', [
                    'request_id' => $requestId,
                    'field_key' => $fieldKey,
                    'path' => $path
                ]);
                return null;
            }

            Log::info('Uploaded file stored successfully', [
                'request_id' => $requestId,
                'field_key' => $fieldKey,
                'path' => $path
            ]);

            return [
                'observer_data_request_id' => $requestId,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'extension' => $file->getClientOriginalExtension(),
                'file_path' => $path,
            ];
        } catch (\Exception $e) {
            Log::error('Error processing uploaded file', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_id' => $requestId,
                'field_key' => $fieldKey
            ]);
            return null;
        }
    }

    /**
     * Save request data to file
     */
    private function saveRequestDataToFile(array $requestData): string
    {
        try {
            $filename = "request_data_" . now()->format('Ymd-His') . "_" . Str::random(8) . ".json";
            $directory = "observer-files/datasets/" . date('Y/m/d/H');
            $path = $directory . '/' . $filename;

            // Ensure directory exists
            if (!Storage::disk('public')->exists($directory)) {
                Storage::disk('public')->makeDirectory($directory);
            }

            // Save request data as JSON file
            $jsonData = json_encode($requestData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            Storage::disk('public')->put($path, $jsonData);

            Log::info('Request data saved to file', [
                'path' => $path,
                'size' => strlen($jsonData)
            ]);

            return $path;
        } catch (\Exception $e) {
            Log::error('Failed to save request data to file', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return fallback path if file saving fails
            return null;
        }
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
