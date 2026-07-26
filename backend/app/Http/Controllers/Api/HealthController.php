<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    /**
     * Health-check endpoint.
     *
     * Returns the current API status and server timestamp.
     * Used by monitoring tools and the frontend to verify connectivity.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
