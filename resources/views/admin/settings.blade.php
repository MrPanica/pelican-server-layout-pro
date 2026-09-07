<x-filament-panels::page>
    <form wire:submit.prevent="saveSettings">
        {{ $this->form }}

        <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
            <x-filament::button type="submit" size="lg">
                Сохранить настройки
            </x-filament::button>
        </div>
    </form>
</x-filament-panels::page>
