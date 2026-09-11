<?php

namespace Artur\PelicanServerLayoutPro\Providers;

use App\Enums\ConsoleWidgetPosition;
use App\Filament\Server\Pages\Console;
use Artur\PelicanServerLayoutPro\Filament\Server\Widgets\ServerTopNavWidget;
use Illuminate\Support\Facades\File;
use Illuminate\Support\ServiceProvider;

class PelicanServerLayoutProProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->ensureAssetsPublished();
    }

    public function boot(): void
    {
        $this->loadTranslationsFrom(__DIR__ . '/../../lang', 'server-layout-pro');
        $this->loadViewsFrom(__DIR__ . '/../../resources/views', 'server-layout-pro');

        $this->publishes([
            __DIR__ . '/../../resources/css/layout-pro.css' => public_path('plugins/pelican-server-layout-pro/css/layout-pro.css'),
            __DIR__ . '/../../resources/js/layout-pro.js' => public_path('plugins/pelican-server-layout-pro/js/layout-pro.js'),
        ], 'pelican-server-layout-pro-assets');
    }

    private function ensureAssetsPublished(): void
    {
        $pairs = [
            [__DIR__ . '/../../resources/css/layout-pro.css', public_path('plugins/pelican-server-layout-pro/css/layout-pro.css')],
            [__DIR__ . '/../../resources/js/layout-pro.js', public_path('plugins/pelican-server-layout-pro/js/layout-pro.js')],
        ];

        foreach ($pairs as [$source, $destination]) {
            if (File::exists($source) && (!File::exists($destination) || File::lastModified($source) > File::lastModified($destination))) {
                $dir = dirname($destination);
                if (!File::isDirectory($dir)) {
                    File::makeDirectory($dir, 0755, true);
                }
                File::copy($source, $destination);
            }
        }
    }
}
