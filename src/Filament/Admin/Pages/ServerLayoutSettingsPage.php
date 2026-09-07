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
        return 'Настройки';
    }

    public static function getNavigationLabel(): string
    {
        return 'Server Layout Pro';
    }

    public function getTitle(): string
    {
        return 'Настройки Server Layout Pro';
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
            'cpu' => 'Нагрузка CPU (Процессор)',
            'memory' => 'Память (RAM)',
            'players' => 'Онлайн игроков (Players)',
            'network' => 'Сетевой трафик (Network In/Out)',
            'disk' => 'Дисковое пространство (Disk)',
        ];

        return $schema
            ->components([
                Section::make('Общий интерфейс')
                    ->description('Управление структурой страницы сервера')
                    ->schema([
                        Toggle::make('hide_sidebar')
                            ->label('Скрыть боковое меню (Sidebar) на страницах сервера')
                            ->helperText('Включает современное полноэкранное отображение с верхней строкой навигации и быстрым переключением серверов.')
                            ->default(true),
                        Toggle::make('show_uptime_button')
                            ->label('Отображать живой аптайм на кнопке «Включён / Старт»')
                            ->helperText('Показывает точное время непрерывной работы сервера прямо на главной кнопке управления питанием.')
                            ->default(true),
                    ])->columns(2),

                Section::make('Порядок и распределение графиков (Консоль слева, 3 графика справа)')
                    ->description('Выберите, какие именно графики будут отображаться в правой колонке рядом с консолью (сверху вниз)')
                    ->schema([
                        Select::make('side_chart_1')
                            ->label('График №1 справа (верхний)')
                            ->options($chartOptions)
                            ->default('cpu')
                            ->required(),
                        Select::make('side_chart_2')
                            ->label('График №2 справа (средний)')
                            ->options($chartOptions)
                            ->default('memory')
                            ->required(),
                        Select::make('side_chart_3')
                            ->label('График №3 справа (нижний)')
                            ->options($chartOptions)
                            ->default('players')
                            ->required(),
                        CheckboxList::make('bottom_charts')
                            ->label('Графики в нижнем ряду под консолью')
                            ->helperText('Эти графики распределяются по всей ширине в один ряд под консолью.')
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
            ->title('Настройки Server Layout Pro успешно сохранены!')
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
