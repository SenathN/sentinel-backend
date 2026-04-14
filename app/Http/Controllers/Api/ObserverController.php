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

        // Log::info('Observer data sync request', $request->all());

        // Save request data to file
        $requestDataPath = $this->saveRequestDataToFile($request->all());

        // Create observer data request record
        $observerRequest = ObserverDataRequest::create([
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'request_method' => $request->method(),
            'request_url' => $request->fullUrl(),
            'request_data_path' => $requestDataPath,
            'request_headers' => $request->headers->all(),
            'files_count' => 0,
        ]);

        $filesCount = 0;

        // Handle the specific JSON structure with nested data array
        if ($request->has('data') && is_array($request->input('data'))) {
            $dataArray = $request->input('data');
            
            foreach ($dataArray as $index => $dataItem) {
                // Check if this data item contains image_data with base64_data
                if (isset($dataItem['image_data']['base64_data'])) {
                    $base64Data = $dataItem['image_data']['base64_data'];
                    $filename = $dataItem['image_data']['filename'] ?? "image_{$index}";
                    
                    if ($this->isBase64Image($base64Data)) {
                        $fileInfo = $this->processBase64Image($base64Data, $observerRequest->id, "data_{$index}");
                        if ($fileInfo) {
                            // Update the original filename if available
                            if (isset($dataItem['image_data']['filename'])) {
                                $fileInfo['original_name'] = $dataItem['image_data']['filename'];
                            }
                            
                            // Extract detection data
                            $detectionData = $dataItem['detection_data'] ?? [];
                            
                            // Get or create device
                            $deviceId = $detectionData['device_id'] ?? null;
                            $device = null;
                            if ($deviceId) {
                                $device = \App\Models\Device::findByDeviceIdOrCreate($deviceId);
                                $fileInfo['device_id'] = $device->id;
                            }
                            
                            // Add detection fields
                            $fileInfo['unique_id'] = $detectionData['unique_id'] ?? null;
                            $fileInfo['passenger_count'] = $detectionData['passenger_count'] ?? 0;
                            
                            try {
                                $observerFile = ObserverFile::create($fileInfo);
                                
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
                                
                                Log::info('Observer file record created from nested data', [
                                    'observer_file_id' => $observerFile->id,
                                    'request_id' => $observerRequest->id,
                                    'file_path' => $fileInfo['file_path'],
                                    'original_filename' => $fileInfo['original_name'],
                                    'device_id' => $device?->id,
                                    'unique_id' => $fileInfo['unique_id'],
                                    'passenger_count' => $fileInfo['passenger_count'],
                                    'data_index' => $index
                                ]);
                                $filesCount++;
                            } catch (\Exception $e) {
                                Log::error('Failed to create observer file record from nested data', [
                                    'error' => $e->getMessage(),
                                    'trace' => $e->getTraceAsString(),
                                    'request_id' => $observerRequest->id,
                                    'file_info' => $fileInfo,
                                    'data_index' => $index
                                ]);
                            }
                        }
                    } else {
                        Log::warning('Invalid base64 image format in nested data', [
                            'request_id' => $observerRequest->id,
                            'data_index' => $index,
                            'filename' => $filename ?? 'unknown'
                        ]);
                    }
                }
            }
        }

        // Handle base64 image data at top level (fallback for other formats)
        foreach ($request->all() as $key => $value) {
            if (is_string($value) && $this->isBase64Image($value) && $key !== 'data') {
                $fileInfo = $this->processBase64Image($value, $observerRequest->id, $key);
                if ($fileInfo) {
                    try {
                        $observerFile = ObserverFile::create($fileInfo);
                        Log::info('Observer file record created from top level', [
                            'observer_file_id' => $observerFile->id,
                            'request_id' => $observerRequest->id,
                            'file_path' => $fileInfo['file_path'],
                            'field_key' => $key
                        ]);
                        $filesCount++;
                    } catch (\Exception $e) {
                        Log::error('Failed to create observer file record from top level', [
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                            'request_id' => $observerRequest->id,
                            'file_info' => $fileInfo,
                            'field_key' => $key
                        ]);
                    }
                }
            }
        }

        // Handle regular file uploads if any
        if ($request->hasFile('files')) {
            $files = $request->file('files');
            
            if (is_array($files)) {
                foreach ($files as $index => $file) {
                    $fileInfo = $this->processUploadedFile($file, $observerRequest->id, "file_{$index}");
                    if ($fileInfo) {
                        try {
                            $observerFile = ObserverFile::create($fileInfo);
                            Log::info('Observer file record created for uploaded file', [
                                'observer_file_id' => $observerFile->id,
                                'request_id' => $observerRequest->id,
                                'file_path' => $fileInfo['file_path']
                            ]);
                            $filesCount++;
                        } catch (\Exception $e) {
                            Log::error('Failed to create observer file record for uploaded file', [
                                'error' => $e->getMessage(),
                                'trace' => $e->getTraceAsString(),
                                'request_id' => $observerRequest->id,
                                'file_info' => $fileInfo
                            ]);
                        }
                    }
                }
            } else {
                // Single file
                $fileInfo = $this->processUploadedFile($files, $observerRequest->id, 'file');
                if ($fileInfo) {
                    try {
                        $observerFile = ObserverFile::create($fileInfo);
                        Log::info('Observer file record created for single uploaded file', [
                            'observer_file_id' => $observerFile->id,
                            'request_id' => $observerRequest->id,
                            'file_path' => $fileInfo['file_path']
                        ]);
                        $filesCount++;
                    } catch (\Exception $e) {
                        Log::error('Failed to create observer file record for single uploaded file', [
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                            'request_id' => $observerRequest->id,
                            'file_info' => $fileInfo
                        ]);
                    }
                }
            }
        }

        // Check for individual file fields
        foreach ($request->allFiles() as $key => $file) {
            if ($key !== 'files') { // Skip if already processed above
                $fileInfo = $this->processUploadedFile($file, $observerRequest->id, $key);
                if ($fileInfo) {
                    try {
                        $observerFile = ObserverFile::create($fileInfo);
                        Log::info('Observer file record created for individual file field', [
                            'observer_file_id' => $observerFile->id,
                            'request_id' => $observerRequest->id,
                            'field_key' => $key,
                            'file_path' => $fileInfo['file_path']
                        ]);
                        $filesCount++;
                    } catch (\Exception $e) {
                        Log::error('Failed to create observer file record for individual file field', [
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                            'request_id' => $observerRequest->id,
                            'field_key' => $key,
                            'file_info' => $fileInfo
                        ]);
                    }
                }
            }
        }

        // Update files count
        $observerRequest->update(['files_count' => $filesCount]);

        Log::info('Observer data sync processed', [
            'request_id' => $observerRequest->id,
            'files_count' => $filesCount,
            'ip' => $request->ip(),
        ]);

        // Return success response
        return response()->json([
            'status' => 'success',
            'message' => 'Data sync received and stored successfully',
            'timestamp' => now()->toISOString(),
            'request_id' => $observerRequest->id,
            'received_data_count' => count($request->all()),
            'files_received' => $filesCount
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
            $filename = "observer_{$requestId}_{$fieldKey}_" . time() . ".{$imageType}";
            $directory = "observer-files/" . date('Y/m/d/H');
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

            $filename = "observer_{$requestId}_{$fieldKey}_" . time() . "_" . Str::random(8) . "." . $file->getClientOriginalExtension();
            $directory = "observer-files/" . date('Y/m/d/H');
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
            $filename = "request_data_" . time() . "_" . Str::random(8) . ".json";
            $directory = "observer-files/requests/" . date('Y/m/d/H');
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
