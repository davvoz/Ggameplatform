/**
 * CommunityStatsRenderer
 * Renders charts, infographics, and tables for the community stats section.
 * Single Responsibility: Visualization only — data comes from CommunityStatsAPI.
 * OOP, scalable, follows WalletStatsRenderer / LeaderboardRenderer patterns.
 */

class CommunityStatsRenderer {
    constructor() {
        /** @type {HTMLElement|null} */
        this.container = null;

        /** Chart color palette (reusable, extensible) */
        this.palette = [
            '#00d9ff', '#ff3d71', '#69f0ae', '#ffc107',
            '#b388ff', '#ff6e40', '#18ffff', '#eeff41',
            '#7c4dff', '#ff80ab', '#64ffda', '#ffab40'
        ];

        /** Cached data */
        this._cache = {};

        /** Active game filter */
        this.gameFilter = null;

        /** Active economy period */
        this.economyPeriod = 'daily'; // 'daily' | 'weekly' | 'historical'

        /** Animation duration (ms) */
        this.animDuration = 800;
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Mount the renderer into a container and load all data.
     * @param {HTMLElement} container
     */
    async mount(container) {
        this.container = container;
        this.container.innerHTML = this._renderSkeleton();
        await this._loadAll();
    }

    /**
     * Teardown
     */
    destroy() {
        this._cache = {};
        if (this.container) this.container.innerHTML = '';
        this.container = null;
    }

    // ========================================================================
    // Data Loading
    // ========================================================================

    /**
     * Load all sections in parallel.
     * @private
     */
    async _loadAll() {
        try {
            const [historical, gamesDaily, usersRanked, economyDaily] = await Promise.all([
                CommunityStatsAPI.getEconomyHistorical(),
                CommunityStatsAPI.getGamesDailyActivity(30),
                CommunityStatsAPI.getUsersRanked(50, 0),
                CommunityStatsAPI.getEconomyDaily(30),
            ]);

            this._cache.historical = historical;
            this._cache.gamesDaily = gamesDaily;
            this._cache.usersRanked = usersRanked;
            this._cache.economyDaily = economyDaily;

            this._renderAll();
        } catch (err) {
            console.error('[CommunityStatsRenderer] Load error:', err);
            if (this.container) {
                this.container.innerHTML = `
                    <div class="cs-error">
                        <span class="cs-error-icon">⚠️</span>
                        <p>Failed to load community stats. Please try again later.</p>
                    </div>`;
            }
        }
    }

    // ========================================================================
    // Render orchestrators
    // ========================================================================

    /** @private */
    _renderAll() {
        if (!this.container) return;

        const h = this._cache.historical;

        this.container.innerHTML = `
            ${this._renderPlatformHero(h)}
            ${this._renderGameActivitySection()}
            ${this._renderEconomySection()}
            ${this._renderUsersRankedSection()}
        `;

        // Post-render: animations + event listeners
        requestAnimationFrame(() => {
            this._initAnimations();
            this._bindEvents();
        });
    }

    // ========================================================================
    // 1. Platform Hero (KPI cards)
    // ========================================================================

    /** @private */
    _renderPlatformHero(data) {
        if (!data?.platform) return '';
        const p = data.platform;

        const kpis = [
            { icon: '👥', label: 'Registered Users', value: p.total_registered_users },
            { icon: '🎮', label: 'Total Games', value: p.total_games },
            { icon: '🕹️', label: 'Total Sessions', value: p.total_sessions },
            { icon: '⭐', label: 'XP Distributed', value: this._fmtNum(p.total_xp_distributed) },
            { icon: '🪙', label: 'Coins Earned', value: this._fmtNum(p.total_coins_earned) },
            { icon: '💸', label: 'Coins Spent', value: this._fmtNum(p.total_coins_spent) },
        ];

        return `
        <section class="cs-section cs-hero-section">
            <h3 class="cs-section-title"><span class="cs-icon">📊</span> Platform Overview</h3>
            <div class="cs-kpi-grid">
                ${kpis.map(k => `
                    <div class="cs-kpi-card cs-fade-in">
                        <span class="cs-kpi-icon">${k.icon}</span>
                        <span class="cs-kpi-value" data-target="${typeof k.value === 'number' ? k.value : 0}">${k.value}</span>
                        <span class="cs-kpi-label">${k.label}</span>
                    </div>
                `).join('')}
            </div>
        </section>`;
    }

    // ========================================================================
    // 2. Game Activity Chart (day by day)
    // ========================================================================

    /** @private */
    _renderGameActivitySection() {
        const d = this._cache.gamesDaily;
        if (!d?.data?.length) {
            return `
            <section class="cs-section">
                <h3 class="cs-section-title"><span class="cs-icon">🎮</span> Game Activity</h3>
                <div class="cs-empty">No game activity data yet.</div>
            </section>`;
        }

        // Group data by date for stacked view
        const { dateLabels, gameNames, seriesMap } = this._groupByDate(d.data);

        return `
        <section class="cs-section">
            <h3 class="cs-section-title"><span class="cs-icon">🎮</span> Game Activity <small>Last 30 days</small></h3>
            <div class="cs-chart-container cs-fade-in">
                ${this._renderBarChart(dateLabels, gameNames, seriesMap, 'sessions_count', 'Sessions')}
            </div>
            <div class="cs-chart-legend" id="csGameLegend">
                ${gameNames.map((g, i) => `
                    <span class="cs-legend-item">
                        <span class="cs-legend-dot" style="background:${this.palette[i % this.palette.length]}"></span>
                        ${this._escapeHtml(g)}
                    </span>
                `).join('')}
            </div>
            ${this._renderGameBreakdownTable()}
        </section>`;
    }

    /** @private */
    _renderGameBreakdownTable() {
        const h = this._cache.historical;
        if (!h?.games?.length) return '';

        const rows = h.games.map((g, i) => `
            <tr class="cs-fade-in" style="animation-delay:${i * 40}ms">
                <td class="cs-td-game">
                    <span class="cs-game-dot" style="background:${this.palette[i % this.palette.length]}"></span>
                    ${this._escapeHtml(g.game_title)}
                </td>
                <td>${g.total_sessions.toLocaleString()}</td>
                <td>${g.unique_players}</td>
                <td>${this._fmtNum(g.total_xp)}</td>
                <td>${g.avg_score.toLocaleString()}</td>
                <td>${this._fmtDuration(g.total_duration_seconds)}</td>
            </tr>
        `).join('');

        return `
        <div class="cs-table-wrapper cs-fade-in">
            <table class="cs-table">
                <thead>
                    <tr>
                        <th>Game</th>
                        <th>Sessions</th>
                        <th>Players</th>
                        <th>XP</th>
                        <th>Avg Score</th>
                        <th>Play Time</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    // ========================================================================
    // 3. Economy Section (XP & Coins daily / weekly / historical)
    // ========================================================================

    /** @private */
    _renderEconomySection() {
        return `
        <section class="cs-section" id="csEconomySection">
            <h3 class="cs-section-title"><span class="cs-icon">💰</span> Economy</h3>
            <div class="cs-tabs" id="csEconomyTabs">
                <button class="cs-tab active" data-period="daily">Daily</button>
                <button class="cs-tab" data-period="weekly">Weekly</button>
                <button class="cs-tab" data-period="historical">All-Time</button>
            </div>
            <div id="csEconomyContent">
                ${this._renderEconomyDailyContent()}
            </div>
        </section>`;
    }

    /** @private */
    _renderEconomyDailyContent() {
        const d = this._cache.economyDaily;
        if (!d?.data?.length) return '<div class="cs-empty">No economy data yet.</div>';

        const labels = d.data.map(r => r.date.slice(5)); // MM-DD
        const xpVals = d.data.map(r => r.total_xp || 0);
        const coinVals = d.data.map(r => r.coins_earned || 0);

        return `
        <div class="cs-economy-charts cs-fade-in">
            <div class="cs-economy-chart-box">
                <h4 class="cs-chart-title">⭐ XP Distributed / Day</h4>
                ${this._renderLineChart(labels, xpVals, '#00d9ff', 'XP')}
            </div>
            <div class="cs-economy-chart-box">
                <h4 class="cs-chart-title">🪙 Coins Earned / Day</h4>
                ${this._renderLineChart(labels, coinVals, '#ffc107', 'Coins')}
            </div>
        </div>
        ${this._renderEconomySummaryCards(d.data)}`;
    }

    /** @private */
    _renderEconomyWeeklyContent(data) {
        if (!data?.data?.length) return '<div class="cs-empty">No weekly economy data yet.</div>';

        const labels = data.data.map(r => r.week_start ? r.week_start.slice(5) : r.year_week);
        const xpVals = data.data.map(r => r.total_xp || 0);
        const coinVals = data.data.map(r => r.coins_earned || 0);

        return `
        <div class="cs-economy-charts cs-fade-in">
            <div class="cs-economy-chart-box">
                <h4 class="cs-chart-title">⭐ XP Distributed / Week</h4>
                ${this._renderLineChart(labels, xpVals, '#00d9ff', 'XP')}
            </div>
            <div class="cs-economy-chart-box">
                <h4 class="cs-chart-title">🪙 Coins Earned / Week</h4>
                ${this._renderLineChart(labels, coinVals, '#ffc107', 'Coins')}
            </div>
        </div>`;
    }

    /** @private */
    _renderEconomyHistoricalContent(data) {
        if (!data?.platform) return '<div class="cs-empty">No historical data yet.</div>';
        const p = data.platform;

        // Pie-chart data: XP per game
        const games = data.games || [];
        const totalXP = games.reduce((s, g) => s + g.total_xp, 0) || 1;

        return `
        <div class="cs-historical cs-fade-in">
            <div class="cs-historical-totals">
                <div class="cs-hist-card">
                    <span class="cs-hist-icon">⭐</span>
                    <span class="cs-hist-val">${this._fmtNum(p.total_xp_distributed)}</span>
                    <span class="cs-hist-lbl">Total XP</span>
                </div>
                <div class="cs-hist-card">
                    <span class="cs-hist-icon">🪙</span>
                    <span class="cs-hist-val">${this._fmtNum(p.total_coins_earned)}</span>
                    <span class="cs-hist-lbl">Coins Earned</span>
                </div>
                <div class="cs-hist-card">
                    <span class="cs-hist-icon">💸</span>
                    <span class="cs-hist-val">${this._fmtNum(p.total_coins_spent)}</span>
                    <span class="cs-hist-lbl">Coins Spent</span>
                </div>
                <div class="cs-hist-card">
                    <span class="cs-hist-icon">🕹️</span>
                    <span class="cs-hist-val">${p.total_sessions.toLocaleString()}</span>
                    <span class="cs-hist-lbl">Sessions</span>
                </div>
            </div>
            <h4 class="cs-chart-title">XP Distribution by Game</h4>
            <div class="cs-pie-container">
                ${this._renderPieChart(games.map(g => ({ label: g.game_title, value: g.total_xp })))}
            </div>
        </div>`;
    }

    /** @private */
    _renderEconomySummaryCards(dailyData) {
        const totalXP = dailyData.reduce((s, d) => s + (d.total_xp || 0), 0);
        const totalCoins = dailyData.reduce((s, d) => s + (d.coins_earned || 0), 0);
        const totalSessions = dailyData.reduce((s, d) => s + (d.sessions_count || 0), 0);
        const avgPlayers = dailyData.length > 0
            ? Math.round(dailyData.reduce((s, d) => s + (d.active_players || 0), 0) / dailyData.length)
            : 0;

        return `
        <div class="cs-summary-row cs-fade-in">
            <div class="cs-summary-card">
                <span class="cs-sum-val">${this._fmtNum(totalXP)}</span>
                <span class="cs-sum-lbl">XP (30d)</span>
            </div>
            <div class="cs-summary-card">
                <span class="cs-sum-val">${this._fmtNum(totalCoins)}</span>
                <span class="cs-sum-lbl">Coins (30d)</span>
            </div>
            <div class="cs-summary-card">
                <span class="cs-sum-val">${totalSessions.toLocaleString()}</span>
                <span class="cs-sum-lbl">Sessions (30d)</span>
            </div>
            <div class="cs-summary-card">
                <span class="cs-sum-val">${avgPlayers}</span>
                <span class="cs-sum-lbl">Avg Players/Day</span>
            </div>
        </div>`;
    }

    // ========================================================================
    // 4. Users Ranked Table
    // ========================================================================

    /** @private */
    _renderUsersRankedSection() {
        const d = this._cache.usersRanked;
        if (!d?.data?.length) {
            return `
            <section class="cs-section">
                <h3 class="cs-section-title"><span class="cs-icon">🏆</span> Top Players</h3>
                <div class="cs-empty">No ranked users yet.</div>
            </section>`;
        }

        const rows = d.data.map((u, i) => {
            const rankBadge = u.rank <= 3
                ? `<span class="cs-rank-medal">${['🥇','🥈','🥉'][u.rank - 1]}</span>`
                : `<span class="cs-rank-num">#${u.rank}</span>`;

            return `
            <tr class="cs-user-row cs-fade-in" style="animation-delay:${i * 30}ms" data-user-id="${u.user_id}">
                <td class="cs-td-rank">${rankBadge}</td>
                <td class="cs-td-user">
                    <div class="cs-user-cell">
                        <span class="cs-user-badge" style="color:${u.level_color}">${u.level_badge}</span>
                        <div class="cs-user-info">
                            <span class="cs-user-name">${this._escapeHtml(u.username || 'Unknown')}</span>
                            <span class="cs-user-title" style="color:${u.level_color}">Lv.${u.level} ${u.level_title}</span>
                        </div>
                    </div>
                </td>
                <td class="cs-td-xp">${this._fmtNum(u.total_xp_earned)}</td>
                <td class="cs-td-coins">🪙 ${u.coin_balance.toLocaleString()}</td>
                <td class="cs-td-games">${u.games_played} <small>(${u.unique_games} games)</small></td>
                <td class="cs-td-streak">${u.login_streak > 0 ? '🔥 ' + u.login_streak : '-'}</td>
            </tr>`;
        }).join('');

        return `
        <section class="cs-section">
            <h3 class="cs-section-title"><span class="cs-icon">🏆</span> Top Players <small>${d.total} total</small></h3>
            <div class="cs-table-wrapper cs-fade-in">
                <table class="cs-table cs-users-table">
                    <thead>
                        <tr>
                            <th class="cs-th-rank">Rank</th>
                            <th>Player</th>
                            <th>XP</th>
                            <th>Coins</th>
                            <th>Sessions</th>
                            <th>Streak</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            ${d.total > d.data.length ? `
            <div class="cs-load-more-wrap">
                <button class="cs-load-more-btn" id="csLoadMoreUsers" data-offset="${d.data.length}">
                    Load more players
                </button>
            </div>` : ''}
        </section>`;
    }

    // ========================================================================
    // Pure CSS Charts (no external libraries)
    // ========================================================================

    /**
     * Render a stacked bar chart using pure CSS.
     * @private
     */
    _renderBarChart(dateLabels, gameNames, seriesMap, valueKey, label) {
        // Find max total per date for scaling
        let maxTotal = 0;
        dateLabels.forEach(date => {
            let total = 0;
            gameNames.forEach(game => {
                total += (seriesMap[game]?.[date]?.[valueKey] || 0);
            });
            if (total > maxTotal) maxTotal = total;
        });
        if (maxTotal === 0) maxTotal = 1;

        // Show at most 15 dates (last ones)
        const visibleLabels = dateLabels.slice(-15);

        const bars = visibleLabels.map(date => {
            let total = 0;
            gameNames.forEach(game => {
                total += (seriesMap[game]?.[date]?.[valueKey] || 0);
            });

            const segments = gameNames.map((game, gi) => {
                const val = seriesMap[game]?.[date]?.[valueKey] || 0;
                const pct = (val / maxTotal) * 100;
                return `<div class="cs-bar-seg" style="height:${pct}%;background:${this.palette[gi % this.palette.length]}" title="${game}: ${val}"></div>`;
            }).join('');

            return `
            <div class="cs-bar-col">
                <div class="cs-bar-stack" style="height:100%">
                    ${segments}
                </div>
                <span class="cs-bar-label">${date.slice(5)}</span>
                <span class="cs-bar-value">${total}</span>
            </div>`;
        }).join('');

        return `<div class="cs-bar-chart">${bars}</div>`;
    }

    /**
     * Render a line/area chart using pure CSS + SVG.
     * @private
     */
    _renderLineChart(labels, values, color, label) {
        const count = values.length;
        if (count === 0) return '<div class="cs-empty">No data</div>';

        const max = Math.max(...values, 1);
        const w = 100; // viewbox width %
        const h = 60;  // viewbox height

        // Build SVG polyline
        const points = values.map((v, i) => {
            const x = count > 1 ? (i / (count - 1)) * w : w / 2;
            const y = h - (v / max) * (h - 5);
            return `${x},${y}`;
        }).join(' ');

        // Area fill
        const areaPoints = `0,${h} ${points} ${w},${h}`;

        // Tooltip dots
        const dots = values.map((v, i) => {
            const x = count > 1 ? (i / (count - 1)) * w : w / 2;
            const y = h - (v / max) * (h - 5);
            return `<circle cx="${x}" cy="${y}" r="1.2" fill="${color}" class="cs-dot">
                <title>${labels[i]}: ${typeof v === 'number' ? v.toLocaleString() : v} ${label}</title>
            </circle>`;
        }).join('');

        // X-axis labels (show subset)
        const step = Math.max(1, Math.floor(count / 7));
        const xLabels = labels.filter((_, i) => i % step === 0 || i === count - 1);
        const xLabelsHtml = xLabels.map((l, i) => {
            const idx = labels.indexOf(l);
            const x = count > 1 ? (idx / (count - 1)) * 100 : 50;
            return `<span class="cs-line-label" style="left:${x}%">${l}</span>`;
        }).join('');

        return `
        <div class="cs-line-chart">
            <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="cs-line-svg">
                <polygon points="${areaPoints}" fill="${color}" opacity="0.12"/>
                <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
                ${dots}
            </svg>
            <div class="cs-line-labels">${xLabelsHtml}</div>
        </div>`;
    }

    /**
     * Render a donut/pie chart using CSS conic-gradient.
     * @private
     */
    _renderPieChart(slices) {
        const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
        let cumPct = 0;

        const gradientStops = [];
        slices.forEach((sl, i) => {
            const pct = (sl.value / total) * 100;
            const color = this.palette[i % this.palette.length];
            gradientStops.push(`${color} ${cumPct}% ${cumPct + pct}%`);
            cumPct += pct;
        });

        const legendItems = slices.map((sl, i) => {
            const pct = ((sl.value / total) * 100).toFixed(1);
            return `
            <div class="cs-pie-legend-item">
                <span class="cs-legend-dot" style="background:${this.palette[i % this.palette.length]}"></span>
                <span class="cs-pie-legend-label">${this._escapeHtml(sl.label)}</span>
                <span class="cs-pie-legend-val">${pct}%</span>
            </div>`;
        }).join('');

        return `
        <div class="cs-pie-wrapper">
            <div class="cs-pie-donut" style="background:conic-gradient(${gradientStops.join(',')})">
                <div class="cs-pie-hole"></div>
            </div>
            <div class="cs-pie-legend">${legendItems}</div>
        </div>`;
    }

    // ========================================================================
    // Skeleton / Loading
    // ========================================================================

    /** @private */
    _renderSkeleton() {
        return `
        <div class="cs-skeleton">
            <div class="cs-skel-section">
                <div class="cs-skel-title"></div>
                <div class="cs-skel-kpis">
                    ${Array(6).fill('<div class="cs-skel-kpi"></div>').join('')}
                </div>
            </div>
            <div class="cs-skel-section">
                <div class="cs-skel-title"></div>
                <div class="cs-skel-chart"></div>
            </div>
            <div class="cs-skel-section">
                <div class="cs-skel-title"></div>
                <div class="cs-skel-rows">
                    ${Array(5).fill('<div class="cs-skel-row"></div>').join('')}
                </div>
            </div>
        </div>`;
    }

    // ========================================================================
    // Event Binding
    // ========================================================================

    /** @private */
    _bindEvents() {
        // Economy tabs
        const tabs = this.container?.querySelectorAll('#csEconomyTabs .cs-tab');
        tabs?.forEach(tab => {
            tab.addEventListener('click', () => this._handleEconomyTab(tab));
        });

        // Load more users
        const loadMoreBtn = this.container?.querySelector('#csLoadMoreUsers');
        loadMoreBtn?.addEventListener('click', () => this._handleLoadMoreUsers(loadMoreBtn));

        // User row click → navigate to profile
        const userRows = this.container?.querySelectorAll('.cs-user-row');
        userRows?.forEach(row => {
            row.addEventListener('click', () => {
                const userId = row.dataset.userId;
                if (userId) window.location.hash = `/user/${userId}`;
            });
        });
    }

    /** @private */
    async _handleEconomyTab(tab) {
        const period = tab.dataset.period;
        if (!period || period === this.economyPeriod) return;

        // Update active tab
        this.container.querySelectorAll('#csEconomyTabs .cs-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.economyPeriod = period;

        const contentEl = this.container.querySelector('#csEconomyContent');
        if (!contentEl) return;

        contentEl.innerHTML = '<div class="cs-loading-inline"><div class="cs-spinner"></div></div>';

        try {
            let html = '';
            if (period === 'daily') {
                if (!this._cache.economyDaily) {
                    this._cache.economyDaily = await CommunityStatsAPI.getEconomyDaily(30);
                }
                html = this._renderEconomyDailyContent();
            } else if (period === 'weekly') {
                if (!this._cache.economyWeekly) {
                    this._cache.economyWeekly = await CommunityStatsAPI.getEconomyWeekly(12);
                }
                html = this._renderEconomyWeeklyContent(this._cache.economyWeekly);
            } else if (period === 'historical') {
                if (!this._cache.historical) {
                    this._cache.historical = await CommunityStatsAPI.getEconomyHistorical();
                }
                html = this._renderEconomyHistoricalContent(this._cache.historical);
            }

            contentEl.innerHTML = html;
            this._initAnimations();
        } catch (err) {
            contentEl.innerHTML = '<div class="cs-error"><p>Failed to load data.</p></div>';
        }
    }

    /** @private */
    async _handleLoadMoreUsers(btn) {
        const offset = parseInt(btn.dataset.offset) || 0;
        btn.textContent = 'Loading...';
        btn.disabled = true;

        try {
            const moreData = await CommunityStatsAPI.getUsersRanked(50, offset);
            if (moreData?.data?.length) {
                // Append to cache
                this._cache.usersRanked.data.push(...moreData.data);

                // Append rows to table
                const tbody = this.container.querySelector('.cs-users-table tbody');
                if (tbody) {
                    moreData.data.forEach((u, i) => {
                        const row = this._createUserRow(u, i);
                        tbody.insertAdjacentHTML('beforeend', row);
                    });
                }

                // Update offset or hide button
                const newOffset = offset + moreData.data.length;
                if (newOffset >= (moreData.total || 0)) {
                    btn.parentElement?.remove();
                } else {
                    btn.dataset.offset = newOffset;
                    btn.textContent = 'Load more players';
                    btn.disabled = false;
                }
            } else {
                btn.parentElement?.remove();
            }
        } catch (err) {
            btn.textContent = 'Retry';
            btn.disabled = false;
        }
    }

    /** @private */
    _createUserRow(u, i) {
        const rankBadge = u.rank <= 3
            ? `<span class="cs-rank-medal">${['🥇','🥈','🥉'][u.rank - 1]}</span>`
            : `<span class="cs-rank-num">#${u.rank}</span>`;

        return `
        <tr class="cs-user-row cs-fade-in" style="animation-delay:${i * 30}ms" data-user-id="${u.user_id}">
            <td class="cs-td-rank">${rankBadge}</td>
            <td class="cs-td-user">
                <div class="cs-user-cell">
                    <span class="cs-user-badge" style="color:${u.level_color}">${u.level_badge}</span>
                    <div class="cs-user-info">
                        <span class="cs-user-name">${this._escapeHtml(u.username || 'Unknown')}</span>
                        <span class="cs-user-title" style="color:${u.level_color}">Lv.${u.level} ${u.level_title}</span>
                    </div>
                </div>
            </td>
            <td class="cs-td-xp">${this._fmtNum(u.total_xp_earned)}</td>
            <td class="cs-td-coins">🪙 ${u.coin_balance.toLocaleString()}</td>
            <td class="cs-td-games">${u.games_played} <small>(${u.unique_games} games)</small></td>
            <td class="cs-td-streak">${u.login_streak > 0 ? '🔥 ' + u.login_streak : '-'}</td>
        </tr>`;
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    /** Group game daily activity by date. @private */
    _groupByDate(data) {
        const dateSet = new Set();
        const gameSet = new Set();
        const seriesMap = {};

        data.forEach(row => {
            dateSet.add(row.date);
            gameSet.add(row.game_title);
            if (!seriesMap[row.game_title]) seriesMap[row.game_title] = {};
            seriesMap[row.game_title][row.date] = row;
        });

        return {
            dateLabels: [...dateSet].sort(),
            gameNames: [...gameSet].sort(),
            seriesMap
        };
    }

    /** Format large numbers. @private */
    _fmtNum(n) {
        if (typeof n !== 'number') return n;
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K';
        return n.toLocaleString();
    }

    /** Format seconds to human-readable duration. @private */
    _fmtDuration(seconds) {
        if (!seconds) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    /** Escape HTML. @private */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /** Init fade-in and count-up animations. @private */
    _initAnimations() {
        // IntersectionObserver for fade-in
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('cs-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        this.container?.querySelectorAll('.cs-fade-in').forEach(el => observer.observe(el));
    }
}

// Global export (matches existing pattern)
if (typeof window !== 'undefined') {
    window.CommunityStatsRenderer = CommunityStatsRenderer;
}
