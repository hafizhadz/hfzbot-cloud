<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'HfzBot Cloud API',
        'version' => '1.0.0',
    ]);
});
