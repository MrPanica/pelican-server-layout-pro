/**
 * Pelican Server Layout Pro
 * Dynamic Chart Ordering, Topbar Mount & Telemetry Suite
 * Version 1.0.3
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

    const i18n = window.PelicanServerLayoutI18n || {};
    function __(key, fallback) {
        return (i18n && typeof i18n[key] === 'string') ? i18n[key] : fallback;
    }

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
        const uD = __('unit_day', 'д');
        const uH = __('unit_hour', 'ч');
        const uM = __('unit_min', 'м');
        const uS = __('unit_sec', 'с');

        if (!uptimeMs || uptimeMs <= 0) return `0${uS}`;
        let seconds = Math.floor(uptimeMs >= 1000 ? uptimeMs / 1000 : uptimeMs);
        const days = Math.floor(seconds / 86400);
        seconds %= 86400;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (days > 0) return `${days}${uD} ${hours}${uH} ${minutes}${uM}`;
        if (hours > 0) return `${hours}${uH} ${minutes}${uM}`;
        if (minutes > 0) return `${minutes}${uM} ${secs}${uS}`;
        return `${secs}${uS}`;
    }

    function isConsolePage() {
        return !!document.querySelector('.fi-console-page') ||
               window.location.pathname.endsWith('/console') ||
               window.location.pathname.includes('/console/');
    }

    // --- 2. MOUNT POWER ACTIONS TO TOPBAR ---
    function mountPowerActions() {
        if (!isConsolePage()) return;
        const target = document.getElementById("pelican-nav-power-actions");
        if (!target) return;

        // Find the real power button group rendered on the Console page
        const realGroup = document.querySelector(".fi-header .fi-btn-group, .fi-page-header-actions .fi-btn-group, .fi-header-actions-ctn .fi-btn-group");
        if (!realGroup || target.contains(realGroup)) {
            return;
        }

        const realButtons = Array.from(realGroup.querySelectorAll("button"));
        if (realButtons.length === 0) return;

        // Ensure real header buttons never retain an uptime badge
        realButtons.forEach(btn => {
            btn.querySelectorAll('.pelican-btn-uptime').forEach(el => el.remove());
        });

        // Reconcile proxy button group
        let proxyGroup = target.querySelector(".fi-btn-group-proxy");
        if (!proxyGroup) {
            target.innerHTML = "";
            proxyGroup = document.createElement("div");
            proxyGroup.className = "fi-btn-group fi-btn-group-proxy";
            target.appendChild(proxyGroup);
        }

        realButtons.forEach((realBtn, index) => {
            let proxyBtn = proxyGroup.querySelector(`[data-proxy-idx="${index}"]`);
            if (!proxyBtn) {
                proxyBtn = document.createElement("button");
                proxyBtn.type = "button";
                proxyBtn.setAttribute("data-proxy-idx", index);

                // Prevent Livewire event bubbling to the widget; forward to real Page action button
                proxyBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!realBtn.disabled) {
                        realBtn.click();
                    }
                });

                proxyGroup.appendChild(proxyBtn);
            }

            // Synchronize visual state
            proxyBtn.className = realBtn.className;
            proxyBtn.disabled = realBtn.disabled;
            if (realBtn.hasAttribute("style")) {
                proxyBtn.setAttribute("style", realBtn.getAttribute("style"));
            } else {
                proxyBtn.removeAttribute("style");
            }
            if (realBtn.title) {
                proxyBtn.title = realBtn.title;
            }

            // Clean HTML of realBtn (defensively strip any uptime span)
            let cleanHtml = realBtn.innerHTML;
            if (cleanHtml.includes('pelican-btn-uptime')) {
                const temp = document.createElement('div');
                temp.innerHTML = cleanHtml;
                temp.querySelectorAll('.pelican-btn-uptime').forEach(el => el.remove());
                cleanHtml = temp.innerHTML;
            }

            // Only update innerHTML when realBtn HTML actually changes
            // This prevents destroying the DOM and detaching the uptime badge every 1000ms
            if (proxyBtn._lastCleanHtml !== cleanHtml) {
                proxyBtn._lastCleanHtml = cleanHtml;
                proxyBtn.innerHTML = cleanHtml;
                if (index === 0 && config.show_uptime_button) {
                    renderUptimeText();
                }
            }

            // Strip wire:* attributes from proxy so Livewire never captures it
            for (const attr of Array.from(proxyBtn.attributes)) {
                if (attr.name.startsWith("wire:")) {
                    proxyBtn.removeAttribute(attr.name);
                }
            }
        });

        // Remove extra proxies if button count decreased
        const existingProxies = proxyGroup.querySelectorAll("[data-proxy-idx]");
        existingProxies.forEach(p => {
            const idx = parseInt(p.getAttribute("data-proxy-idx"), 10);
            if (idx >= realButtons.length) {
                p.remove();
            }
        });
    }

    // --- 2.1 DROPDOWN & MODAL MOUSE WHEEL SCROLLING ---
    window.addEventListener('wheel', (e) => {
        const scrollable = e.target.closest('.push-dropdown-scrollable, .push-modal-window');
        if (scrollable) {
            const target = scrollable.classList.contains('push-dropdown-scrollable')
                ? scrollable
                : (scrollable.querySelector('.push-dropdown-scrollable') || scrollable);
            if (target && target.scrollHeight > target.clientHeight) {
                target.scrollTop += e.deltaY;
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, { passive: false, capture: true });

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
                        textSpan.textContent = __('copied', 'Скопировано!');
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
        if (!isConsolePage()) return;
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

    // --- 4.1 ENSURE TOOLTIPS ON ALL CHARTS ---
    function ensureChartTooltips() {
        if (!isConsolePage()) return;
        if (typeof Chart === 'undefined') return;
        document.querySelectorAll('.fi-console-page canvas, .fi-wi-chart canvas, .fi-section canvas').forEach(canvas => {
            if (canvas.id === 'terminal' || canvas.id === 'pm-history-chart-canvas') return;
            const chart = (typeof Chart.getChart === 'function') ? Chart.getChart(canvas) : null;
            if (chart && chart.options && chart.options.plugins) {
                if (!chart.options.plugins.tooltip || chart.options.plugins.tooltip.enabled === false) {
                    chart.options.plugins.tooltip = chart.options.plugins.tooltip || {};
                    chart.options.plugins.tooltip.enabled = true;
                    chart.options.plugins.tooltip.mode = 'index';
                    chart.options.plugins.tooltip.intersect = false;
                    chart.update('none');
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

        // Clean up real buttons so they never retain any badge
        const realGroup = document.querySelector(".fi-header .fi-btn-group, .fi-page-header-actions .fi-btn-group, .fi-header-actions-ctn .fi-btn-group");
        if (realGroup) {
            realGroup.querySelectorAll('.pelican-btn-uptime').forEach(el => el.remove());
        }

        // Target proxy start button explicitly (first button in topbar group)
        const proxyBtn = document.querySelector('#pelican-nav-power-actions .fi-btn-group-proxy button[data-proxy-idx="0"], #pelican-nav-power-actions .fi-btn-group button:first-child');
        const startBtn = proxyBtn || (realGroup ? realGroup.querySelector('button:first-child') : null);
        if (!startBtn) return;

        let uptimeSpan = startBtn.querySelector('.pelican-btn-uptime');
        if (!uptimeSpan) {
            uptimeSpan = document.createElement('span');
            uptimeSpan.className = 'pelican-btn-uptime';
            uptimeSpan.style.marginLeft = '4px';
            uptimeSpan.style.opacity = '0.9';
            uptimeSpan.style.fontSize = '0.85em';
            startBtn.appendChild(uptimeSpan);
        }

        if (currentUptimeMs > 0 && serverState !== 'offline' && serverState !== 'stopped') {
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
        if (!isConsolePage()) return;
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
        ensureChartTooltips();
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
                ensureChartTooltips();
            });
        }
    });
    if (window.Livewire && window.Livewire.hook) {
        try {
            window.Livewire.hook('morph.updated', () => {
                mountPowerActions();
                organizeCharts();
                ensureChartTooltips();
            });
        } catch (e) {}
    }
})();
