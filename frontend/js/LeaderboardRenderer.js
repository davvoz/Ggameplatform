import { fetchGames, getGameResourceUrl } from './api.js';

// Use LeaderboardAPI from global scope
const LeaderboardAPI = window.LeaderboardAPI;

/**
 * Enhanced Leaderboard Renderer
 * Supports Weekly and All-Time leaderboards with rewards display
 */
class LeaderboardRenderer {
    constructor() {
        this.appContainer = document.getElementById('app');
        this.currentTab = 'weekly'; // 'weekly' or 'alltime' or 'winners'
        this.currentGameId = null; // null = global, string = specific game
        this.weekInfo = null;
        this.rewards = [];
        this.steemEnabled = false; // Whether current game has STEEM rewards enabled
        this.countdownInterval = null;
    }

    /**
     * Render the leaderboard page
     */
    async render() {
        this.showLoadingState();

        try {
            // Fetch initial data
            let games = await fetchGames();
            
            // Sort games: STEEM rewards first, then alphabetically
            games = games.sort((a, b) => {
                // First priority: STEEM rewards enabled
                if (a.steem_rewards_enabled !== b.steem_rewards_enabled) {
                    return b.steem_rewards_enabled - a.steem_rewards_enabled;
                }
                // Second priority: alphabetical order
                return a.title.localeCompare(b.title);
            });
            
            // Set first game as default
            if (games.length > 0) {
                this.currentGameId = games[0].game_id;
            }
            
            const [weekInfo, rewardsData] = await Promise.all([
                LeaderboardAPI.getWeekInfo(),
                LeaderboardAPI.getRewardsConfig(this.currentGameId)
            ]);

            this.weekInfo = weekInfo;
            this.rewards = rewardsData.rewards || [];
            this.steemEnabled = rewardsData.steem_rewards_enabled || false;
            
            // Render main UI
            this.renderMainUI(games);
            
            // Load initial leaderboard
            await this.loadLeaderboard();
            
            // Start countdown
            this.startCountdown();

        } catch (error) {
            console.error('Error loading leaderboards:', error);
            this.showErrorState();
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        this.appContainer.innerHTML = `
            <div class="leaderboard-page">
                <div class="loading">Loading leaderboards...</div>
            </div>
        `;
    }

    /**
     * Show error state
     */
    showErrorState() {
        this.appContainer.innerHTML = `
            <div class="leaderboard-page">
                <div class="error-message">
                    Failed to load leaderboards. Please try again later.
                </div>
            </div>
        `;
    }

    /**
     * Render main UI structure
     */
    renderMainUI(games) {
        this.appContainer.innerHTML = `
            <div class="leaderboard-page">
                <!-- Header -->
                <div class="leaderboard-header">
                    <h1>🏆 Leaderboards</h1>
                    <p class="leaderboard-subtitle">Compete for rewards every week!</p>
                </div>

                <!-- Week Info & Countdown -->
                <div class="week-info-card">
                    <div class="week-dates">
                        <span class="week-label">Current Week:</span>
                        <span class="week-range">${this.formatWeekRange()}</span>
                    </div>
                    <div class="week-countdown">
                        <span class="countdown-label">Reset in:</span>
                        <span id="countdownTimer" class="countdown-value">--</span>
                    </div>
                </div>

                <!-- Tabs: Weekly / All-Time / Winners -->
                <div class="leaderboard-tabs">
                    <button class="tab-btn active" data-tab="weekly" onclick="leaderboardRenderer.switchTab('weekly')">
                        📅 Weekly
                    </button>
                    <button class="tab-btn" data-tab="alltime" onclick="leaderboardRenderer.switchTab('alltime')">
                        🏅 All-Time
                    </button>
                    <button class="tab-btn" data-tab="winners" onclick="leaderboardRenderer.switchTab('winners')">
                        👑 Winners History
                    </button>
                </div>

                <!-- Game Filter -->
                <div class="game-filter">
                    <label for="gameSelect">Filter by game:</label>
                    <select id="gameSelect" onchange="leaderboardRenderer.onGameChange(this.value)">
                        ${games.map((g, idx) => `<option value="${g.game_id}" ${idx === 0 ? 'selected' : ''} style="background-color: #1a1a2e; color: #e0e0e0;">${g.title}</option>`).join('')}
                    </select>
                </div>

                <!-- Rewards Info -->
                <div id="rewardsInfo" class="rewards-info">
                    ${this.renderRewardsInfo()}
                </div>

                <!-- Leaderboard Content -->
                <div id="leaderboardContent" class="leaderboard-content">
                    <div class="loading">Loading...</div>
                </div>
            </div>
        `;
    }

    /**
     * Format week range display
     */
    formatWeekRange() {
        if (!this.weekInfo) return '--';
        const start = new Date(this.weekInfo.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const end = new Date(this.weekInfo.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${start} - ${end}`;
    }

    /**
     * Start countdown timer
     */
    startCountdown() {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        
        const updateCountdown = () => {
            if (!this.weekInfo) return;
            
            const timerElement = document.getElementById('countdownTimer');
            if (!timerElement) {
                // Element doesn't exist anymore, stop the interval
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
                return;
            }
            
            const now = new Date();
            const end = new Date(this.weekInfo.week_end);
            const diff = end - now;
            
            if (diff <= 0) {
                timerElement.textContent = '⏰ Resetting...';
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            timerElement.textContent = `${days}d ${hours}h ${minutes}m`;
        };
        
        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 60000); // Update every minute
    }

    /**
     * Render rewards information
     */
    renderRewardsInfo() {
        // Only show rewards on weekly tab
        if (this.currentTab !== 'weekly') {
            return '';
        }

        if (!this.rewards || this.rewards.length === 0) {
            return '<p class="text-muted">No rewards configured</p>';
        }

        // Filter rewards by current game
        const relevantRewards = this.currentGameId
            ? this.rewards.filter(r => r.game_id === this.currentGameId || r.game_id === null)
            : this.rewards.filter(r => r.game_id === null); // Only global for global view

        if (relevantRewards.length === 0) {
            return '<p class="text-muted">No specific rewards for this game</p>';
        }

        // Add STEEM info message if applicable
        let steemInfoMessage = '';
        if (this.currentGameId && !this.steemEnabled) {
            steemInfoMessage = '<p class="steem-info-message">ℹ️ This game awards Coins only. STEEM rewards are not enabled for this game.</p>';
        } else if (this.currentGameId && this.steemEnabled) {
            steemInfoMessage = '<p class="steem-info-message steem-enabled">✨ This game awards both STEEM and Coins!</p>';
        }

        return `
            <h3>💰 Weekly Rewards</h3>
            ${steemInfoMessage}
            <div class="rewards-grid">
                ${relevantRewards.map(r => this.renderRewardBadge(r)).join('')}
            </div>
        `;
    }

    /**
     * Render single reward badge
     */
    renderRewardBadge(reward) {
        const rankText = reward.rank_start === reward.rank_end
            ? `#${reward.rank_start}`
            : `#${reward.rank_start}-${reward.rank_end}`;
        
        const medal = reward.rank_start === 1 ? '🥇' : reward.rank_start === 2 ? '🥈' : reward.rank_start === 3 ? '🥉' : '🏅';

        // Show STEEM rewards only if enabled for this game
        const showSteemReward = this.steemEnabled && reward.steem_reward > 0;

        return `
            <div class="reward-badge">
                <div class="reward-rank">${medal} ${rankText}</div>
                <div class="reward-amounts">
                    ${showSteemReward ? `<span class="steem-reward">${reward.steem_reward} STEEM</span>` : ''}
                    ${reward.coin_reward > 0 ? `<span class="coin-reward">${reward.coin_reward} 🪙</span>` : ''}
                </div>
                ${reward.description ? `<div class="reward-desc">${reward.description}</div>` : ''}
            </div>
        `;
    }

    /**
     * Switch between tabs
     */
    async switchTab(tab) {
        this.currentTab = tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update rewards display (only show on weekly tab)
        const rewardsInfoEl = document.getElementById('rewardsInfo');
        if (rewardsInfoEl) {
            rewardsInfoEl.innerHTML = this.renderRewardsInfo();
            // Hide the entire div when not on weekly tab
            rewardsInfoEl.style.display = (tab === 'weekly') ? 'block' : 'none';
        }

        // Load appropriate content
        if (tab === 'winners') {
            await this.loadWinnersHistory();
        } else {
            await this.loadLeaderboard();
        }
    }

    /**
     * Handle game filter change
     */
    async onGameChange(gameId) {
        this.currentGameId = gameId || null;
        
        // Reload rewards for new game
        try {
            const rewardsData = await LeaderboardAPI.getRewardsConfig(this.currentGameId);
            this.rewards = rewardsData.rewards || [];
            this.steemEnabled = rewardsData.steem_rewards_enabled || false;
            const rewardsInfoEl = document.getElementById('rewardsInfo');
            rewardsInfoEl.innerHTML = this.renderRewardsInfo();
            // Maintain visibility based on current tab
            rewardsInfoEl.style.display = (this.currentTab === 'weekly') ? 'block' : 'none';
        } catch (error) {
            console.error('Error loading rewards:', error);
        }

        // Reload leaderboard
        if (this.currentTab === 'winners') {
            await this.loadWinnersHistory();
        } else {
            await this.loadLeaderboard();
        }
    }

    /**
     * Load and render leaderboard
     */
    async loadLeaderboard() {
        const container = document.getElementById('leaderboardContent');
        container.innerHTML = '<div class="loading">Loading leaderboard...</div>';

        try {
            const data = this.currentTab === 'weekly'
                ? await LeaderboardAPI.getWeeklyLeaderboard(this.currentGameId, 50)
                : await LeaderboardAPI.getAllTimeLeaderboard(this.currentGameId, 50);

            if (!data.success || !data.leaderboard || data.leaderboard.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No scores yet. Be the first to play!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.renderLeaderboardTable(data.leaderboard);

        } catch (error) {
            console.error('Error loading leaderboard:', error);
            container.innerHTML = '<div class="error-message">Failed to load leaderboard</div>';
        }
    }

    /**
     * Render leaderboard table
     */
    renderLeaderboardTable(entries) {
        return `
            <div class="leaderboard-table">
                <div class="table-header">
                    <div class="col-rank">Rank</div>
                    <div class="col-player">Player</div>
                    ${this.currentGameId ? '<div class="col-score">Score</div>' : '<div class="col-score">Total Score</div>'}
                    ${!this.currentGameId ? '<div class="col-games">Games Played</div>' : ''}
                </div>
                <div class="table-body">
                    ${entries.map(entry => this.renderLeaderboardRow(entry)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render single leaderboard row
     */
    renderLeaderboardRow(entry) {
        const rankClass = entry.rank <= 3 ? `top-${entry.rank}` : '';
        const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '';

        return `
            <div class="table-row ${rankClass}">
                <div class="col-rank">${medal} #${entry.rank}</div>
                <div class="col-player">${entry.username || 'Anonymous'}</div>
                <div class="col-score">${(entry.score || entry.total_score || 0).toLocaleString()}</div>
                ${!this.currentGameId ? `<div class="col-games">${entry.games_played || 0}</div>` : ''}
            </div>
        `;
    }

    /**
     * Load and render winners history
     */
    async loadWinnersHistory() {
        const container = document.getElementById('leaderboardContent');
        container.innerHTML = '<div class="loading">Loading winners history...</div>';

        try {
            const data = await LeaderboardAPI.getWinnersHistory(100, this.currentGameId);

            if (!data.success || !data.winners || data.winners.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No winners history yet.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.renderWinnersHistory(data.winners);

        } catch (error) {
            console.error('Error loading winners:', error);
            container.innerHTML = '<div class="error-message">Failed to load winners history</div>';
        }
    }

    /**
     * Render winners history
     */
    renderWinnersHistory(winners) {
        // Group by week
        const weekGroups = {};
        winners.forEach(w => {
            const key = `${w.week_start}_${w.week_end}`;
            if (!weekGroups[key]) {
                weekGroups[key] = {
                    week_start: w.week_start,
                    week_end: w.week_end,
                    winners: []
                };
            }
            weekGroups[key].winners.push(w);
        });

        return `
            <div class="winners-history">
                ${Object.values(weekGroups).map(group => this.renderWeekGroup(group)).join('')}
            </div>
        `;
    }

    /**
     * Render week group of winners
     */
    renderWeekGroup(group) {
        const start = new Date(group.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const end = new Date(group.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return `
            <div class="week-group">
                <h3 class="week-title">Week: ${start} - ${end}</h3>
                <div class="winners-grid">
                    ${group.winners.map(w => this.renderWinnerCard(w)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render winner card
     */
    renderWinnerCard(winner) {
        const medal = winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : winner.rank === 3 ? '🥉' : '🏅';
        const rewardSent = winner.reward_sent ? '✅' : '⏳';

        // Show STEEM reward info only if there was actually a STEEM reward sent
        const hasSteemReward = winner.steem_reward > 0 && (winner.steem_tx_id || winner.reward_sent);

        return `
            <div class="winner-card rank-${winner.rank}">
                <div class="winner-header">
                    <span class="winner-medal">${medal}</span>
                    <span class="winner-rank">Rank ${winner.rank}</span>
                </div>
                <div class="winner-info">
                    <div class="winner-name">${winner.username || 'Anonymous'}</div>
                    <div class="winner-game">${winner.game_title}</div>
                    <div class="winner-score">${winner.score.toLocaleString()} points</div>
                </div>
                <div class="winner-rewards">
                    ${hasSteemReward ? `<div class="reward-item">💰 ${winner.steem_reward} STEEM ${rewardSent}</div>` : ''}
                    ${winner.coin_reward > 0 ? `<div class="reward-item">🪙 ${winner.coin_reward} coins ${rewardSent}</div>` : ''}
                    ${winner.steem_tx_id ? `<div class="tx-id">TX: ${winner.steem_tx_id.substring(0, 8)}...</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }
}
/**
 * Render the leaderboard page
 */
export async function renderLeaderboard() {
    // Destroy previous instance if exists
    if (window.leaderboardRenderer) {
        window.leaderboardRenderer.destroy();
    }
    
    const renderer = new LeaderboardRenderer();
    window.leaderboardRenderer = renderer; // Make accessible globally
    await renderer.render();
}
