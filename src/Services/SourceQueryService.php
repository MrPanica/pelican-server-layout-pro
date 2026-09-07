<?php

namespace Artur\PelicanServerLayoutPro\Services;

use App\Models\Server;

class SourceQueryService
{
    /**
     * Get cached query result for a server, or perform a live UDP query.
     */
    public static function queryCached(Server $server, int $ttlSeconds = 12): array
    {
        $default = [
            'is_online' => false,
            'hostname' => $server->name,
            'map' => '—',
            'folder' => 'tf',
            'game' => '—',
            'current_players' => 0,
            'max_players' => 0,
            'bots' => 0,
            'players' => [],
        ];

        try {
            if ($server->isSuspended() || $server->isInConflictState()) {
                return $default;
            }

            $ip = $server->allocation ? ($server->allocation->ip_alias ?: ($server->allocation->alias ?: $server->allocation->ip)) : null;
            $port = $server->allocation ? (int) $server->allocation->port : null;
            if (!$ip || !$port) {
                return $default;
            }

            return cache()->remember("pelican_srv_query_{$server->id}", now()->addSeconds($ttlSeconds), function () use ($server, $ip, $port, $default) {
                $data = self::query($ip, $port, 1.8);
                if ($data) {
                    cache()->put("servers.{$server->id}.players_count", (int) $data['current_players'], now()->addMinutes(2));
                    return $data;
                }

                // Fallback to egg gameQuery if present
                try {
                    $gq = $server->egg?->gameQuery;
                    if ($gq) {
                        $res = $gq->runQuery($server);
                        if ($res) {
                            $fallbackData = [
                                'is_online' => true,
                                'hostname' => $res['hostname'] ?? $server->name,
                                'map' => $res['map'] ?? '—',
                                'folder' => 'tf',
                                'game' => '—',
                                'current_players' => (int) ($res['current_players'] ?? 0),
                                'max_players' => (int) ($res['max_players'] ?? 0),
                                'bots' => 0,
                                'players' => $res['players'] ?? [],
                            ];
                            cache()->put("servers.{$server->id}.players_count", (int) $fallbackData['current_players'], now()->addMinutes(2));
                            return $fallbackData;
                        }
                    }
                } catch (\Throwable $ex) {}

                return array_merge($default, ['is_online' => true]);
            });
        } catch (\Throwable $e) {
            return $default;
        }
    }

    /**
     * Query a Source Engine server via UDP sockets (A2S_INFO & A2S_PLAYER).
     */
    public static function query(string $ip, int $port, float $timeout = 1.8): ?array
    {
        $info = self::getInfo($ip, $port, $timeout);
        if (!$info) {
            return null;
        }

        $players = self::getPlayers($ip, $port, $timeout);

        return [
            'is_online' => true,
            'hostname' => $info['name'] ?? '—',
            'map' => $info['map'] ?? '—',
            'folder' => $info['folder'] ?? 'tf',
            'game' => $info['game'] ?? '—',
            'current_players' => (int) ($info['players'] ?? count($players)),
            'max_players' => (int) ($info['max_players'] ?? 0),
            'bots' => (int) ($info['bots'] ?? 0),
            'players' => $players,
        ];
    }

    /**
     * Fetch server info via A2S_INFO protocol.
     */
    public static function getInfo(string $ip, int $port, float $timeout = 1.8): ?array
    {
        $fp = @fsockopen('udp://' . $ip, $port, $errno, $errstr, $timeout);
        if (!$fp) {
            return null;
        }

        $sec = (int) floor($timeout);
        $usec = (int) (($timeout - $sec) * 1000000);
        stream_set_timeout($fp, $sec, $usec);

        $packet = "\xFF\xFF\xFF\xFFTSource Engine Query\x00";
        @fwrite($fp, $packet);
        $res = @fread($fp, 4096);

        if (!$res || strlen($res) < 5) {
            @fclose($fp);
            return null;
        }

        // Handle challenge response (0x41 = 'A')
        if (substr($res, 0, 5) === "\xFF\xFF\xFF\xFF\x41") {
            $challenge = substr($res, 5, 4);
            @fwrite($fp, $packet . $challenge);
            $res = @fread($fp, 4096);
        }
        @fclose($fp);

        if (!$res || strlen($res) < 5 || substr($res, 0, 5) !== "\xFF\xFF\xFF\xFF\x49") {
            return null;
        }

        $offset = 5;
        $protocol = ord($res[$offset++]);

        $readString = function () use (&$offset, $res) {
            $nullPos = strpos($res, "\x00", $offset);
            if ($nullPos === false) {
                $str = substr($res, $offset);
                $offset = strlen($res);
                return $str;
            }
            $str = substr($res, $offset, $nullPos - $offset);
            $offset = $nullPos + 1;
            return $str;
        };

        $name = self::cleanString($readString());
        $map = self::cleanString($readString());
        $folder = self::cleanString($readString());
        $game = self::cleanString($readString());

        $id = 0;
        if ($offset + 2 <= strlen($res)) {
            $id = unpack('v', substr($res, $offset, 2))[1];
            $offset += 2;
        }

        $players = $offset < strlen($res) ? ord($res[$offset++]) : 0;
        $maxPlayers = $offset < strlen($res) ? ord($res[$offset++]) : 0;
        $bots = $offset < strlen($res) ? ord($res[$offset++]) : 0;

        return [
            'protocol' => $protocol,
            'name' => $name,
            'map' => $map,
            'folder' => $folder,
            'game' => $game,
            'app_id' => $id,
            'players' => $players,
            'max_players' => $maxPlayers,
            'bots' => $bots,
        ];
    }

    /**
     * Fetch player list via A2S_PLAYER protocol.
     */
    public static function getPlayers(string $ip, int $port, float $timeout = 1.8): array
    {
        $fp = @fsockopen('udp://' . $ip, $port, $errno, $errstr, $timeout);
        if (!$fp) {
            return [];
        }

        $sec = (int) floor($timeout);
        $usec = (int) (($timeout - $sec) * 1000000);
        stream_set_timeout($fp, $sec, $usec);

        // Step 1: Request challenge token (-1)
        @fwrite($fp, "\xFF\xFF\xFF\xFF\x55\xFF\xFF\xFF\xFF");
        $res = @fread($fp, 4096);

        if (!$res || strlen($res) < 9 || substr($res, 0, 5) !== "\xFF\xFF\xFF\xFF\x41") {
            @fclose($fp);
            return [];
        }

        $challenge = substr($res, 5, 4);

        // Step 2: Send request with received challenge token
        @fwrite($fp, "\xFF\xFF\xFF\xFF\x55" . $challenge);
        $res = @fread($fp, 4096);
        @fclose($fp);

        if (!$res || strlen($res) < 6 || substr($res, 0, 5) !== "\xFF\xFF\xFF\xFF\x44") {
            return [];
        }

        $offset = 5;
        $count = ord($res[$offset++]);
        $players = [];

        for ($i = 0; $i < $count && $offset < strlen($res); $i++) {
            $idx = ord($res[$offset++]);
            $nullPos = strpos($res, "\x00", $offset);
            if ($nullPos === false) {
                break;
            }
            $rawName = substr($res, $offset, $nullPos - $offset);
            $offset = $nullPos + 1;

            $score = 0;
            $duration = 0.0;
            if ($offset + 8 <= strlen($res)) {
                $score = unpack('l', substr($res, $offset, 4))[1];
                $offset += 4;
                $duration = unpack('f', substr($res, $offset, 4))[1];
                $offset += 4;
            }

            $name = self::cleanString($rawName);
            if ($name === '') {
                $name = 'Подключается...';
            }

            $durInt = max(0, (int) round($duration));
            $players[] = [
                'index' => $idx,
                'name' => $name,
                'frags' => $score,
                'score' => $score,
                'time' => $durInt,
                'duration' => $durInt,
                'time_formatted' => gmdate('H:i:s', $durInt),
            ];
        }

        // Sort by connection time descending (longest connected first)
        usort($players, fn($a, $b) => $b['time'] <=> $a['time']);

        return $players;
    }

    private static function cleanString(string $str): string
    {
        if (!mb_check_encoding($str, 'UTF-8')) {
            $str = mb_convert_encoding($str, 'UTF-8', 'ISO-8859-1, Windows-1251, ASCII');
        }
        return trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $str));
    }
}
