<?php

return [
    'default' => env('CACHE_STORE', 'file'),
    'stores' => [
        'file' => [
            'driver' => 'file',
            'path' => storage_path('framework/cache/data'),
            'lock_path' => storage_path('framework/cache/data'),
        ],
        'database' => [
            'driver' => 'database',
            'table' => env('CACHE_TABLE', 'cache'),
            'connection' => env('CACHE_CONNECTION'),
            'lock_connection' => env('CACHE_LOCK_CONNECTION'),
        ],
        'array' => [
            'driver' => 'array',
            'serialize' => false,
        ],
        'null' => [
            'driver' => 'null',
        ],
    ],
    'prefix' => env('CACHE_PREFIX', 'hfzbot_cache'),
];
