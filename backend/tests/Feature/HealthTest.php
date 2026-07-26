<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    /**
     * Test that the health-check endpoint returns a successful response.
     */
    public function test_health_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'timestamp',
        ]);
        $response->assertJson([
            'status' => 'ok',
        ]);
    }

    /**
     * Test that the timestamp in the health-check response is a valid ISO 8601 date.
     */
    public function test_health_endpoint_timestamp_is_valid_iso8601(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200);
        $this->assertNotNull(
            strtotime($response->json('timestamp')),
            'The timestamp must be a valid ISO 8601 date string.'
        );
    }

    /**
     * Test that the health endpoint returns the correct content type.
     */
    public function test_health_endpoint_returns_json(): void
    {
        $response = $this->get('/api/health');

        $response->assertHeader('Content-Type', 'application/json');
    }
}
