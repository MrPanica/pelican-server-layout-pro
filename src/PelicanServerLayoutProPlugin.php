<?php

namespace Artur\PelicanServerLayoutPro;

use App\Enums\ConsoleWidgetPosition;
use App\Filament\Server\Pages\Console;
use Artur\PelicanServerLayoutPro\Filament\Admin\Pages\ServerLayoutSettingsPage;
use Artur\PelicanServerLayoutPro\Filament\Server\Widgets\ServerTopNavWidget;
use Filament\Contracts\Plugin;
use Filament\Panel;
use Filament\View\PanelsRenderHook;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\HtmlString;

class PelicanServerLayoutProPlugin implements Plugin
{
    public function getId(): string
    {
        return 'pelican-server-layout-pro';
    }

    public function register(Panel $panel): void
    {
        $version = '1.0.2';

        if ($panel->getId() === 'server') {

            $panel->renderHook(
                PanelsRenderHook::PAGE_START,
                fn () => \Illuminate\Support\Facades\Blade::render('@livewire(\Artur\PelicanServerLayoutPro\Filament\Server\Widgets\ServerTopNavWidget::class)')
            );

            $panel->renderHook(
                PanelsRenderHook::HEAD_END,
                function () use ($version) {
                    $config = $this->loadConfig();
                    return new HtmlString(
                        '<link rel="stylesheet" href="/plugins/pelican-server-layout-pro/css/layout-pro.css?v=' . $version . '&t=' . time() . '">' . "\n" .
                        '<script>' . "\n" .
                        'window.PelicanServerLayoutConfig = ' . json_encode($config) . ';' . "\n" .
                        '</script>'
                    );
                }
            );

            $panel->renderHook(
                PanelsRenderHook::BODY_END,
                fn () => new HtmlString(
                    '<script src="/plugins/pelican-server-layout-pro/js/layout-pro.js?v=' . $version . '&t=' . time() . '" defer></script>'
                )
            );
        }

        if ($panel->getId() === 'admin') {
            $panel->pages([
                ServerLayoutSettingsPage::class,
            ]);
        }
    }

    public function boot(Panel $panel): void
    {
    }

    private function loadConfig(): array
    {
        $defaults = [
            'hide_sidebar' => true,
            'side_chart_1' => 'cpu',
            'side_chart_2' => 'memory',
            'side_chart_3' => 'players',
            'bottom_charts' => ['network', 'disk'],
            'show_uptime_button' => true,
        ];

        try {
            $rows = DB::table('settings')->where('key', 'like', 'server_layout_pro::%')->get();
            foreach ($rows as $row) {
                $subKey = str_replace('server_layout_pro::', '', $row->key);
                $decoded = json_decode($row->value, true);
                $defaults[$subKey] = ($decoded !== null) ? $decoded : $row->value;
            }
        } catch (\Throwable $e) {}

        return $defaults;
    }
}
