import { getUserSessions, getGameResourceUrl } from './api.js';
import { SteemProfileService } from './SteemProfileService.js';

/**
 * Profile page renderer with refactored architecture
 */
class ProfileRenderer {
    constructor() {
        this.appContainer = document.getElementById('app');
        this.authManager = window.AuthManager;
    }

    /**
     * Main render method
     */
    async render() {
        if (!this.isUserAuthenticated()) {
            this.renderLoginRequired();
            return;
        }

        const user = await this.loadUserData();
        const sessions = await this.loadUserSessions(user.user_id);
        const stats = this.calculateStats(sessions);
        const steemProfile = await this.loadSteemProfile(user);

        this.renderProfilePage(user, stats, steemProfile);
    }

    /**
     * Check if user is authenticated
     */
    isUserAuthenticated() {
        return this.authManager && this.authManager.isLoggedIn();
    }

    /**
     * Render login required message
     */
    renderLoginRequired() {
        this.appContainer.innerHTML = `
            <div class="about text-center">
                <h2>🔒 Login Required</h2>
                <p>You need to be logged in to view your profile.</p>
                <button class="play-game-btn" onclick="window.location.hash = '/'">Go to Games</button>
            </div>
        `;
    }

    /**
     * Load user data from server
     */
    async loadUserData() {
        const cachedUser = this.authManager.getUser();

        try {
            const response = await fetch(`http://localhost:8000/users/users/${cachedUser.user_id}`);
            if (response.ok) {
                const userData = await response.json();
                return userData.user;
            }
            console.error('Failed to fetch user data:', response.status, response.statusText);
        } catch (error) {
            console.error('Error fetching fresh user data:', error);
        }

        return cachedUser;
    }

    /**
     * Load user sessions
     */
    async loadUserSessions(userId) {
        const sessionsData = await getUserSessions(userId);
        return sessionsData.sessions || [];
    }

    /**
     * Calculate user statistics from sessions
     */
    calculateStats(sessions) {
        const stats = {
            gamesPlayed: sessions.length,
            totalPlayTimeSeconds: 0,
            highScore: 0,
            recentActivity: []
        };

        sessions.forEach(session => {
            this.processSessionForStats(session, stats);
        });

        stats.totalPlayTime = this.formatPlayTime(stats.totalPlayTimeSeconds);

        return stats;
    }

    /**
     * Process individual session for statistics
     */
    processSessionForStats(session, stats) {
        // Calculate session duration
        if (session.ended_at && session.started_at) {
            const durationSeconds = (new Date(session.ended_at) - new Date(session.started_at)) / 1000;
            stats.totalPlayTimeSeconds += durationSeconds;
        }

        // Track highest score
        const sessionScore = session.final_score || session.score || 0;
        if (sessionScore > stats.highScore) {
            stats.highScore = sessionScore;
        }

        // Add to recent activity (max 10)
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
     * Format play time from seconds to human readable string
     */
    formatPlayTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    /**
     * Load Steem profile if available
     */
    async loadSteemProfile(user) {
        const steemUsername = this.extractSteemUsername(user);

        if (!steemUsername) {
            return null;
        }

        return await fetchSteemProfile(steemUsername);
    }

    /**
     * Extract Steem username from user data
     */
    extractSteemUsername(user) {
        // Direct Steem username field
        if (user.steemUsername || user.steem_username) {
            return user.steemUsername || user.steem_username;
        }

        // Extract from email if ends with @steem.local
        if (user.email && user.email.endsWith('@steem.local')) {
            return user.email.replace('@steem.local', '');
        }

        // Use username if not anonymous
        if (user.username && !user.is_anonymous) {
            return user.username;
        }

        return null;
    }

    /**
     * Render complete profile page
     */
    renderProfilePage(user, stats, steemProfile) {
        const template = document.getElementById('profile-template');
        const profileContent = template.content.cloneNode(true);

        this.populateProfileHeader(profileContent, user, steemProfile);
        this.populateProfileStats(profileContent, user, stats);
        this.populateAccountSettings(profileContent, user);

        this.appContainer.innerHTML = '';
        this.appContainer.appendChild(profileContent);

        this.populateRecentActivity(stats.recentActivity);
        this.populateHighScores(user.game_scores_enriched);
    }

    /**
     * Populate profile header section
     */
    populateProfileHeader(content, user, steemProfile) {
        const profileHeader = content.querySelector('.profile-header');
        const avatarCircle = content.querySelector('.avatar-circle');
        const avatarIcon = content.querySelector('.avatar-icon');

        this.setAvatar(avatarCircle, avatarIcon, user, steemProfile);
        this.setHeaderBackground(profileHeader, steemProfile);
        this.setUserInfo(content, user);
    }

    /**
     * Set user avatar
     */
    setAvatar(avatarCircle, avatarIcon, user, steemProfile) {
        if (steemProfile && steemProfile.profileImage) {
            this.setSteemAvatar(avatarCircle, avatarIcon, steemProfile.profileImage);
        } else {
            this.setEmojiAvatar(avatarIcon, user);
        }
    }

    /**
     * Set Steem profile image as avatar
     */
    setSteemAvatar(avatarCircle, avatarIcon, profileImage) {
        avatarIcon.style.backgroundImage = `url(${profileImage})`;
        avatarIcon.style.backgroundSize = 'cover';
        avatarIcon.style.backgroundPosition = 'center';
        avatarIcon.style.width = '100%';
        avatarIcon.style.height = '100%';
        avatarIcon.textContent = '';
        avatarCircle.style.background = 'transparent';
        avatarCircle.style.border = '4px solid rgba(255, 255, 255, 0.8)';
    }

    /**
     * Set emoji avatar based on user type
     */
    setEmojiAvatar(avatarIcon, user) {
        const steemUsername = this.extractSteemUsername(user);
        let avatarEmoji = '🎮';

        if (user.is_anonymous) {
            avatarEmoji = '👤';
        } else if (steemUsername) {
            avatarEmoji = '⚡';
        }

        avatarIcon.textContent = avatarEmoji;
    }

    /**
     * Set header background image
     */
    setHeaderBackground(profileHeader, steemProfile) {
        if (steemProfile && steemProfile.coverImage) {
            profileHeader.style.backgroundImage = `url(${steemProfile.coverImage})`;
            profileHeader.style.backgroundSize = 'cover';
            profileHeader.style.backgroundPosition = 'center';
        }
    }

    /**
     * Set user information
     */
    setUserInfo(content, user) {
        const displayName = this.getDisplayName(user);
        const userType = this.getUserType(user);

        content.querySelector('.profile-username').textContent = displayName;
        content.querySelector('.profile-type').textContent = userType;
    }

    /**
     * Get display name for user
     */
    getDisplayName(user) {
        if (user.is_anonymous) {
            return `Guest #${user.user_id.slice(-6)}`;
        }

        const steemUsername = this.extractSteemUsername(user);
        return steemUsername || user.username || 'User';
    }

    /**
     * Get user type label
     */
    getUserType(user) {
        if (user.is_anonymous) {
            return '👤 Anonymous Player';
        }

        const steemUsername = this.extractSteemUsername(user);
        return steemUsername ? '⚡ Steem Verified Player' : '🎮 Registered Player';
    }

    /**
     * Populate profile statistics
     */
    populateProfileStats(content, user, stats) {
        const multiplier = user.cur8_multiplier || 1.0;
        const totalCur8 = user.total_xp_earned || 0;

        content.querySelector('.stat-value.multiplier').textContent = `${multiplier}x`;
        content.querySelector('.stat-value.total-cur8').textContent = `💰 ${totalCur8.toFixed(2)} XP`;
        content.querySelector('#gamesPlayed').textContent = stats.gamesPlayed;
        content.querySelector('#totalPlayTime').textContent = stats.totalPlayTime;
        content.querySelector('#cur8Earned').textContent = `${totalCur8.toFixed(2)}`;
    }

    /**
     * Populate account settings
     */
    populateAccountSettings(content, user) {
        content.querySelector('#userId').textContent = `#${user.user_id.slice(-8)}`;
        content.querySelector('#accountType').textContent = this.getAccountType(user);

        const createdDate = user.created_at ? new Date(user.created_at) : new Date();
        content.querySelector('#memberSince').textContent = createdDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Get account type label
     */
    getAccountType(user) {
        if (user.is_anonymous) {
            return 'Anonymous (Guest)';
        }

        const steemUsername = this.extractSteemUsername(user);
        return steemUsername ? 'Steem Keychain' : 'Standard Account';
    }

    /**
     * Populate recent activity list
     */
    populateRecentActivity(recentActivity) {
        if (!recentActivity || recentActivity.length === 0) {
            return;
        }

        const activityList = document.getElementById('recentActivity');
        activityList.innerHTML = '';

        recentActivity.forEach(activity => {
            const activityItem = this.createActivityItem(activity);
            activityList.appendChild(activityItem);
        });
    }

    /**
     * Create activity item element
     */
    createActivityItem(activity) {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';

        const activityDate = new Date(activity.timestamp);
        activityItem.innerHTML = `
            <div>
                <div class="activity-game">${activity.game_name}</div>
                <div class="activity-details">Score: ${activity.score} • XP: +${activity.xp_earned.toFixed(2)}</div>
            </div>
            <div class="activity-time">${activityDate.toLocaleDateString()} ${activityDate.toLocaleTimeString()}</div>
        `;

        return activityItem;
    }

    /**
     * Populate high scores list
     */
    populateHighScores(gameScores) {
        if (!gameScores || gameScores.length === 0) {
            return;
        }

        const highScoresList = document.getElementById('highScoresList');
        highScoresList.innerHTML = '';

        gameScores.forEach(gameScore => {
            const highScoreItem = this.createHighScoreItem(gameScore);
            highScoresList.appendChild(highScoreItem);
        });
    }

    /**
     * Create high score item element
     */
    createHighScoreItem(gameScore) {
        const highScoreItem = document.createElement('div');
        highScoreItem.className = 'high-score-item';

        const thumbnailUrl = this.getGameThumbnailUrl(gameScore);
        const thumbnailHTML = `<img src="${thumbnailUrl}" alt="${gameScore.game_title}">`;

        highScoreItem.innerHTML = `
            <div class="high-score-game">
                <div class="high-score-thumbnail">${thumbnailHTML}</div>
                <div class="high-score-game-name">${gameScore.game_title}</div>
            </div>
            <div class="high-score-value">🏆 ${gameScore.high_score.toLocaleString()}</div>
        `;

        return highScoreItem;
    }

    /**
     * Get game thumbnail URL
     */
    getGameThumbnailUrl(gameScore) {
        if (!gameScore.thumbnail) {
            return 'https://via.placeholder.com/100x75?text=No+Image';
        }

        return gameScore.thumbnail.startsWith('http')
            ? gameScore.thumbnail
            : getGameResourceUrl(gameScore.game_id, gameScore.thumbnail);
    }
}
/**
 * Render the profile page
 */

export async function renderProfile() {
    const renderer = new ProfileRenderer();
    await renderer.render();
}

/**
 * Fetch Steem user profile data
 * @param {string} username - Steem username
 * @returns {Promise<Object|null>} Profile data or null
 */
export async function fetchSteemProfile(username) {
    return steemProfileService.fetchProfile(username);
}

export const steemProfileService = new SteemProfileService();