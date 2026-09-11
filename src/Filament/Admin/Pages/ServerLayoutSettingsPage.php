<?php

namespace Artur\PelicanServerLayoutPro\Filament\Admin\Pages;

use Filament\Actions\Action;
use Filament\Forms\Components\CheckboxList;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\DB;

class ServerLayoutSettingsPage extends Page implements HasForms
{
    use InteractsWithForms;

    protected string $view = 'server-layout-pro::admin.settings';

    public ?array $data = [];

    public static function getNavigationIcon(): ?string
    {
        return 'tabler-layout-dashboard';
    }

    public static function getNavigationGroup(): ?string
    {
        return __('server-layout-pro::messages.nav_group');
    }

    public static function getNavigationLabel(): string
    {
        return __('server-layout-pro::messages.nav_label');
    }

    public function getTitle(): string
    {
        return __('server-layout-pro::messages.title');
    }

    public function mount(): void
    {
        $this->form->fill([
            'hide_sidebar' => (bool) $this->getSetting('hide_sidebar', true),
            'side_chart_1' => (string) $this->getSetting('side_chart_1', 'cpu'),
            'side_chart_2' => (string) $this->getSetting('side_chart_2', 'memory'),
            'side_chart_3' => (string) $this->getSetting('side_chart_3', 'players'),
            'bottom_charts' => (array) $this->getSetting('bottom_charts', ['network', 'disk']),
            'show_uptime_button' => (bool) $this->getSetting('show_uptime_button', true),
        ]);
    }

    public function form(Schema $schema): Schema
    {
        $chartOptions = [
            'cpu' => __('server-layout-pro::messages.chart_cpu'),
            'memory' => __('server-layout-pro::messages.chart_memory'),
            'players' => __('server-layout-pro::messages.chart_players'),
            'network' => __('server-layout-pro::messages.chart_network'),
            'disk' => __('server-layout-pro::messages.chart_disk'),
        ];

        return $schema
            ->components([
                Section::make(__('server-layout-pro::messages.section_general'))
                    ->description(__('server-layout-pro::messages.section_general_desc'))
                    ->schema([
                        Toggle::make('hide_sidebar')
                            ->label(__('server-layout-pro::messages.field_hide_sidebar'))
                            ->helperText(__('server-layout-pro::messages.field_hide_sidebar_help'))
                            ->default(true),
                        Toggle::make('show_uptime_button')
                            ->label(__('server-layout-pro::messages.field_show_uptime_button'))
                            ->helperText(__('server-layout-pro::messages.field_show_uptime_button_help'))
                            ->default(true),
                    ])->columns(2),

                Section::make(__('server-layout-pro::messages.section_charts'))
                    ->description(__('server-layout-pro::messages.section_charts_desc'))
                    ->schema([
                        Select::make('side_chart_1')
                            ->label(__('server-layout-pro::messages.field_side_chart_1'))
                            ->options($chartOptions)
                            ->default('cpu')
                            ->required(),
                        Select::make('side_chart_2')
                            ->label(__('server-layout-pro::messages.field_side_chart_2'))
                            ->options($chartOptions)
                            ->default('memory')
                            ->required(),
                        Select::make('side_chart_3')
                            ->label(__('server-layout-pro::messages.field_side_chart_3'))
                            ->options($chartOptions)
                            ->default('players')
                            ->required(),
                        CheckboxList::make('bottom_charts')
                            ->label(__('server-layout-pro::messages.field_bottom_charts'))
                            ->helperText(__('server-layout-pro::messages.field_bottom_charts_help'))
                            ->options($chartOptions)
                            ->default(['network', 'disk']),
                    ])->columns(3),
            ])
            ->statePath('data');
    }

    public function saveSettings(): void
    {
        $state = $this->form->getState();

        foreach ($state as $key => $val) {
            $this->setSetting($key, $val);
        }

        Notification::make()
            ->title(__('server-layout-pro::messages.saved_notification'))
            ->success()
            ->send();
    }

    private function getSetting(string $key, mixed $default = null): mixed
    {
        try {
            $row = DB::table('settings')->where('key', 'server_layout_pro::' . $key)->first();
            if (!$row) return $default;
            $val = json_decode($row->value, true);
            return $val !== null ? $val : $row->value;
        } catch (\Throwable $e) {
            return $default;
        }
    }

    private function setSetting(string $key, mixed $val): void
    {
        try {
            DB::table('settings')->updateOrInsert(
                ['key' => 'server_layout_pro::' . $key],
                ['value' => is_array($val) || is_bool($val) ? json_encode($val) : (string) $val]
            );
        } catch (\Throwable $e) {}
    }
}
