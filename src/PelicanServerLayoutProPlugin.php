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
        $version = '1.0.10';

        if ($panel->getId() === 'server') {

            $panel->renderHook(
                PanelsRenderHook::HEAD_START,
                function () {
                    $config = $this->loadConfig();
                    if (!($config['hide_sidebar'] ?? true)) {
                        return '';
                    }

                    return new HtmlString('<style id="pelican-layout-pro-critical">
                        /* Critical Zero-FOUC Sidebar Suppression */
                        .fi-panel-server .fi-sidebar,
                        .fi-panel-server .fi-main-sidebar,
                        .fi-panel-server #fi-main-sidebar,
                        .fi-panel-server .fi-sidebar-close-overlay,
                        .fi-panel-server .fi-topbar-open-sidebar-btn,
                        .fi-panel-server .fi-layout-sidebar-toggle-btn-ctn,
                        .fi-panel-server button[aria-label*="sidebar"],
                        .fi-panel-server button[title*="sidebar"],
                        body.pelican-hide-sidebar .fi-sidebar,
                        body.pelican-hide-sidebar .fi-main-sidebar,
                        body.pelican-hide-sidebar #fi-main-sidebar,
                        html.pelican-hide-sidebar .fi-sidebar,
                        html.pelican-hide-sidebar .fi-main-sidebar,
                        html.pelican-hide-sidebar #fi-main-sidebar {
                            display: none !important;
                        }

                        .fi-panel-server .fi-layout,
                        body.pelican-hide-sidebar .fi-layout,
                        html.pelican-hide-sidebar .fi-layout {
                            display: block !important;
                        }

                        .fi-panel-server .fi-main-ctn,
                        body.pelican-hide-sidebar .fi-main-ctn,
                        html.pelican-hide-sidebar .fi-main-ctn {
                            width: 100% !important;
                            max-width: 100% !important;
                            margin-inline-start: 0 !important;
                            padding-inline-start: 0 !important;
                        }

                        .fi-panel-server .fi-main,
                        body.pelican-hide-sidebar .fi-main,
                        html.pelican-hide-sidebar .fi-main {
                            max-width: 100% !important;
                            width: 100% !important;
                        }

                        .fi-panel-server .fi-topbar,
                        body.pelican-hide-sidebar .fi-topbar,
                        html.pelican-hide-sidebar .fi-topbar {
                            inset-inline-start: 0 !important;
                            width: 100% !important;
                        }
                    </style>');
                }
            );

            $panel->renderHook(
                PanelsRenderHook::PAGE_START,
                fn () => \Illuminate\Support\Facades\Blade::render('@livewire(\Artur\PelicanServerLayoutPro\Filament\Server\Widgets\ServerTopNavWidget::class)')
            );

            $panel->renderHook(
                PanelsRenderHook::HEAD_END,
                function () use ($version) {
                    $config = $this->loadConfig();
                    $i18n = trans('server-layout-pro::messages');
                    $hideSidebarScript = ($config['hide_sidebar'] ?? true)
                        ? 'document.documentElement.classList.add("pelican-hide-sidebar"); if (document.body) document.body.classList.add("pelican-hide-sidebar");'
                        : '';

                    return new HtmlString(
                        '<link rel="stylesheet" href="/plugins/pelican-server-layout-pro/css/layout-pro.css?v=' . $version . '&t=' . time() . '">' . "\n" .
                        '<script>' . "\n" .
                        'window.PelicanServerLayoutConfig = ' . json_encode($config) . ';' . "\n" .
                        'window.PelicanServerLayoutI18n = ' . json_encode($i18n) . ';' . "\n" .
                        $hideSidebarScript . "\n" .
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
