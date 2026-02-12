import { fetchGames, getGameResourceUrl, getGamePreviewUrl } from './api.js';
import { steemAvatarService } from './SteemAvatarService.js';

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
            
            // Filter only ranked games and sort: STEEM rewards first, then alphabetically
            games = games
                .filter(g => g.status?.status_code === 'ranked')
                .sort((a, b) => {
                    // First priority: STEEM rewards enabled
                    if (a.steem_rewards_enabled !== b.steem_rewards_enabled) {
                        return b.steem_rewards_enabled - a.steem_rewards_enabled;
                    }
                    // Second priority: alphabetical order
                    return a.title.localeCompare(b.title);
                });
            
            // Store games for later use
            this.games = games;
            
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
                        <span class="countdown-label">Ends in:</span>
                        <span id="countdownTimer" class="countdown-value">--</span>
                    </div>
                </div>
                <!-- Game Filter -->
                <div class="game-selector">
                    
                    <div class="game-cards-container">
                        ${games.map((g, idx) => this.renderGameCard(g, idx === 0)).join('')}
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

                <!-- Leaderboard Content -->
                <div id="leaderboardContent" class="leaderboard-content">
                    <div class="loading">Loading...</div>
                </div>
            </div>
        `;
        
        // Attach click handlers to game cards
        this.attachGameCardHandlers();
    }

    /**
     * Render a game card for the selector
     */
    renderGameCard(game, isSelected = false) {
        const thumbnailUrl = game.thumbnail
            ? getGamePreviewUrl(game.game_id, game.thumbnail)
            : './icons/icon-192x192.png';
        
        const steemBadge = game.steem_rewards_enabled 
            ? '<div class="game-card-steem"><img src="./icons/steem.png" alt="STEEM"></div>' 
            : '';
        
        return `
            <div class="game-selector-card ${isSelected ? 'active' : ''}" 
                 data-game-id="${game.game_id}"
                 onclick="leaderboardRenderer.selectGame('${game.game_id}')">
                <div class="game-card-thumbnail">
                    <img src="${thumbnailUrl}" alt="${game.title}" loading="lazy">
                    ${steemBadge}
                </div>
                <div class="game-card-name">${game.title}</div>
            </div>
        `;
    }

    /**
     * Attach click handlers to game cards
     */
    attachGameCardHandlers() {
        // Handlers are attached via onclick in the HTML
    }

    /**
     * Select a game from the cards
     */
    async selectGame(gameId) {
        if (this.currentGameId === gameId) return;
        
        // Update visual state
        document.querySelectorAll('.game-selector-card').forEach(card => {
            card.classList.toggle('active', card.dataset.gameId === gameId);
        });
        
        // Call the existing change handler
        await this.onGameChange(gameId);
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
            
            // Calculate next Monday at 00:00 UTC (when reset happens)
            const nextReset = new Date(now);
            nextReset.setUTCHours(0, 0, 0, 0);
            
            // Get days until next Monday (1 = Monday, 0 = Sunday)
            const currentDay = now.getUTCDay();
            const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay);
            nextReset.setUTCDate(now.getUTCDate() + daysUntilMonday);
            
            const diff = nextReset - now;
            
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
     * Switch between tabs
     */
    async switchTab(tab) {
        this.currentTab = tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

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
     * Get the reward config for a given rank
     */
    getRewardForRank(rank) {
        if (!this.rewards || this.rewards.length === 0) return null;
        return this.rewards.find(r => rank >= r.rank_start && rank <= r.rank_end) || null;
    }

    /**
     * Render reward badge HTML for a given reward object
     */
    renderRewardBadgesInline(reward) {
        if (!reward) return '';
        const parts = [];
        if (this.steemEnabled && reward.steem_reward > 0) {
            parts.push(`<span class="gdl-reward-steem"><img src="./icons/steem.png" alt="STEEM" class="gdl-reward-icon"> ${reward.steem_reward}</span>`);
        }
        if (reward.coin_reward > 0) {
            parts.push(`<span class="gdl-reward-coin">🪙 ${reward.coin_reward}</span>`);
        }
        return parts.length > 0 ? `<div class="gdl-reward-badges">${parts.join('')}</div>` : '';
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

            container.innerHTML = this.renderPodiumLeaderboard(data.leaderboard);

        } catch (error) {
            console.error('Error loading leaderboard:', error);
            container.innerHTML = '<div class="error-message">Failed to load leaderboard</div>';
        }
    }

    /**
     * Render leaderboard with podium (top 3) + list (rest)
     */
    renderPodiumLeaderboard(entries) {
        const top3 = entries.slice(0, 3);
        const rest = entries.slice(3);
        const hasGames = !this.currentGameId;
        const showRewards = this.currentTab === 'weekly';

        // Build podium (reorder: 2nd, 1st, 3rd)
        const podiumOrder = [];
        if (top3[1]) podiumOrder.push({ ...top3[1], podiumPos: 2 });
        if (top3[0]) podiumOrder.push({ ...top3[0], podiumPos: 1 });
        if (top3[2]) podiumOrder.push({ ...top3[2], podiumPos: 3 });

        const podiumHTML = podiumOrder.map(entry => {
            const medal = entry.podiumPos === 1 ? '🥇' : entry.podiumPos === 2 ? '🥈' : '🥉';
            const username = entry.username || 'Anonymous';
            const steemUsername = entry.steem_username || null;
            const avatarHTML = steemAvatarService.renderAvatarImg(steemUsername, {
                size: 'medium',
                cssClass: 'gdl-podium-avatar',
                width: entry.podiumPos === 1 ? 80 : 64,
                height: entry.podiumPos === 1 ? 80 : 64
            });
            const userId = entry.user_id || '';
            const score = (entry.score || entry.total_score || 0).toLocaleString();
            const reward = showRewards ? this.getRewardForRank(entry.rank) : null;
            const rewardHTML = this.renderRewardBadgesInline(reward);
            const gamesInfo = hasGames && entry.games_played ? `<div class="gdl-podium-games">${entry.games_played} games</div>` : '';

            return `
                <div class="gdl-podium-player gdl-podium-${entry.podiumPos}" data-user-id="${userId}" onclick="leaderboardRenderer.navigateToUserProfile('${userId}')" role="button" tabindex="0">
                    <div class="gdl-podium-medal">${medal}</div>
                    <div class="gdl-podium-avatar-wrap">${avatarHTML}</div>
                    <div class="gdl-podium-name">${username}</div>
                    <div class="gdl-podium-score">${score}</div>
                    ${gamesInfo}
                    ${rewardHTML}
                    <div class="gdl-podium-bar"></div>
                </div>
            `;
        }).join('');

        // Build rest of list
        const hasAnyListReward = showRewards && rest.some(e => this.getRewardForRank(e.rank));
        const restHTML = rest.map(entry => {
            const username = entry.username || 'Anonymous';
            const steemUsername = entry.steem_username || null;
            const avatarHTML = steemAvatarService.renderAvatarImg(steemUsername, {
                size: 'small',
                cssClass: 'gdl-list-avatar',
                width: 40,
                height: 40
            });
            const userId = entry.user_id || '';
            const score = (entry.score || entry.total_score || 0).toLocaleString();
            const reward = showRewards ? this.getRewardForRank(entry.rank) : null;
            const rewardHTML = this.renderRewardBadgesInline(reward);
            const gamesCell = hasGames ? `<span class="gdl-list-games">${entry.games_played || 0}</span>` : '';
            const rewardsClass = hasAnyListReward ? 'has-rewards' : '';
            const gamesClass = hasGames ? 'has-games-col' : '';

            return `
                <div class="gdl-list-row ${rewardsClass} ${gamesClass} clickable-row" data-user-id="${userId}" onclick="leaderboardRenderer.navigateToUserProfile('${userId}')" role="button" tabindex="0">
                    <span class="gdl-list-rank">#${entry.rank}</span>
                    <div class="gdl-list-player">${avatarHTML}<span class="gdl-list-name">${username}</span></div>
                    <span class="gdl-list-score">${score}</span>
                    ${gamesCell}
                    ${hasAnyListReward ? `<div class="gdl-list-reward">${rewardHTML}</div>` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="gdl-section gdl-section--page">
                <div class="gdl-podium">${podiumHTML}</div>
                ${rest.length > 0 ? `<div class="gdl-list">${restHTML}</div>` : ''}
            </div>
        `;
    }

    /**
     * Render leaderboard table
     */
    renderLeaderboardTable(entries) {
        const hasGames = !this.currentGameId;
        // If rendering winners history, detect by entry shape (has steem_reward, coin_reward, reward_sent)
        const isWinnersHistory = entries.length > 0 && entries[0].hasOwnProperty('steem_reward') && entries[0].hasOwnProperty('coin_reward');
        // Only show rewards column in winners history, not weekly tab
        const showRewards = isWinnersHistory;
        const headerClass = `${hasGames ? 'has-games' : ''} ${!showRewards ? 'no-rewards' : ''}`.trim();
        
        return `
            <div class="leaderboard-table">
                <div class="table-header ${headerClass}">
                    <div class="col-rank">Rank</div>
                    <div class="col-player">Player</div>
                    ${this.currentGameId ? '<div class="col-score">Score</div>' : '<div class="col-score">Total Score</div>'}
                    ${hasGames ? '<div class="col-games">Games Played</div>' : ''}
                    ${showRewards ? '<div class="col-rewards">Rewards</div>' : ''}
                </div>
                <div class="table-body">
                    ${entries.map(entry => this.renderLeaderboardRow(entry, hasGames, showRewards)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Build the player cell HTML with avatar and username.
     * @param {Object} entry - Leaderboard entry data
     * @returns {string} HTML for the player cell content
     */
    buildPlayerCellHTML(entry) {
        const username = entry.username || 'Anonymous';
        const steemUsername = entry.steem_username || null;
        const avatarHTML = steemAvatarService.renderAvatarImg(steemUsername, {
            size: 'small',
            cssClass: 'leaderboard-avatar',
            width: 40,
            height: 40
        });

        return `<div class="player-cell">${avatarHTML}<span class="player-name-text">${username}</span></div>`;
    }

    /**
     * Navigate to a user's public profile page.
     * @param {string} userId - The user ID to navigate to
     */
    navigateToUserProfile(userId) {
        if (!userId) {
            return;
        }
        window.location.hash = `#/user/${userId}`;
    }

    /**
     * Render single leaderboard row
     */
    renderLeaderboardRow(entry, hasGames = false, showRewards = true) {
        const rankClass = entry.rank <= 3 ? `top-${entry.rank}` : '';
        const rowClass = `${rankClass} ${hasGames ? 'has-games' : ''} ${!showRewards ? 'no-rewards' : ''}`.trim();
        const userId = entry.user_id || '';
        const playerCellHTML = this.buildPlayerCellHTML(entry);

        // If entry is from winners history, show actual sent rewards
        let rewardContent = '';
        if (showRewards && entry.hasOwnProperty('steem_reward') && entry.hasOwnProperty('coin_reward')) {
            if (entry.coin_reward > 0) {
                rewardContent += `<span class="reward-coins">🪙 ${entry.coin_reward}</span>`;
            }
            if (entry.steem_reward > 0) {
                rewardContent += `<span class="reward-steem">💎 ${entry.steem_reward} STEEM</span>`;
            }
            if (entry.reward_sent && entry.steem_tx_id) {
                rewardContent += `<span class="tx-id" style="font-size:0.82em; color:var(--text-muted);">TX:${entry.steem_tx_id.substring(0,8)}...</span>`;
            }
            if (entry.reward_sent) {
                rewardContent += `<span style="font-size:0.95em;">✅</span>`;
            }
        } else if (showRewards) {
            // Default: use config rewards for weekly tab
            const reward = this.rewards.find(r => {
                return entry.rank >= r.rank_start && entry.rank <= r.rank_end;
            });
            if (reward) {
                const steemPart = reward.steem_reward > 0 ? `<span class="reward-steem">💎 ${reward.steem_reward} STEEM</span>` : '';
                const coinPart = reward.coin_reward > 0 ? `<span class="reward-coins">🪙 ${reward.coin_reward}</span>` : '';
                if (steemPart || coinPart) {
                    rewardContent = `${coinPart} ${steemPart}`;
                }
            }
        }

        return `
            <div class="table-row ${rowClass} clickable-row" data-user-id="${userId}" onclick="leaderboardRenderer.navigateToUserProfile('${userId}')" role="button" tabindex="0">
                <div class="col-rank">#${entry.rank}</div>
                <div class="col-player">${playerCellHTML}</div>
                <div class="col-score">${(entry.score || entry.total_score || 0).toLocaleString()}</div>
                ${hasGames ? `<div class="col-games">${entry.games_played || 0}</div>` : ''}
                ${showRewards ? `<div class="col-rewards">${rewardContent ? `<div class="inline-reward-badge">${rewardContent}</div>` : ''}</div>` : ''}
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
            this.attachCollapsibleHandlers();

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
        const weekId = `week_${group.week_start.replace(/[^\w]/g, '')}_${group.week_end.replace(/[^\w]/g, '')}`;
        return `
            <div class="week-group" id="${weekId}">
                <h3 class="week-title collapsible" data-toggle="${weekId}" style="cursor:pointer; user-select:none; display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.1em;">📅</span>
                    <span>Week: ${start} - ${end}</span>
                    <span class="toggle-arrow" style="margin-left:auto; font-size:1.2em; transition:transform 0.2s;">▼</span>
                </h3>
                <div class="collapsible-content" style="display:none;">
                    ${this.renderLeaderboardTable(group.winners)}
                </div>
            </div>
        `;
    }
    /**
     * After rendering, attach collapsible logic to week groups
     */
    attachCollapsibleHandlers() {
        document.querySelectorAll('.week-title.collapsible').forEach(title => {
            const weekId = title.dataset.toggle;
            const group = document.getElementById(weekId);
            if (!group) return;
            const content = group.querySelector('.collapsible-content');
            const arrow = title.querySelector('.toggle-arrow');
            // Start collapsed
            content.style.display = 'none';
            arrow.style.transform = 'rotate(0deg)';
            title.onclick = () => {
                const isOpen = content.style.display === 'block';
                content.style.display = isOpen ? 'none' : 'block';
                arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            };
        });
    }
    // ...existing code...
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
