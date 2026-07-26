<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\HealthController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes in this file are prefixed with '/api' automatically.
| Rate limiting applied: 60 requests per minute per IP.
|
*/

// ─── Public Routes ───────────────────────────────────────────────────────

Route::get('/health', [App\Http\Controllers\Api\HealthController::class, 'index']);

// ─── Authentication Routes ───────────────────────────────────────────────
// (AuthController will be implemented in subtask_02)
// Route::post('/register', [AuthController::class, 'register']);
// Route::post('/login', [AuthController::class, 'login']);
// Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);

// ─── Authenticated Routes ────────────────────────────────────────────────

Route::middleware('auth:sanctum')->group(function () {
    // Current user
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // ─── Bot Routes ──────────────────────────────────────────────────
    // Route::apiResource('bots', BotController::class);

    // ─── Group Routes ────────────────────────────────────────────────
    // Route::apiResource('groups', GroupController::class);

    // ─── Subscription Routes ─────────────────────────────────────────
    // Route::apiResource('subscriptions', SubscriptionController::class);

    // ─── Payment Routes ──────────────────────────────────────────────
    // Route::apiResource('payments', PaymentController::class);
});
