<?php

namespace Artur\PelicanServerLayoutPro\Filament\Server\Widgets;

use App\Models\Server;
use Artur\PelicanServerLayoutPro\Services\SourceQueryService;
use Filament\Facades\Filament;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Auth;

class ServerTopNavWidget extends Widget
{
    protected static ?int $sort = -100;

    protected string $view = 'server-layout-pro::widgets.server-top-nav';

    protected int|string|array $columnSpan = 'full';

    public function getColumnSpan(): int|string|array
    {
        return 'full';
    }

    public static function canView(): bool
    {
        return Filament::getTenant() instanceof Server;
    }

    private function formatBytes(float|int $bytes): string
    {
        if ($bytes <= 0) return '0 B';
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = (int) floor(log($bytes, 1024));
        return round($bytes / pow(1024, $i), 1) . ' ' . $units[$i];
    }

    private function getServerQuery(Server $server): array
    {
        return SourceQueryService::queryCached($server);
    }

    public function refreshServerQuery(): void
    {
        /** @var Server|null $server */
        $server = Filament::getTenant();
        if ($server) {
            cache()->forget("pelican_srv_query_{$server->id}");
        }
    }

    
    public function mountAction(string $name, array $arguments = [], array $context = []): mixed
    {
        if (in_array($name, ['start', 'restart', 'stop', 'kill'])) {
            /** @var Server|null $server */
            $server = \Filament\Facades\Filament::getTenant();
            if ($server instanceof Server) {
                $user = \Filament\Facades\Filament::auth()->user() ?? \Illuminate\Support\Facades\Auth::user();
                $permission = match ($name) {
                    'start' => \App\Enums\SubuserPermission::ControlStart,
                    'restart' => \App\Enums\SubuserPermission::ControlRestart,
                    'stop', 'kill' => \App\Enums\SubuserPermission::ControlStop,
                    default => null,
                };
                if (!$permission || $user?->can($permission, $server)) {
                    $this->dispatch('setServerState', uuid: $server->uuid, state: $name);
                }
            }
        }
        return null;
    }

    protected function getViewData(): array
    {
        /** @var Server|null $server */
        $server = Filament::getTenant();
        if (!$server) {
            return [];
        }

        $user = Filament::auth()->user() ?? Auth::user();
        $accessibleServers = [];
        if ($user) {
            if ($user->hasRole('Root Admin')) {
                $accessibleServers = Server::with(['node', 'allocation'])->orderBy('name')->get();
            } else {
                $accessibleServers = $user->accessibleServers()->with(['node', 'allocation'])->orderBy('name')->get();
            }
        }

        // Group servers by Node
        $groupedNodes = [];
        foreach ($accessibleServers as $srv) {
            $nodeId = $srv->node_id ?? 0;
            $nodeName = $srv->node?->name ?? 'Без ноды';
            if (!isset($groupedNodes[$nodeId])) {
                $groupedNodes[$nodeId] = [
                    'id' => $nodeId,
                    'name' => $nodeName,
                    'servers' => [],
                ];
            }

            $srvStatus = 'offline';
            try {
                if (!$srv->isSuspended() && !$srv->isInConflictState()) {
                    $cs = $srv->retrieveStatus();
                    if (!$cs->isOffline()) {
                        $srvStatus = ($cs->value === 'starting') ? 'starting' : 'online';
                    }
                }
            } catch (\Throwable $e) {
                $srvStatus = 'offline';
            }

            $groupedNodes[$nodeId]['servers'][] = [
                'id' => $srv->id,
                'name' => $srv->name,
                'uuid_short' => $srv->uuidShort ?? $srv->uuid_short ?? substr($srv->uuid, 0, 8),
                'status' => $srvStatus,
                'is_current' => ($srv->id === $server->id),
                'ip' => $srv->allocation ? (($srv->allocation->alias ?: $srv->allocation->ip) . ':' . $srv->allocation->port) : null,
            ];
        }

        // Sort nodes by ID ascending
        ksort($groupedNodes);
        $serversByNode = array_values($groupedNodes);

        $ip = null;
        if ($server->allocation) {
            $ip = ($server->allocation->alias ?: $server->allocation->ip) . ':' . $server->allocation->port;
        }

        $navItems = [];
        try {
            $panel = Filament::getCurrentPanel();
            if ($panel) {
                $rawItems = $panel->getNavigation();
                $flatItems = [];
                foreach ($rawItems as $group) {
                    if (is_array($group)) {
                        foreach ($group as $it) {
                            $flatItems[] = $it;
                        }
                    } elseif ($group instanceof \Filament\Navigation\NavigationGroup) {
                        foreach ($group->getItems() as $it) {
                            $flatItems[] = $it;
                        }
                    } elseif ($group instanceof \Filament\Navigation\NavigationItem) {
                        $flatItems[] = $group;
                    }
                }

                foreach ($flatItems as $item) {
                    if (!$item->isVisible()) {
                        continue;
                    }
                    $navItems[] = [
                        'label' => $item->getLabel(),
                        'url' => $item->getUrl(),
                        'isActive' => $item->isActive(),
                        'icon' => $item->getIcon(),
                        'badge' => $item->getBadge(),
                    ];
                }
            }
        } catch (\Throwable $e) {}

        // Initial live resource stats
        $res = [];
        try {
            $res = $server->retrieveResources();
        } catch (\Throwable $e) {}

        $curCpu = isset($res['cpu_absolute']) ? (round($res['cpu_absolute'], 1) . ' %') : '0.0 %';
        $curRam = isset($res['memory_bytes']) ? $this->formatBytes($res['memory_bytes']) : '0 B';
        $curDisk = isset($res['disk_bytes']) ? $this->formatBytes($res['disk_bytes']) : '0 B';

        $maxCpu = $server->cpu > 0 ? ($server->cpu . ' %') : '100 %';
        $maxMem = $server->memory > 0 ? (round($server->memory / 1024, 2) . ' GiB') : '∞';
        $maxDisk = $server->disk > 0 ? (round($server->disk / 1024, 2) . ' GiB') : '∞';

        // Current server verified status
        $currentServerStatus = 'offline';
        try {
            if (!$server->isSuspended() && !$server->isInConflictState()) {
                $cs = $server->retrieveStatus();
                if (!$cs->isOffline()) {
                    $currentServerStatus = ($cs->value === 'starting') ? 'starting' : 'online';
                }
            }
        } catch (\Throwable $e) {
            $currentServerStatus = 'offline';
        }

        // Live server query (Map and Players)
        $queryData = $this->getServerQuery($server);

        return [
            'server' => $server,
            'accessibleServers' => $accessibleServers,
            'serversByNode' => $serversByNode,
            'ip' => $ip,
            'nodeName' => $server->node?->name ?? 'Node',
            'navItems' => $navItems,
            'curCpu' => $curCpu,
            'curRam' => $curRam,
            'curDisk' => $curDisk,
            'maxCpu' => $maxCpu,
            'maxMem' => $maxMem,
            'maxDisk' => $maxDisk,
            'serverStatus' => $currentServerStatus,
            'currentMap' => $queryData['map'],
            'playerCount' => $queryData['current_players'],
            'maxPlayers' => $queryData['max_players'],
            'playersList' => $queryData['players'],
            'isQueryOnline' => $queryData['is_online'],
        ];
    }
}
