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

    function applyHideSidebarClass() {
        if (config.hide_sidebar) {
            document.documentElement.classList.add('pelican-hide-sidebar');
            if (document.body) {
                document.body.classList.add('pelican-hide-sidebar');
            }
        }
    }

    applyHideSidebarClass();

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

                // Prevent Livewire event bubbling to the widget; forward dynamically to current real button
                proxyBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const currentRealGroup = document.querySelector(".fi-header .fi-btn-group, .fi-page-header-actions .fi-btn-group, .fi-header-actions-ctn .fi-btn-group");
                    if (!currentRealGroup) return;

                    const currentRealButtons = Array.from(currentRealGroup.querySelectorAll("button"));
                    const myIdx = parseInt(proxyBtn.getAttribute("data-proxy-idx"), 10);
                    const act = proxyBtn.getAttribute("data-action-name");

                    let targetBtn = null;
                    if (act) {
                        targetBtn = currentRealButtons.find(b => {
                            const wc = b.getAttribute("wire:click") || b.getAttribute("wire:target") || "";
                            return wc.includes(`mountAction('${act}'`);
                        });
                    }

                    if (!targetBtn) {
                        targetBtn = currentRealButtons[myIdx];
                    }

                    if (targetBtn && !targetBtn.disabled) {
                        if (act === 'restart' || act === 'stop') {
                            window.dispatchEvent(new CustomEvent('pelican-confirm-action', {
                                detail: { action: act, targetBtn: targetBtn }
                            }));
                            return;
                        }
                        targetBtn.click();
                    }
                });

                proxyGroup.appendChild(proxyBtn);
            }

            // Detect action name from wire:click or wire:target (e.g. 'start', 'restart', 'stop', 'kill')
            const wireAttr = realBtn.getAttribute("wire:click") || realBtn.getAttribute("wire:target") || "";
            const matchAct = wireAttr.match(/mountAction\('([^']+)'/);
            if (matchAct && matchAct[1]) {
                proxyBtn.setAttribute("data-action-name", matchAct[1]);
            } else {
                proxyBtn.removeAttribute("data-action-name");
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
        const menu = (e.target && typeof e.target.closest === 'function')
            ? e.target.closest('.push-server-dropdown-menu, .push-server-select-wrap, .push-modal-window')
            : null;
        if (menu) {
            const target = menu.classList.contains('push-dropdown-scrollable')
                ? menu
                : (menu.querySelector('.push-dropdown-scrollable') || menu);
            if (target && target.scrollHeight > target.clientHeight) {
                target.scrollTop += e.deltaY;
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, { passive: false, capture: true });

    // --- 3. COPY IP CHIP ---
    document.addEventListener('click', (e) => {
        const copyBtn = (e.target && typeof e.target.closest === 'function')
            ? e.target.closest('.push-copy-ip')
            : null;
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

    // --- 4. CHART TAGGING & IN-PLACE GRID POSITIONING ---
    function identifyChartType(widget) {
        if (!widget) return null;

        // Exclude overview widgets explicitly
        if (widget.classList.contains('fi-wi-stats-overview') || 
            widget.querySelector('.fi-wi-stats-overview') ||
            (widget.getAttribute('wire:name') && widget.getAttribute('wire:name').includes('ServerOverview')) ||
            (widget.getAttribute('wire:name') && widget.getAttribute('wire:name').includes('ServerPlayerWidget'))) {
            return null;
        }

        const wireKey = (widget.getAttribute('wire:key') || widget.getAttribute('wire:id') || widget.getAttribute('wire:name') || widget.className || '').toLowerCase();

        if (wireKey.includes('cpuchart') || wireKey.includes('servercpu')) return 'cpu';
        if (wireKey.includes('memorychart') || wireKey.includes('servermemory')) return 'memory';
        if (wireKey.includes('networkchart') || wireKey.includes('servernetwork')) return 'network';
        if (wireKey.includes('diskchart') || wireKey.includes('serverdisk')) return 'disk';
        if (wireKey.includes('playerschart') || wireKey.includes('serverplayers')) return 'players';

        // Fallback to text inspection if wire:key not matched
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

    let isOrganizing = false;
    let organizeRaf = null;

    function scheduleOrganizeCharts() {
        if (organizeRaf) return;
        organizeRaf = requestAnimationFrame(() => {
            organizeRaf = null;
            organizeCharts();
            mountPowerActions();
            ensureChartTooltips();
        });
    }

    function organizeCharts() {
        if (!isConsolePage()) return;
        if (isOrganizing) return;
        isOrganizing = true;

        try {
            const grid = document.querySelector('.fi-console-page .fi-wi.fi-grid') || document.querySelector('.fi-wi.fi-grid');
            if (!grid) return;

            // Hide overview widgets completely
            grid.querySelectorAll('.fi-wi-stats-overview, [wire\\:name*="ServerOverview"], [wire\\:name*="ServerPlayerWidget"]').forEach(ov => {
                if (ov.style.display !== 'none') {
                    ov.style.setProperty('display', 'none', 'important');
                }
            });

            const widgets = Array.from(grid.children).filter(c => {
                return !c.querySelector('#terminal') &&
                       !c.classList.contains('fi-wi-server-layout-pro-header') &&
                       !c.querySelector('.pelican-unified-server-header') &&
                       !c.classList.contains('fi-wi-stats-overview');
            });

            widgets.forEach(w => {
                const type = identifyChartType(w);
                if (type && w.getAttribute('data-chart-type') !== type) {
                    w.setAttribute('data-chart-type', type);
                }
            });

            const side1 = config.side_chart_1 || 'cpu';
            const side2 = config.side_chart_2 || 'memory';
            const side3 = config.side_chart_3 || 'players';

            const sideMap = {
                [side1]: 'pelican-side-chart-1',
                [side2]: 'pelican-side-chart-2',
                [side3]: 'pelican-side-chart-3',
            };

            let bottomIdx = 1;
            widgets.forEach(w => {
                const type = w.getAttribute('data-chart-type');
                if (!type) return;

                if (sideMap[type]) {
                    const targetCls = sideMap[type];
                    if (!w.classList.contains(targetCls)) {
                        w.classList.remove('pelican-side-chart-1', 'pelican-side-chart-2', 'pelican-side-chart-3', 'pelican-bottom-chart', 'pelican-bottom-chart-1', 'pelican-bottom-chart-2');
                        w.classList.add(targetCls);
                    }
                } else {
                    const targetCls = `pelican-bottom-chart-${bottomIdx}`;
                    if (!w.classList.contains(targetCls)) {
                        w.classList.remove('pelican-side-chart-1', 'pelican-side-chart-2', 'pelican-side-chart-3', 'pelican-bottom-chart', 'pelican-bottom-chart-1', 'pelican-bottom-chart-2');
                        w.classList.add('pelican-bottom-chart', targetCls);
                    }
                    bottomIdx++;
                }
            });
        } finally {
            isOrganizing = false;
        }
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
    function setupLivewireHooks() {
        if (!window.Livewire || !window.Livewire.hook || window._pelicanLayoutLivewireHooked) return;
        window._pelicanLayoutLivewireHooked = true;
        try {
            window.Livewire.hook('commit', ({ succeed }) => {
                succeed(() => {
                    scheduleOrganizeCharts();
                });
            });
            window.Livewire.hook('morph.updated', () => {
                scheduleOrganizeCharts();
            });
        } catch (e) {}
    }

    function init() {
        applyHideSidebarClass();
        mountPowerActions();
        scheduleOrganizeCharts();
        setupLivewireHooks();
        hookConsoleSocket();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    setInterval(init, 1000);

    document.addEventListener('livewire:navigating', () => {
        applyHideSidebarClass();
    });

    document.addEventListener('livewire:navigated', () => {
        applyHideSidebarClass();
        init();
    });

    document.addEventListener('livewire:initialized', () => {
        setupLivewireHooks();
        init();
    });
    setupLivewireHooks();
})();
