/**
 * Pelican Server Layout Pro
 * Dynamic Chart Ordering, Topbar Mount & Telemetry Suite
 * Version 1.0.2
 */
(function () {
    const config = window.PelicanServerLayoutConfig || {
        hide_sidebar: true,
        side_chart_1: 'cpu',
        side_chart_2: 'memory',
        side_chart_3: 'players',
        bottom_charts: ['network', 'disk'],
        show_uptime_button: true
    };

    if (config.hide_sidebar) {
        document.body.classList.add('pelican-hide-sidebar');
    }

    // --- 1. UTILITY FUNCTIONS ---
    function formatBytes(bytes) {
        if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
        const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const idx = Math.min(i, units.length - 1);
        return (bytes / Math.pow(k, idx)).toFixed(2) + ' ' + units[idx];
    }

    function formatUptime(uptimeMs) {
        if (!uptimeMs || uptimeMs <= 0) return '0с';
        let seconds = Math.floor(uptimeMs > 100000 ? uptimeMs / 1000 : uptimeMs);
        const days = Math.floor(seconds / 86400);
        seconds %= 86400;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (days > 0) return `${days}д ${hours}ч ${minutes}м`;
        if (hours > 0) return `${hours}ч ${minutes}м`;
        if (minutes > 0) return `${minutes}м ${secs}с`;
        return `${secs}с`;
    }

    // --- 2. MOUNT POWER ACTIONS TO TOPBAR ---
    function mountPowerActions() {
        const target = document.getElementById('pelican-nav-power-actions');
        if (!target) return;

        // If target already contains button group(s), clean up any extras and exit
        const existingGroups = target.querySelectorAll('.fi-btn-group');
        if (existingGroups.length > 0) {
            for (let i = 1; i < existingGroups.length; i++) {
                existingGroups[i].remove();
            }
            return;
        }

        // Search for powerGroup outside target
        const powerGroups = document.querySelectorAll('.fi-header-actions-ctn .fi-btn-group, .fi-header .fi-btn-group, .fi-ac .fi-btn-group, .fi-page-header-actions .fi-btn-group');
        for (const pg of powerGroups) {
            if (!target.contains(pg)) {
                target.innerHTML = '';
                target.appendChild(pg);
                break;
            }
        }
    }

    // --- 3. COPY IP CHIP ---
    document.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.push-copy-ip');
        if (copyBtn) {
            const val = copyBtn.getAttribute('data-copy');
            if (val && navigator.clipboard) {
                navigator.clipboard.writeText(val).then(() => {
                    const textSpan = copyBtn.querySelector('.push-ip-text');
                    if (textSpan) {
                        const orig = textSpan.textContent;
                        textSpan.textContent = 'Скопировано!';
                        setTimeout(() => textSpan.textContent = orig, 1200);
                    }
                });
            }
        }
    });

    // --- 4. CHART TAGGING & CONFIGURABLE REORDERING ---
    function identifyChartType(widget) {
        // Exclude overview widgets explicitly
        if (widget.classList.contains('fi-wi-stats-overview') || 
            widget.querySelector('.fi-wi-stats-overview') ||
            (widget.getAttribute('wire:name') && widget.getAttribute('wire:name').includes('ServerOverview')) ||
            (widget.getAttribute('wire:name') && widget.getAttribute('wire:name').includes('ServerPlayerWidget'))) {
            return null;
        }

        // Must be a chart widget with a canvas or .fi-wi-chart
        if (!widget.querySelector('canvas') && !widget.classList.contains('fi-wi-chart')) {
            return null;
        }

        const text = (widget.textContent || '').toLowerCase();
        const heading = widget.querySelector('h2, h3, .fi-section-header-heading, .fi-header-heading');
        const hText = heading ? heading.textContent.toLowerCase() : text;

        if (hText.includes('cpu') || text.includes('процессор')) return 'cpu';
        if (hText.includes('memory') || text.includes('память') || text.includes('ram')) return 'memory';
        if (hText.includes('игрок') || hText.includes('player') || text.includes('онлайн')) return 'players';
        if (hText.includes('network') || hText.includes('сеть') || text.includes('трафик')) return 'network';
        if (hText.includes('диск') || hText.includes('disk')) return 'disk';
        return null;
    }

    function organizeCharts() {
        const grid = document.querySelector('.fi-console-page .fi-wi.fi-grid') || document.querySelector('.fi-wi.fi-grid');
        if (!grid) return;

        // Hide overview widgets completely
        grid.querySelectorAll('.fi-wi-stats-overview, [wire\\:name*="ServerOverview"], [wire\\:name*="ServerPlayerWidget"]').forEach(ov => {
            ov.style.setProperty('display', 'none', 'important');
        });

        let bottomRow = document.getElementById('pelican-bottom-charts-row');
        if (!bottomRow) {
            bottomRow = document.createElement('div');
            bottomRow.id = 'pelican-bottom-charts-row';
            bottomRow.className = 'pelican-bottom-charts-row';
            grid.appendChild(bottomRow);
        }

        const widgets = Array.from(grid.children).filter(c => {
            return !c.querySelector('#terminal') &&
                   !c.classList.contains('fi-wi-server-layout-pro-header') &&
                   !c.querySelector('.pelican-unified-server-header') &&
                   !c.classList.contains('fi-wi-stats-overview') &&
                   c.id !== 'pelican-bottom-charts-row';
        });

        const chartsByType = {};
        widgets.forEach(w => {
            const type = identifyChartType(w);
            if (type) {
                chartsByType[type] = w;
                w.setAttribute('data-chart-type', type);
            }
        });

        Array.from(bottomRow.children).forEach(w => {
            const type = identifyChartType(w);
            if (type) {
                if (!chartsByType[type]) chartsByType[type] = w;
                w.setAttribute('data-chart-type', type);
            }
        });

        const side1 = config.side_chart_1 || 'cpu';
        const side2 = config.side_chart_2 || 'memory';
        const side3 = config.side_chart_3 || 'players';

        const sideKeys = [side1, side2, side3];

        function setSideClass(el, targetClass) {
            if (!el) return;
            if (el.parentElement === bottomRow) {
                grid.insertBefore(el, bottomRow);
            }
            ['pelican-side-chart-1', 'pelican-side-chart-2', 'pelican-side-chart-3'].forEach(c => {
                if (c !== targetClass && el.classList.contains(c)) el.classList.remove(c);
            });
            if (!el.classList.contains(targetClass)) el.classList.add(targetClass);
        }

        if (chartsByType[side1]) setSideClass(chartsByType[side1], 'pelican-side-chart-1');
        if (chartsByType[side2]) setSideClass(chartsByType[side2], 'pelican-side-chart-2');
        if (chartsByType[side3]) setSideClass(chartsByType[side3], 'pelican-side-chart-3');

        Object.keys(chartsByType).forEach(k => {
            if (!sideKeys.includes(k)) {
                const w = chartsByType[k];
                if (w && w.parentElement !== bottomRow) {
                    bottomRow.appendChild(w);
                }
            }
        });
    }

    // --- 5. TELEMETRY & LIVE UPTIME TICKER ---
    let currentUptimeMs = 0;
    let serverState = 'unknown';

    function updateTelemetry(stats) {
        if (!stats) return;

        if (stats.uptime !== undefined) {
            currentUptimeMs = stats.uptime;
        }
        if (stats.state) {
            serverState = stats.state;
            const dot = document.getElementById('pelican-server-status-dot');
            if (dot) {
                dot.className = 'push-status-dot ' + (stats.state === 'running' ? 'online' : (stats.state === 'starting' ? 'starting' : 'offline'));
            }
        }

        const elCpu = document.getElementById('pelican-header-cpu');
        if (elCpu && stats.cpu_absolute !== undefined) {
            const curText = elCpu.textContent;
            const max = curText.includes('/') ? curText.split('/')[1].trim() : '100 %';
            elCpu.textContent = `${stats.cpu_absolute.toFixed(1)} % / ${max}`;
        }

        const elRam = document.getElementById('pelican-header-ram');
        if (elRam && stats.memory_bytes !== undefined) {
            const curText = elRam.textContent;
            const max = curText.includes('/') ? curText.split('/')[1].trim() : '∞';
            elRam.textContent = `${formatBytes(stats.memory_bytes)} / ${max}`;
        }

        const elDisk = document.getElementById('pelican-header-disk');
        if (elDisk && stats.disk_bytes !== undefined) {
            const curText = elDisk.textContent;
            const max = curText.includes('/') ? curText.split('/')[1].trim() : '∞';
            elDisk.textContent = `${formatBytes(stats.disk_bytes)} / ${max}`;
        }

        renderUptimeText();
    }

    function renderUptimeText() {
        if (!config.show_uptime_button) return;

        const startBtn = document.querySelector('#pelican-nav-power-actions .fi-btn-group button:first-child, .fi-btn-group button:first-child');
        if (!startBtn) return;

        let uptimeSpan = startBtn.querySelector('.pelican-btn-uptime');
        if (!uptimeSpan) {
            uptimeSpan = document.createElement('span');
            uptimeSpan.className = 'pelican-btn-uptime';
            startBtn.appendChild(uptimeSpan);
        }

        if (currentUptimeMs > 0) {
            const str = formatUptime(currentUptimeMs);
            uptimeSpan.textContent = ` (${str})`;
        } else {
            uptimeSpan.textContent = '';
        }
    }

    // Local second ticker so uptime counts up smoothly
    setInterval(() => {
        if (serverState === 'running' && currentUptimeMs > 0) {
            currentUptimeMs += 1000;
            renderUptimeText();
        }
    }, 1000);

    // --- 6. WEBSOCKET LISTENER ---
    function hookConsoleSocket() {
        const ws = window._pelicanConsoleSocket;
        if (ws && !ws._layoutHooked) {
            ws._layoutHooked = true;
            ws.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.event === 'stats' && data.args && data.args[0]) {
                        const stats = (typeof data.args[0] === 'string') ? JSON.parse(data.args[0]) : data.args[0];
                        updateTelemetry(stats);
                    } else if (data.event === 'status' && data.args) {
                        if (stats) stats.state = data.args[0];
                        serverState = data.args[0];
                        const dot = document.getElementById('pelican-server-status-dot');
                        if (dot) {
                            dot.className = 'push-status-dot ' + (serverState === 'running' ? 'online' : (serverState === 'starting' ? 'starting' : 'offline'));
                        }
                    }
                } catch (e) {}
            });
        }
    }

    window.addEventListener('pelican:server-stats', (e) => {
        updateTelemetry(e.detail);
    });

    // --- 7. INITIALIZATION & RECOVERY ---
    function init() {
        mountPowerActions();
        organizeCharts();
        hookConsoleSocket();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    setInterval(init, 1000);

    document.addEventListener('livewire:initialized', () => {
        if (window.Livewire && window.Livewire.hook) {
            window.Livewire.hook('morph.updated', () => {
                mountPowerActions();
                organizeCharts();
            });
        }
    });
    if (window.Livewire && window.Livewire.hook) {
        try {
            window.Livewire.hook('morph.updated', () => {
                mountPowerActions();
                organizeCharts();
            });
        } catch (e) {}
    }
})();
