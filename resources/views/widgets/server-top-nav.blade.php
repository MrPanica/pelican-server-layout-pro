<x-filament-widgets::widget class="fi-wi-server-layout-pro-header">
    <div class="pelican-unified-server-header" 
         x-data="{ open: false, showPlayersModal: false }" 
         @keydown.escape.window="showPlayersModal = false; open = false">
        
        <!-- Top Row: Left (Identity & Server Meta Chips) & Right (Live Resources + Power Actions) -->
        <div class="push-top-row">
            <div class="push-identity">
                <!-- Dropdown server selector with Alpine.js -->
                <div class="push-server-select-wrap" @click.outside="open = false">
                    <button type="button" class="push-server-select-btn" @click="open = !open" title="{{ __('server-layout-pro::messages.switch_server') }}">
                        <span class="push-status-dot {{ $serverStatus === 'online' ? 'online' : ($serverStatus === 'starting' ? 'starting' : 'offline') }}" id="pelican-server-status-dot"></span>
                        <span class="push-server-name">{{ $server?->name }}</span>
                        <span class="push-server-chevron">▾</span>
                    </button>
                    @if(!empty($serversByNode) && count($serversByNode) > 0)
                        <div class="push-server-dropdown-menu" x-show="open" x-cloak style="display: none;">
                            <div class="push-dropdown-header">
                                <span>{{ __('server-layout-pro::messages.available_servers') }} ({{ count($accessibleServers) }})</span>
                            </div>
                            <div class="push-dropdown-scrollable">
                                @foreach($serversByNode as $nodeGroup)
                                    <div class="push-dropdown-node-group">
                                        <div class="push-dropdown-node-header">
                                            <span class="push-node-badge">
                                                <svg class="push-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
                                                {{ __('server-layout-pro::messages.node') }}: {{ $nodeGroup['name'] }}
                                            </span>
                                            <span class="push-node-count">{{ count($nodeGroup['servers']) }} {{ __('server-layout-pro::messages.servers_abbr') }}</span>
                                        </div>
                                        <div class="push-dropdown-list">
                                            @foreach($nodeGroup['servers'] as $s)
                                                <a href="/server/{{ $s['uuid_short'] }}/console" 
                                                   class="push-server-dropdown-item {{ $s['is_current'] ? 'active' : '' }}"
                                                   title="{{ $s['name'] }} ({{ $s['ip'] ?? '' }})">
                                                    <span class="push-server-item-dot {{ $s['status'] }}"></span>
                                                    <span class="push-server-item-name">{{ $s['name'] }}</span>
                                                    @if(!empty($s['ip']))
                                                        <span class="push-server-item-ip">{{ $s['ip'] }}</span>
                                                    @endif
                                                    @if($s['is_current'])
                                                        <span class="push-server-item-badge">{{ __('server-layout-pro::messages.current') }}</span>
                                                    @endif
                                                </a>
                                            @endforeach
                                        </div>
                                    </div>
                                @endforeach
                            </div>
                        </div>
                    @endif
                </div>

                <!-- IP Chip with Copy -->
                @if($ip)
                    <button type="button" class="push-chip push-copy-ip" data-copy="{{ $ip }}" title="{{ __('server-layout-pro::messages.click_copy_ip') }}">
                        <span class="push-chip-icon">
                            <svg class="push-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        </span>
                        <span class="push-ip-text">{{ $ip }}</span>
                        <span class="push-copy-icon">
                            <svg class="push-svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </span>
                    </button>
                @endif

                <!-- Node Chip with Icon and Label -->
                @if(!empty($nodeName))
                    <span class="push-chip push-node-chip" title="{{ __('server-layout-pro::messages.server_node') }}: {{ $nodeName }}">
                        <span class="push-chip-icon">
                            <svg class="push-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
                        </span>
                        <span class="push-node-text">{{ $nodeName }}</span>
                    </span>
                @endif

                <!-- Current Map Chip -->
                @if(!empty($currentMap) && $currentMap !== '—')
                    <span class="push-chip push-map-chip" title="{{ __('server-layout-pro::messages.current_map') }}: {{ $currentMap }}">
                        <span class="push-chip-icon">
                            <svg class="push-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
                        </span>
                        <span class="push-map-text">{{ $currentMap }}</span>
                    </span>
                @endif

                <!-- Live Players Count Chip (Clickable -> Opens Modal) -->
                @if($isQueryOnline)
                    <button type="button" 
                            class="push-chip push-players-chip" 
                            @click="showPlayersModal = true" 
                            title="{{ __('server-layout-pro::messages.players_online_tooltip') }}">
                        <span class="push-chip-icon">
                            <svg class="push-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </span>
                        <span class="push-players-text">{{ $playerCount }} / {{ $maxPlayers }}</span>
                    </button>
                @endif
            </div>

            <!-- Right side of Top Row: Live Indicators + Power Actions -->
            <div class="push-top-right">
                <div class="push-resources">
                    <div class="push-res-item" title="{{ __('server-layout-pro::messages.cpu_usage') }}">
                        <span class="push-res-label">CPU</span>
                        <span class="push-res-val" id="pelican-header-cpu">{{ $curCpu }} / {{ $maxCpu }}</span>
                    </div>
                    <div class="push-res-item" title="{{ __('server-layout-pro::messages.memory_usage') }}">
                        <span class="push-res-label">RAM</span>
                        <span class="push-res-val" id="pelican-header-ram">{{ $curRam }} / {{ $maxMem }}</span>
                    </div>
                    <div class="push-res-item" title="{{ __('server-layout-pro::messages.disk_usage') }}">
                        <span class="push-res-label">{{ __('server-layout-pro::messages.disk') }}</span>
                        <span class="push-res-val" id="pelican-header-disk">{{ $curDisk }} / {{ $maxDisk }}</span>
                    </div>
                </div>

                <!-- Slot for power action buttons (Start, Restart, Stop) -->
                <div class="push-nav-power-actions" id="pelican-nav-power-actions" wire:ignore></div>
            </div>
        </div>

        <!-- Bottom Row: Dynamic Navigation Tabs -->
        <div class="push-nav-row">
            <div class="push-nav-tabs">
                @if(!empty($navItems))
                    @foreach($navItems as $item)
                        <a href="{{ $item['url'] }}" class="push-nav-link {{ $item['isActive'] ? 'active' : '' }}">
                            @if(!empty($item['icon']))
                                <x-filament::icon :icon="$item['icon']" class="push-nav-icon" />
                            @endif
                            <span>{{ $item['label'] }}</span>
                            @if(filled($item['badge']))
                                <span class="push-nav-badge">{{ $item['badge'] }}</span>
                            @endif
                        </a>
                    @endforeach
                @endif
            </div>
        </div>

        <!-- Live Players Modal Window -->
        <div class="push-modal-backdrop" 
             x-show="showPlayersModal" 
             x-cloak 
             style="display: none;"
             @click.self="showPlayersModal = false">
            <div class="push-modal-window">
                <div class="push-modal-header">
                    <div class="push-modal-title">
                        <span class="push-modal-icon">
                            <svg class="push-svg-modal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </span>
                        <div>
                            <h3>{{ __('server-layout-pro::messages.players_online') }} — {{ $server->name }}</h3>
                            <div class="push-modal-subtitle">
                                <span><strong>{{ __('server-layout-pro::messages.map') }}:</strong> {{ $currentMap }}</span>
                                @if($ip)
                                    <span style="margin-left: 10px;"><strong>{{ __('server-layout-pro::messages.address') }}:</strong> {{ $ip }}</span>
                                @endif
                            </div>
                        </div>
                    </div>
                    <div class="push-modal-actions">
                        <button type="button" 
                                class="push-modal-refresh-btn" 
                                wire:click="refreshServerQuery" 
                                title="{{ __('server-layout-pro::messages.refresh_players') }}">
                            <svg class="push-svg-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                            {{ __('server-layout-pro::messages.refresh') }}
                        </button>
                        <button type="button" 
                                class="push-modal-close-btn" 
                                @click="showPlayersModal = false" 
                                title="{{ __('server-layout-pro::messages.close') }}">
                            &times;
                        </button>
                    </div>
                </div>

                <div class="push-modal-body">
                    @if(!empty($playersList) && count($playersList) > 0)
                        <div class="push-modal-table-wrap">
                            <table class="push-modal-table">
                                <thead>
                                    <tr>
                                        <th style="width: 45px; text-align: center;">#</th>
                                        <th>{{ __('server-layout-pro::messages.player_nickname') }}</th>
                                        <th style="width: 100px; text-align: right;">{{ __('server-layout-pro::messages.score') }}</th>
                                        <th style="width: 130px; text-align: right;">{{ __('server-layout-pro::messages.time_in_game') }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach($playersList as $idx => $player)
                                        <tr>
                                            <td style="text-align: center;" class="push-td-muted">{{ $idx + 1 }}</td>
                                            <td class="push-td-name">{{ $player['name'] }}</td>
                                            <td style="text-align: right;" class="push-td-frags">{{ $player['frags'] }}</td>
                                            <td style="text-align: right;" class="push-td-time">{{ $player['time_formatted'] }}</td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                        <div class="push-modal-footer-stats">
                            {{ __('server-layout-pro::messages.total_players_online') }}: <strong>{{ count($playersList) }}</strong> {{ __('server-layout-pro::messages.of') }} <strong>{{ $maxPlayers }}</strong>
                        </div>
                    @else
                        <div class="push-modal-empty">
                            <span class="push-empty-svg-wrap">
                                <svg class="push-empty-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" x2="17" y1="11" y2="11"/></svg>
                            </span>
                            <h4>{{ __('server-layout-pro::messages.no_players') }}</h4>
                            <p>{{ __('server-layout-pro::messages.no_players_desc') }}</p>
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </div>
</x-filament-widgets::widget>
