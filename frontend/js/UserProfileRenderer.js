import { getGameResourceUrl, getGamePreviewUrl } from './api.js';
import { SteemProfileService } from './SteemProfileService.js';
import { steemAvatarService } from './SteemAvatarService.js';
import { config } from './config.js';

/**
 * UserProfileRenderer - Renders the public profile page for any user.
 *
 * Reuses the same visual layout as the authenticated profile page but displays
 * read-only data for the selected user. Navigated to from leaderboard rows
 * via the route /user/:userId.
 */
class UserProfileRenderer {
    /** @param {string} userId - The user ID whose profile to render */
    constructor(userId) {
        this.userId = userId;
        this.appContainer = document.getElementById('app');
        this.steemProfileService = new SteemProfileService();
    }

    // ───────── Public API ─────────

    /**
     * Main entry point — renders the full public profile page.
     */
    async render() {
        this.showLoadingState();

        try {
            const user = await this.fetchUserData();

            if (!user) {
                this.showNotFoundState();
                return;
            }

            const [sessionsData, levelInfo] = await Promise.all([
                this.fetchUserSessions(),
                this.fetchLevelInfo()
            ]);

            const sessions = sessionsData?.sessions ?? [];
            const stats = this.calculateStats(sessions);

            if (typeof sessionsData?.count === 'number') {
                stats.gamesPlayed = sessionsData.count;
            }

            this.renderProfilePage(user, stats, levelInfo);

            // Load weekly leaderboard standings in background
            this.loadWeeklyStandingsAsync();

            // Load coin balance in background
            this.loadCoinBalanceAsync();

            // Load Steem profile in background (slowest call)
            this.loadSteemProfileAsync(user);
        } catch (error) {
            console.error('Error rendering user profile:', error);
            this.showErrorState();
        }
    }

    // ───────── Data Fetching ─────────

    /**
     * Fetch user data from the backend.
     * @returns {Promise<Object|null>}
     */
    async fetchUserData() {
        const API_URL = this.getApiUrl();
        const response = await fetch(`${API_URL}/users/${this.userId}`);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.user ?? null;
    }

    /**
     * Fetch user sessions (games played, scores, etc.).
     * @returns {Promise<Object>}
     */
    async fetchUserSessions() {
        try {
            const API_URL = this.getApiUrl();
            const response = await fetch(`${API_URL}/users/${this.userId}/sessions?limit=1000`);

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching user sessions:', error);
        }
        return { count: 0, sessions: [] };
    }

    /**
     * Fetch level information for the user.
     * @returns {Promise<Object|null>}
     */
    async fetchLevelInfo() {
        try {
            const API_URL = this.getApiUrl();
            const response = await fetch(`${API_URL}/api/levels/${this.userId}`);

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching level info:', error);
        }
        return null;
    }

    /**
     * Load coin balance for the visited user and update the UI.
     */
    async loadCoinBalanceAsync() {
        try {
            const API_URL = this.getApiUrl();
            const response = await fetch(`${API_URL}/api/coins/${this.userId}/balance`);
            if (!response.ok) return;
            const data = await response.json();
            const coinEl = document.getElementById('publicCoinBalance');
            if (coinEl && data.balance !== undefined) {
                coinEl.textContent = Number(data.balance).toLocaleString();
            }
        } catch (error) {
            console.error('Error loading coin balance:', error);
        }
    }

    /**
     * Load Steem profile data and update the UI asynchronously.
     * @param {Object} user - The user data object
     */
    async loadSteemProfileAsync(user) {
        const steemUsername = this.extractSteemUsername(user);

        if (!steemUsername) {
            return;
        }

        try {
            const steemProfile = await this.steemProfileService.fetchProfile(steemUsername);

            if (steemProfile) {
                this.updateAvatarWithSteemData(steemProfile);
                this.updateCoverWithSteemData(steemProfile);
            }
        } catch (error) {
            console.error('Error loading Steem profile:', error);
        }
    }

    /**
     * Load weekly leaderboard standings and render into the profile page.
     */
    async loadWeeklyStandingsAsync() {
        try {
            const API_URL = this.getApiUrl();
            const response = await fetch(`${API_URL}/api/leaderboard/user-weekly-standings/${this.userId}`);
            if (!response.ok) return;
            const data = await response.json();

            if (!data.success || !data.standings || data.standings.length === 0) return;

            const section = document.getElementById('weeklyStandingsSection');
            if (!section) return;

            section.style.display = 'block';
            section.innerHTML = this.buildWeeklyStandingsHTML(data);
        } catch (error) {
            console.error('Error loading weekly standings:', error);
        }
    }

    /**
     * Build the HTML for weekly leaderboard standings.
     */
    buildWeeklyStandingsHTML(data) {
        const weekEnd = new Date(data.week_end);
        const now = new Date();
        const daysLeft = Math.max(0, Math.ceil((weekEnd - now) / (1000 * 60 * 60 * 24)));

        const standingsRows = data.standings.map(s => {
            const rankBadge = s.rank <= 3
                ? `<span class="ws-rank ws-rank-${s.rank}">${['🥇','🥈','🥉'][s.rank - 1]}</span>`
                : `<span class="ws-rank">#${s.rank}</span>`;

            const rewardBadges = [];
            if (s.steem_reward > 0) {
                rewardBadges.push(`<span class="ws-badge ws-badge-steem"><img src="./icons/steem.png" class="ws-badge-icon" alt="S"> ${s.steem_reward}</span>`);
            }
            if (s.coin_reward > 0) {
                rewardBadges.push(`<span class="ws-badge ws-badge-coin"><img src="./icons/coin.png" class="ws-badge-icon" alt="C"> ${s.coin_reward}</span>`);
            }
            const rewardsHTML = rewardBadges.length > 0
                ? `<div class="ws-rewards">${rewardBadges.join('')}</div>`
                : `<div class="ws-rewards"><span class="ws-no-reward">—</span></div>`;

            return `
                <div class="ws-row">
                    <div class="ws-rank-col">${rankBadge}</div>
                    <div class="ws-game-col">${this.escapeHTML(s.game_title)}</div>
                    <div class="ws-score-col">${s.score.toLocaleString()}</div>
                    <div class="ws-rewards-col">${rewardsHTML}</div>
                </div>
            `;
        }).join('');

        // Totals
        const totalSteem = data.total_projected_steem;
        const totalCoins = data.total_projected_coins;
        const totalBadges = [];
        if (totalSteem > 0) {
            totalBadges.push(`<span class="ws-badge ws-badge-steem ws-badge-lg"><img src="./icons/steem.png" class="ws-badge-icon" alt="S"> ${totalSteem}</span>`);
        }
        if (totalCoins > 0) {
            totalBadges.push(`<span class="ws-badge ws-badge-coin ws-badge-lg"><img src="./icons/coin.png" class="ws-badge-icon" alt="C"> ${totalCoins}</span>`);
        }

        return `
            <h3>📊 Weekly Results</h3>
            <div class="ws-container">
                <div class="ws-header">
                    <span class="ws-subtitle">Current positions &amp; projected rewards</span>
                    <span class="ws-days-left">⏳ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</span>
                </div>
                <div class="ws-table">
                    <div class="ws-row ws-row-header">
                        <div class="ws-rank-col">Rank</div>
                        <div class="ws-game-col">Game</div>
                        <div class="ws-score-col">Score</div>
                        <div class="ws-rewards-col">Rewards</div>
                    </div>
                    ${standingsRows}
                </div>
                ${totalBadges.length > 0 ? `
                <div class="ws-totals">
                    <span class="ws-totals-label">Total projected rewards:</span>
                    <div class="ws-totals-badges">${totalBadges.join('')}</div>
                </div>` : ''}
            </div>
        `;
    }

    // ───────── Stats Calculation ─────────

    /**
     * Calculate player statistics from sessions.
     * @param {Array} sessions
     * @returns {Object}
     */
    calculateStats(sessions) {
        const stats = {
            gamesPlayed: sessions.length,
            totalPlayTimeSeconds: 0,
            highScore: 0,
            recentActivity: [],
            uniqueGames: new Set()
        };

        for (const session of sessions) {
            this.processSession(session, stats);
        }

        stats.totalPlayTime = this.formatPlayTime(stats.totalPlayTimeSeconds);
        stats.gamesTried = stats.uniqueGames.size;
        return stats;
    }

    /**
     * Process a single session for stats aggregation.
     * @param {Object} session
     * @param {Object} stats - Mutated in place
     */
    processSession(session, stats) {
        if (session.ended_at && session.started_at) {
            const durationSeconds = (new Date(session.ended_at) - new Date(session.started_at)) / 1000;
            stats.totalPlayTimeSeconds += durationSeconds;
        }

        const sessionScore = session.final_score || session.score || 0;
        if (sessionScore > stats.highScore) {
            stats.highScore = sessionScore;
        }

        if (session.game_id) {
            stats.uniqueGames.add(session.game_id);
        }

        if (stats.recentActivity.length < 10) {
            stats.recentActivity.push({
                game_name: session.game_id || 'Unknown Game',
                score: sessionScore,
                xp_earned: session.xp_earned || 0,
                timestamp: session.ended_at || session.started_at
            });
        }
    }

    /**
     * Format total seconds into a human-friendly string.
     * @param {number} totalSeconds
     * @returns {string}
     */
    formatPlayTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    // ───────── Rendering ─────────

    /**
     * Render the full profile page.
     */
    renderProfilePage(user, stats, levelInfo) {
        const displayName = this.getDisplayName(user);
        const userType = this.getUserType(user);
        const steemUsername = this.extractSteemUsername(user);
        const avatarHTML = this.buildAvatarHTML(steemUsername);
        const totalXP = user.total_xp_earned || 0;
        const multiplier = user.cur8_multiplier || 1.0;
        const levelCardHTML = levelInfo ? this.buildLevelCardHTML(levelInfo, totalXP) : '';
        const highScoresHTML = this.buildHighScoresHTML(user.game_scores_enriched);
        const recentActivityHTML = this.buildRecentActivityHTML(stats.recentActivity);
        const memberSince = user.created_at
            ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'Unknown';

        this.appContainer.innerHTML = `
            <div class="profile user-public-profile">
                <div class="profile-header" id="publicProfileHeader">
                    <div class="profile-avatar">
                        <div class="avatar-circle">
                            <span class="avatar-icon" id="publicAvatarIcon">${avatarHTML}</span>
                        </div>
                    </div>
                    <div class="profile-info">
                        <h2 class="profile-username">${this.escapeHTML(displayName)}</h2>
                        <p class="profile-type">${userType}</p>
                        ${steemUsername ? `
                        <a class="steem-profile-link visible" href="https://www.cur8.fun/app/@${this.escapeHTML(steemUsername)}" target="_blank" rel="noopener noreferrer">
                            <div class="steem-profile-link-logos">
                                <img src="./icons/icon-72x72.png" alt="Cur8" class="steem-profile-link-cur8">
                                <span class="steem-profile-link-x">\u00d7</span>
                                <img src="./icons/steem.png" alt="Steem" class="steem-profile-link-steem">
                            </div>
                            <div class="steem-profile-link-text">
                                <span class="steem-profile-link-label">View Social Profile</span>
                                <span class="steem-profile-link-url">cur8.fun/@${this.escapeHTML(steemUsername)}</span>
                            </div>
                            <span class="steem-profile-link-arrow">\u2192</span>
                        </a>
                        ` : ''}
                        <div class="profile-stats-quick">
                            <div class="stat-badge">
                                <span class="stat-label">CUR8 Multiplier</span>
                                <span class="stat-value multiplier">${multiplier.toFixed(2)}x</span>
                            </div>
                            <div class="stat-badge" id="publicCoinsBadge">
                                <span class="stat-label">🪙 Coins</span>
                                <span class="stat-value" id="publicCoinBalance">--</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="profile-content">
                    <div class="user-profile-back-btn-container">
                        <button class="user-profile-back-btn" onclick="window.history.back()">← Back</button>
                    </div>

                    <h3>📊 Game Statistics</h3>
                    <div class="stats-grid">
                        <div class="stats-left">
                            <div class="stat-card">
                                <div class="stat-icon">🎮</div>
                                <div class="stat-info">
                                    <span class="stat-number">${stats.gamesPlayed}</span>
                                    <span class="stat-text">Total Games</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">🕹️</div>
                                <div class="stat-info">
                                    <span class="stat-number">${stats.gamesTried}</span>
                                    <span class="stat-text">Games Tried</span>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">📅</div>
                                <div class="stat-info">
                                    <span class="stat-number">${this.calculateDaysMember(user)}</span>
                                    <span class="stat-text">Days Member</span>
                                </div>
                            </div>
                        </div>
                        <div class="stats-right">
                            <div class="level-card-container">
                                ${levelCardHTML}
                            </div>
                        </div>
                    </div>

                    <div id="weeklyStandingsSection" class="weekly-standings-section" style="display:none;"></div>

                    <h3>🏆 High Scores by Game</h3>
                    <div class="high-scores-list">
                        <div id="publicHighScoresContainer">
                            ${highScoresHTML}
                        </div>
                    </div>

                    <h3>🎯 Recent Activity</h3>
                    <div class="activity-list">
                        <div id="publicRecentActivityContainer">
                            ${recentActivityHTML}
                        </div>
                    </div>

                    <h3>⚙️ Account Info</h3>
                    <div class="settings-section">
                        <div class="setting-item">
                            <div class="setting-info">
                                <strong>Account Type</strong>
                                <span class="setting-value">${this.getAccountType(user)}</span>
                            </div>
                        </div>
                        <div class="setting-item">
                            <div class="setting-info">
                                <strong>Member Since</strong>
                                <span class="setting-value">${memberSince}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Build avatar HTML for the profile header.
     */
    buildAvatarHTML(steemUsername) {
        if (steemUsername) {
            const url = steemAvatarService.getAvatarUrl(steemUsername, 'large');
            return `<img src="${url}" alt="${steemUsername}" class="avatar-img-full" onerror="this.replaceWith(document.createTextNode('⚡'))">`;
        }
        return '🎮';
    }

    /**
     * Build high scores HTML list.
     */
    buildHighScoresHTML(gameScores) {
        if (!gameScores || gameScores.length === 0) {
            return '<p class="text-muted">No high scores yet.</p>';
        }

        return gameScores.map(gs => {
            const thumbnailUrl = gs.thumbnail
                ? getGamePreviewUrl(gs.game_id, gs.thumbnail)
                : 'https://via.placeholder.com/100x75?text=No+Image';

            return `
                <div class="high-score-item">
                    <div class="high-score-game">
                        <div class="high-score-thumbnail"><img src="${thumbnailUrl}" alt="${this.escapeHTML(gs.game_title)}"></div>
                        <div class="high-score-game-name">${this.escapeHTML(gs.game_title)}</div>
                    </div>
                    <div class="high-score-value">🏆 ${gs.high_score.toLocaleString()}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Build recent activity HTML list.
     */
    buildRecentActivityHTML(recentActivity) {
        if (!recentActivity || recentActivity.length === 0) {
            return '<p class="text-muted">No recent activity</p>';
        }

        return recentActivity.map(activity => {
            const activityDate = new Date(activity.timestamp);
            return `
                <div class="activity-item">
                    <div>
                        <div class="activity-game">${this.escapeHTML(activity.game_name)}</div>
                        <div class="activity-details">Score: ${activity.score} • XP: +${activity.xp_earned.toFixed(2)}</div>
                    </div>
                    <div class="activity-time">${activityDate.toLocaleDateString()} ${activityDate.toLocaleTimeString()}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Build level card HTML.
     */
    buildLevelCardHTML(levelInfo, totalXP) {
        const color = levelInfo.color || '#6366f1';
        const xpInLevel = levelInfo?.xp_in_level ?? 0;
        const xpRequiredForNext = levelInfo?.xp_required_for_next_level ?? levelInfo?.xp_needed_for_next ?? 0;
        const xpToNext = levelInfo?.xp_to_next_level ?? Math.max(0, (xpRequiredForNext || 0) - xpInLevel);
        const progressPercent = levelInfo.progress_percent || 0;

        const rightColumn = xpToNext > 0
            ? `<div style="display:flex;flex-direction:column;gap:4px;">
                    <span style="font-size:11px;color:rgba(255,255,255,0.6);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">🎯 Next lvl</span>
                    <span style="font-size:18px;font-weight:800;color:${color};text-shadow:0 1px 3px rgba(0,0,0,0.3);">${xpToNext.toFixed(0)}</span>
                </div>`
            : `<div style="grid-column:1/-1;text-align:center;padding:8px;background:linear-gradient(135deg,#FFD70033,#FFA50033);border-radius:6px;border:1px solid #FFD70044;">
                    <span style="font-weight:800;font-size:14px;color:#FFD700;text-shadow:0 1px 3px rgba(0,0,0,0.4);letter-spacing:0.5px;">🏆 MAX LEVEL</span>
                </div>`;

        return `
            <div style="width:100%;padding:16px;background:linear-gradient(135deg,${color}20,${color}08);border-radius:var(--radius-md);border:2px solid ${color}55;box-shadow:0 4px 12px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.05);box-sizing:border-box;">
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
                    <div style="width:64px;height:64px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,${color}33,${color}11);border-radius:50%;border:3px solid ${color}66;box-shadow:0 4px 12px ${color}44;">
                        <span style="font-size:38px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));">${levelInfo.badge}</span>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:24px;font-weight:800;color:${color};text-shadow:0 2px 4px rgba(0,0,0,0.3);letter-spacing:0.5px;margin-bottom:4px;">Level ${levelInfo.current_level}</div>
                        <div style="font-size:15px;font-weight:600;color:#fff;opacity:0.95;text-transform:uppercase;letter-spacing:1px;">${levelInfo.title}</div>
                    </div>
                </div>
                <div style="margin-bottom:14px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:rgba(255,255,255,0.75);margin-bottom:6px;">
                        <span style="font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Progress</span>
                        <span style="font-weight:800;font-size:14px;color:${color};text-shadow:0 1px 2px rgba(0,0,0,0.3);">${progressPercent.toFixed(1)}%</span>
                    </div>
                    <div style="height:12px;background:rgba(0,0,0,0.3);border-radius:6px;overflow:hidden;box-shadow:inset 0 2px 6px rgba(0,0,0,0.4);position:relative;">
                        <div style="height:100%;background:linear-gradient(90deg,${color},#8b5cf6,${color});width:${progressPercent}%;transition:width 0.6s cubic-bezier(0.4,0,0.2,1);box-shadow:0 0 12px ${color}aa,inset 0 1px 0 rgba(255,255,255,0.2);"></div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px;background:rgba(0,0,0,0.2);border-radius:10px;border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        <span style="font-size:11px;color:rgba(255,255,255,0.6);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">💰 Total XP</span>
                        <span style="font-size:18px;font-weight:800;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.3);">${totalXP.toFixed(0)}</span>
                    </div>
                    ${rightColumn}
                </div>
            </div>
        `;
    }

    // ───────── UI State Methods ─────────

    showLoadingState() {
        this.appContainer.innerHTML = `
            <div class="profile">
                <div class="loading">Loading user profile...</div>
            </div>
        `;
    }

    showNotFoundState() {
        this.appContainer.innerHTML = `
            <div class="profile">
                <div class="error-message" style="text-align:center;padding:40px 20px;">
                    <h2>👤 User Not Found</h2>
                    <p>The user profile you're looking for doesn't exist.</p>
                    <button class="play-game-btn" onclick="window.history.back()">← Go Back</button>
                </div>
            </div>
        `;
    }

    showErrorState() {
        this.appContainer.innerHTML = `
            <div class="profile">
                <div class="error-message" style="text-align:center;padding:40px 20px;">
                    <h2>⚠️ Error</h2>
                    <p>Failed to load user profile. Please try again later.</p>
                    <button class="play-game-btn" onclick="window.history.back()">← Go Back</button>
                </div>
            </div>
        `;
    }

    // ───────── Steem UI Updates ─────────

    updateAvatarWithSteemData(steemProfile) {
        const avatarIcon = document.getElementById('publicAvatarIcon');
        const avatarCircle = avatarIcon?.closest('.avatar-circle');

        if (!avatarIcon || !steemProfile.profileImage) {
            return;
        }

        avatarIcon.style.backgroundImage = `url(${steemProfile.profileImage})`;
        avatarIcon.style.backgroundSize = 'cover';
        avatarIcon.style.backgroundPosition = 'center';
        avatarIcon.style.width = '100%';
        avatarIcon.style.height = '100%';
        avatarIcon.textContent = '';
        avatarIcon.innerHTML = '';

        if (avatarCircle) {
            avatarCircle.style.background = 'transparent';
            avatarCircle.style.border = '4px solid rgba(255, 255, 255, 0.8)';
        }
    }

    updateCoverWithSteemData(steemProfile) {
        const profileHeader = document.getElementById('publicProfileHeader');

        if (profileHeader && steemProfile.coverImage) {
            profileHeader.style.backgroundImage = `url(${steemProfile.coverImage})`;
            profileHeader.style.backgroundSize = 'cover';
            profileHeader.style.backgroundPosition = 'center';
        }
    }

    // ───────── Helpers ─────────

    extractSteemUsername(user) {
        if (user.steemUsername || user.steem_username) {
            return user.steemUsername || user.steem_username;
        }
        if (user.email && user.email.endsWith('@steem.local')) {
            return user.email.replace('@steem.local', '');
        }
        if (user.username && !user.is_anonymous) {
            return user.username;
        }
        return null;
    }

    getDisplayName(user) {
        if (user.is_anonymous) {
            return `Guest #${user.user_id.slice(-6)}`;
        }
        const steemUsername = this.extractSteemUsername(user);
        return steemUsername || user.username || 'User';
    }

    getUserType(user) {
        if (user.is_anonymous) {
            return '👤 Anonymous Player';
        }
        const steemUsername = this.extractSteemUsername(user);
        return steemUsername ? '⚡ Steem Verified Player' : '🎮 Registered Player';
    }

    getAccountType(user) {
        if (user.is_anonymous) {
            return 'Anonymous (Guest)';
        }
        const steemUsername = this.extractSteemUsername(user);
        return steemUsername ? 'Steem Keychain' : 'Standard Account';
    }

    calculateDaysMember(user) {
        if (!user.created_at) {
            return 0;
        }
        const createdDate = new Date(user.created_at);
        const now = new Date();
        return Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
    }

    getApiUrl() {
        return window.ENV?.API_URL || config.API_URL || window.location.origin;
    }

    /**
     * Escape HTML to prevent XSS.
     * @param {string} text
     * @returns {string}
     */
    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Render a public user profile page.
 * @param {Object} params - Route params containing id
 */
export async function renderUserProfile(params) {
    const userId = params?.id;

    if (!userId) {
        document.getElementById('app').innerHTML = `
            <div class="profile">
                <div class="error-message" style="text-align:center;padding:40px 20px;">
                    <h2>⚠️ Invalid User</h2>
                    <p>No user ID provided.</p>
                    <button class="play-game-btn" onclick="window.history.back()">← Go Back</button>
                </div>
            </div>
        `;
        return;
    }

    const renderer = new UserProfileRenderer(userId);
    await renderer.render();
}
