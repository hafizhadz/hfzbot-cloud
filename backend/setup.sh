#!/usr/bin/env bash
set -euo pipefail

# HfzBot Cloud — Backend Setup Script
# Run this after cloning to initialize the Laravel project.

echo "📦 Installing Composer dependencies..."
composer install --no-interaction --prefer-dist

echo "🔑 Generating application key..."
php artisan key:generate

echo "🗄️  Running database migrations..."
php artisan migrate

echo "🌱 Seeding database..."
php artisan db:seed --class=DatabaseSeeder

echo "🔐 Publishing Sanctum config..."
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider" --force

echo "✅ Setup complete!"
echo ""
echo "🚀 Start the dev server: php artisan serve"
echo "   Or: composer run dev (Laravel 11+)"
