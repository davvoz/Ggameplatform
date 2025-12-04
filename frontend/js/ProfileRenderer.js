import { getUserSessions, getGameResourceUrl } from './api.js';
import { SteemProfileService } from './SteemProfileService.js';
import { config } from './config.js';

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

        // Get cached user data for immediate rendering
        const cachedUser = this.authManager.getUser();
        
        // Render page immediately with cached data and loading placeholders
        await this.renderProfilePageSkeleton(cachedUser);

        // Load all data in background (non-blocking)
        this.loadProfileDataAsync(cachedUser);
    }

    /**
     * Load profile data asynchronously and update UI progressively
     */
    async loadProfileDataAsync(cachedUser) {
        try {
            // Load user data from server (fresher data)
            const userPromise = this.loadUserData();
            const sessionsPromise = this.loadUserSessions(cachedUser.user_id);

            // Wait for both user and sessions
            const [user, sessions] = await Promise.all([userPromise, sessionsPromise]);
            
            // Calculate stats immediately after sessions arrive
            const stats = this.calculateStats(sessions);
            
            // Update stats section
            this.updateStatsSection(user, stats);
            this.populateRecentActivity(stats.recentActivity);
            this.populateHighScores(user.game_scores_enriched);

            // Load Steem profile in background (slowest operation)
            this.loadSteemProfile(user).then(steemProfile => {
                if (steemProfile) {
                    this.updateProfileWithSteemData(user, steemProfile);
                }
            }).catch(error => {
                console.warn('Failed to load Steem profile:', error);
            });

        } catch (error) {
            console.error('❌ Error loading profile data:', error);
        }
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
        console.log('📊 Loading user data for:', cachedUser?.user_id);

        try {
            const API_URL = window.ENV?.API_URL || config.API_URL;
            const url = `${API_URL}/users/${cachedUser.user_id}`;
            console.log('🔗 Fetching from:', url);
            const response = await fetch(url);
            if (response.ok) {
                const userData = await response.json();
                console.log('✅ Fetched fresh user data from server:', userData);
                return userData.user;
            }
            console.error('❌ Failed to fetch user data:', response.status, response.statusText);
        } catch (error) {
            console.error('❌ Error fetching fresh user data:', error);
        }

        console.log('↩️ Using cached user data');
        return cachedUser;
    }

    /**
     * Load user sessions
     */
    async loadUserSessions(userId) {
        console.log('🎮 Loading sessions for user:', userId);
        try {
            const sessionsData = await getUserSessions(userId);
            console.log('✅ Sessions loaded:', sessionsData?.sessions?.length || 0);
            return sessionsData.sessions || [];
        } catch (error) {
            console.error('❌ Error loading sessions:', error);
            return [];
        }
    }

    /**
     * Calculate user statistics from sessions
     */
    calculateStats(sessions) {
        console.log('📊 Calculating stats from', sessions.length, 'sessions');
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
        console.log('✅ Stats calculated:', stats);

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

        const steemProfile = await fetchSteemProfile(steemUsername);
        
        // Update multiplier from Steem data if available
        if (steemProfile && steemProfile.votesCur8Witness !== undefined) {
            try {
                const API_URL = window.ENV?.API_URL || window.location.origin;
                
                // Send real Steem data to backend for multiplier update
                const response = await fetch(`${API_URL}/users/update-steem-data/${user.user_id}?votes_witness=${steemProfile.votesCur8Witness}&delegation_amount=${steemProfile.delegationAmount || 0}`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Multiplier updated from Steem profile:', result);
                    
                    // Update user object with new multiplier
                    user.cur8_multiplier = result.cur8_multiplier;
                    user.votes_cur8_witness = result.votes_cur8_witness;
                    user.delegation_amount = result.delegation_amount;
                } else {
                    console.warn('Failed to update multiplier:', response.status);
                }
            } catch (error) {
                console.warn('Failed to update multiplier from Steem data:', error);
            }
        }
        
        return steemProfile;
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
    async renderProfilePage(user, stats, steemProfile) {
        const template = document.getElementById('profile-template');
        const profileContent = template.content.cloneNode(true);

        this.populateProfileHeader(profileContent, user, steemProfile);
        await this.populateProfileStats(profileContent, user, stats);
        this.populateAccountSettings(profileContent, user);

        this.appContainer.innerHTML = '';
        this.appContainer.appendChild(profileContent);

        this.populateRecentActivity(stats.recentActivity);
        this.populateHighScores(user.game_scores_enriched);
        
        // Load coin balance in header badge
        this.loadCoinBalanceHeader(user.user_id);
    }

    /**
     * Render profile page skeleton with cached data
     */
    async renderProfilePageSkeleton(user) {
        const template = document.getElementById('profile-template');
        const profileContent = template.content.cloneNode(true);

        // Populate with cached user data (no Steem profile yet)
        this.populateProfileHeader(profileContent, user, null);
        
        // Populate stats with loading placeholders
        const loadingStats = {
            gamesPlayed: 0,
            totalPlayTime: 'Loading...',
            highScore: 0,
            recentActivity: []
        };
        await this.populateProfileStats(profileContent, user, loadingStats);
        this.populateAccountSettings(profileContent, user);

        this.appContainer.innerHTML = '';
        this.appContainer.appendChild(profileContent);

        // Show loading in activity sections
        const activityContainer = document.getElementById('recentActivityContainer');
        if (activityContainer) {
            activityContainer.innerHTML = '<div class="loading-placeholder">Loading recent activity...</div>';
        }

        const highScoresContainer = document.getElementById('highScoresContainer');
        if (highScoresContainer) {
            highScoresContainer.innerHTML = '<div class="loading-placeholder">Loading high scores...</div>';
        }
        
        // Load coin balance in header badge
        this.loadCoinBalanceHeader(user.user_id);
    }

    /**
     * Update stats section with fresh data
     */
    updateStatsSection(user, stats) {
        // Update stat values using IDs (the data-stat attributes are added for future use)
        const gamesPlayedEl = document.getElementById('gamesPlayed');
        if (gamesPlayedEl) gamesPlayedEl.textContent = stats.gamesPlayed;

        const playTimeEl = document.getElementById('totalPlayTime');
        if (playTimeEl) playTimeEl.textContent = stats.totalPlayTime;

        // Note: cur8Earned is updated by populateProfileStats with level widget
        // Just reload the whole stats section properly
        const cur8EarnedEl = document.getElementById('cur8Earned');
        if (cur8EarnedEl && !cur8EarnedEl.closest('.stat-card').querySelector('[style*="Level"]')) {
            cur8EarnedEl.textContent = user.total_xp_earned?.toFixed(2) || '0.00';
        }
    }

    /**
     * Update profile with Steem data
     */
    updateProfileWithSteemData(user, steemProfile) {
        // Update avatar if Steem profile has one
        const avatarCircle = document.querySelector('.avatar-circle');
        const avatarIcon = document.querySelector('.avatar-icon');
        if (avatarCircle && avatarIcon) {
            this.setAvatar(avatarCircle, avatarIcon, user, steemProfile);
        }

        // Update header background
        const profileHeader = document.querySelector('.profile-header');
        if (profileHeader) {
            this.setHeaderBackground(profileHeader, steemProfile);
        }

        // Refresh multiplier display if changed
        const multiplierBadge = document.querySelector('.stat-badge[data-stat="multiplier"]');
        if (multiplierBadge && user.cur8_multiplier) {
            multiplierBadge.textContent = `${user.cur8_multiplier.toFixed(2)}x`;
        }
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
    async populateProfileStats(content, user, stats) {
        console.log('📊 populateProfileStats called with:', { user, stats });
        console.log('📄 Content element:', content);
        
        const multiplier = user.cur8_multiplier || 1.0;
        const totalXP = user.total_xp_earned || 0;

        // Fetch level info from API
        let levelInfo = null;
        try {
            const API_URL = window.ENV?.API_URL || window.location.origin;
            const response = await fetch(`${API_URL}/api/levels/${user.user_id}`);
            if (response.ok) {
                levelInfo = await response.json();
            }
        } catch (error) {
            console.error('Failed to load level info:', error);
        }

        const multiplierEl = content.querySelector('.stat-value.multiplier');
        
        if (multiplierEl) {
            // Fetch multiplier breakdown
            try {
                const API_URL = window.ENV?.API_URL || window.location.origin;
                const breakdownResponse = await fetch(`${API_URL}/users/multiplier-breakdown/${user.user_id}`);
                
                if (breakdownResponse.ok) {
                    const breakdownData = await breakdownResponse.json();
                    const breakdown = breakdownData.breakdown;
                    
                    // Find the parent stat-badge (it's in the header, not stat-card)
                    const parentBadge = multiplierEl.closest('.stat-badge');
                    
                    if (parentBadge) {
                        // Make it clickable
                        parentBadge.style.cursor = 'pointer';
                        parentBadge.style.transition = 'all 0.3s';
                        
                        // Update the value
                        multiplierEl.textContent = `${breakdown.final_multiplier.toFixed(2)}x`;
                        multiplierEl.style.color = '#6366f1';
                        multiplierEl.style.fontWeight = '700';
                        
                        // Add click handler
                        parentBadge.onclick = () => {
                            this.showMultiplierModal(breakdown);
                        };
                        
                        // Add hover effect
                        parentBadge.onmouseenter = () => {
                            parentBadge.style.transform = 'scale(1.05)';
                            parentBadge.style.background = 'rgba(99, 102, 241, 0.1)';
                        };
                        parentBadge.onmouseleave = () => {
                            parentBadge.style.transform = 'scale(1)';
                            parentBadge.style.background = '';
                        };
                        
                        console.log('✅ Multiplier badge configured:', breakdown.final_multiplier.toFixed(2));
                    }
                } else {
                    multiplierEl.textContent = `${multiplier}x`;
                }
            } catch (error) {
                console.error('Failed to load multiplier breakdown:', error);
                multiplierEl.textContent = `${multiplier}x`;
            }
        }
        
        // Update header XP badge with level info
        const totalCur8Element = content.querySelector('.stat-value.total-cur8');
        if (levelInfo && totalCur8Element) {
            totalCur8Element.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: linear-gradient(135deg, ${levelInfo.color || '#6366f1'}18, transparent); border-radius: 10px; border: 2px solid ${levelInfo.color || '#6366f1'}55;">
                    <span style="font-size: 28px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));">${levelInfo.badge}</span>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="font-weight: 800; font-size: 16px; color: ${levelInfo.color || '#6366f1'}; text-shadow: 0 1px 3px rgba(0,0,0,0.3); letter-spacing: 0.5px;">Lv${levelInfo.current_level}</span>
                        <span style="font-size: 11px; opacity: 0.85; font-weight: 600;">${totalXP.toFixed(0)} XP</span>
                    </div>
                </div>
            `;
        } else if (totalCur8Element) {
            totalCur8Element.textContent = `💰 ${totalXP.toFixed(2)} XP`;
        }
        
        const gamesPlayedEl = content.querySelector('#gamesPlayed');
        const totalPlayTimeEl = content.querySelector('#totalPlayTime');
        const cur8EarnedEl = content.querySelector('#cur8Earned');
        
        if (gamesPlayedEl) gamesPlayedEl.textContent = stats.gamesPlayed;
        if (totalPlayTimeEl) totalPlayTimeEl.textContent = stats.totalPlayTime;
        
        // Update XP card with detailed level info
        if (cur8EarnedEl) {
            if (levelInfo) {
                // Replace entire card content with level widget
                const parentCard = cur8EarnedEl.closest('.stat-card');
                if (parentCard) {
                    parentCard.innerHTML = `
                        <div style="padding: 20px; background: linear-gradient(135deg, ${levelInfo.color || '#6366f1'}20, ${levelInfo.color || '#6366f1'}08); border-radius: 16px; border: 2px solid ${levelInfo.color || '#6366f1'}55; box-shadow: 0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05);">
                            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                                <div style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, ${levelInfo.color || '#6366f1'}33, ${levelInfo.color || '#6366f1'}11); border-radius: 50%; border: 3px solid ${levelInfo.color || '#6366f1'}66; box-shadow: 0 4px 12px ${levelInfo.color || '#6366f1'}44;">
                                    <span style="font-size: 38px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));">${levelInfo.badge}</span>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 24px; font-weight: 800; color: ${levelInfo.color || '#6366f1'}; text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 0.5px; margin-bottom: 4px;">
                                        Level ${levelInfo.current_level}
                                    </div>
                                    <div style="font-size: 15px; font-weight: 600; color: #fff; opacity: 0.95; text-transform: uppercase; letter-spacing: 1px;">
                                        ${levelInfo.title}
                                    </div>
                                </div>
                            </div>
                            <div style="margin-bottom: 14px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: rgba(255,255,255,0.75); margin-bottom: 6px;">
                                    <span style="font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Progress</span>
                                    <span style="font-weight: 800; font-size: 14px; color: ${levelInfo.color || '#6366f1'}; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${levelInfo.progress_percent.toFixed(1)}%</span>
                                </div>
                                <div style="height: 12px; background: rgba(0,0,0,0.3); border-radius: 6px; overflow: hidden; box-shadow: inset 0 2px 6px rgba(0,0,0,0.4); position: relative;">
                                    <div style="height: 100%; background: linear-gradient(90deg, ${levelInfo.color || '#6366f1'}, #8b5cf6, ${levelInfo.color || '#6366f1'}); width: ${levelInfo.progress_percent}%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 12px ${levelInfo.color || '#6366f1'}aa, inset 0 1px 0 rgba(255,255,255,0.2);"></div>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="display: flex; flex-direction: column; gap: 4px;">
                                    <span style="font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">💰 XP Totali</span>
                                    <span style="font-size: 18px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${totalXP.toFixed(0)}</span>
                                </div>
                                ${levelInfo.xp_needed_for_next > 0 ? `
                                <div style="display: flex; flex-direction: column; gap: 4px;">
                                    <span style="font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🎯 Next Lv</span>
                                    <span style="font-size: 18px; font-weight: 800; color: ${levelInfo.color || '#6366f1'}; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${levelInfo.xp_needed_for_next.toFixed(0)}</span>
                                </div>
                                ` : '<div style="grid-column: 1 / -1; text-align: center; padding: 8px; background: linear-gradient(135deg, #FFD70033, #FFA50033); border-radius: 6px; border: 1px solid #FFD70044;"><span style="font-weight: 800; font-size: 14px; color: #FFD700; text-shadow: 0 1px 3px rgba(0,0,0,0.4); letter-spacing: 0.5px;">🏆 MAX LEVEL</span></div>'}
                            </div>
                        </div>
                    `;
                }
            } else {
                cur8EarnedEl.textContent = `${totalXP.toFixed(2)}`;
            }
        }
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
        const activityContainer = document.getElementById('recentActivityContainer');
        if (!activityContainer) return;

        if (!recentActivity || recentActivity.length === 0) {
            activityContainer.innerHTML = '<p class="text-muted">No recent activity</p>';
            return;
        }

        activityContainer.innerHTML = '';

        recentActivity.forEach(activity => {
            const activityItem = this.createActivityItem(activity);
            activityContainer.appendChild(activityItem);
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
        const highScoresContainer = document.getElementById('highScoresContainer');
        if (!highScoresContainer) return;

        if (!gameScores || gameScores.length === 0) {
            highScoresContainer.innerHTML = '<p class="text-muted">No high scores yet. Start playing to set records!</p>';
            return;
        }

        highScoresContainer.innerHTML = '';

        gameScores.forEach(gameScore => {
            const highScoreItem = this.createHighScoreItem(gameScore);
            highScoresContainer.appendChild(highScoreItem);
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

    /**
     * Load coin balance for header badge
     */
    async loadCoinBalanceHeader(userId) {
        console.log('🪙 Loading coin balance for header');
        const coinBalanceEl = document.getElementById('coinBalanceHeader');
        const coinsBadge = document.getElementById('coinsQuickBadge');
        if (!coinBalanceEl) return;

        try {
            const API_URL = window.ENV?.API_URL || config.API_URL;
            const response = await fetch(`${API_URL}/api/coins/${userId}/balance`);
            if (response.ok) {
                const data = await response.json();
                const balance = data.balance || 0;
                coinBalanceEl.innerHTML = `
                    <span style="font-size: 20px; font-weight: 800; color: #eab308; text-shadow: 0 2px 4px rgba(234, 179, 8, 0.5);">
                        ${balance.toLocaleString()}
                    </span>
                `;
                console.log('✅ Coin balance loaded:', balance);
                
                // Add hover and click effects to badge
                if (coinsBadge) {
                    coinsBadge.style.borderRadius = '10px';
                    coinsBadge.style.padding = '12px 16px';
                    coinsBadge.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(234, 179, 8, 0.05))';
                    coinsBadge.style.border = '2px solid rgba(234, 179, 8, 0.3)';
                    
                    coinsBadge.addEventListener('mouseenter', () => {
                        coinsBadge.style.transform = 'scale(1.05) translateY(-2px)';
                        coinsBadge.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(234, 179, 8, 0.1))';
                        coinsBadge.style.border = '2px solid rgba(234, 179, 8, 0.5)';
                        coinsBadge.style.boxShadow = '0 4px 12px rgba(234, 179, 8, 0.3)';
                    });
                    
                    coinsBadge.addEventListener('mouseleave', () => {
                        coinsBadge.style.transform = '';
                        coinsBadge.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(234, 179, 8, 0.05))';
                        coinsBadge.style.border = '2px solid rgba(234, 179, 8, 0.3)';
                        coinsBadge.style.boxShadow = '';
                    });
                    
                    coinsBadge.addEventListener('click', () => {
                        this.openWalletModal(userId);
                    });
                }
            } else {
                coinBalanceEl.textContent = '0';
            }
        } catch (error) {
            console.error('❌ Error loading coin balance:', error);
            coinBalanceEl.textContent = '--';
        }
    }

    /**
     * Open wallet modal
     */
    openWalletModal(userId) {
        console.log('🪙 Opening wallet modal for user:', userId);
        const modal = document.getElementById('walletModal');
        const container = document.getElementById('walletModalContainer');
        
        if (!modal || !container) {
            console.error('❌ Wallet modal not found');
            return;
        }

        // Show modal
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        
        // Load wallet widget
        if (!window.WalletProfileWidget) {
            container.innerHTML = '<p class="wallet-error">⚠️ Wallet widget not loaded</p>';
            return;
        }

        container.innerHTML = '<p class="text-muted">Loading wallet...</p>';
        
        const walletWidget = new window.WalletProfileWidget(container, userId);
        walletWidget.render().then(() => {
            console.log('✅ Wallet modal rendered');
        }).catch(error => {
            console.error('❌ Error rendering wallet modal:', error);
            container.innerHTML = '<p class="wallet-error">⚠️ Failed to load wallet</p>';
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    /**
     * Show multiplier breakdown modal
     */
    showMultiplierModal(breakdown) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease-out;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideUp 0.3s ease-out;">
                <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937;">⚡ CUR8 Multiplier</h2>
                        <button onclick="this.closest('[style*=fixed]').remove()" style="background: none; border: none; font-size: 28px; color: #9ca3af; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='none'">×</button>
                    </div>
                </div>
                
                <div style="padding: 24px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="font-size: 48px; font-weight: 800; color: #6366f1; text-shadow: 0 2px 10px rgba(99,102,241,0.3);">${breakdown.final_multiplier.toFixed(2)}x</div>
                        ${breakdown.is_capped ? '<div style="font-size: 14px; color: #f59e0b; font-weight: 600; margin-top: 8px;">🏆 MAXIMUM MULTIPLIER REACHED</div>' : ''}
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <span style="font-size: 14px; color: #6b7280; font-weight: 500;">Base Multiplier</span>
                            <span style="font-weight: 700; font-size: 18px; color: #1f2937;">+${breakdown.base.toFixed(1)}x</span>
                        </div>
                        
                        <div style="padding: 16px; background: ${breakdown.witness_bonus > 0 ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : '#fff'}; border-radius: 12px; border: 2px solid ${breakdown.witness_bonus > 0 ? '#86efac' : '#e5e7eb'}; margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 32px;">${breakdown.witness_bonus > 0 ? '✅' : '⬜'}</span>
                                    <div>
                                        <div style="font-size: 15px; color: #374151; font-weight: 600;">Witness Vote</div>
                                        <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${breakdown.witness_bonus > 0 ? 'Voting for cur8.witness' : 'Not voting yet'}</div>
                                    </div>
                                </div>
                                <span style="font-weight: 800; font-size: 20px; color: ${breakdown.witness_bonus > 0 ? '#16a34a' : '#9ca3af'};">+${breakdown.witness_bonus.toFixed(1)}x</span>
                            </div>
                        </div>
                        
                        <div style="padding: 16px; background: ${breakdown.delegation_bonus > 0 ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)' : '#fff'}; border-radius: 12px; border: 2px solid ${breakdown.delegation_bonus > 0 ? '#93c5fd' : '#e5e7eb'};">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 15px; color: #374151; font-weight: 600;">Steem Delegation</div>
                                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${breakdown.delegation_amount.toFixed(0)} STEEM delegated</div>
                                </div>
                                <span style="font-weight: 800; font-size: 20px; color: ${breakdown.delegation_bonus > 0 ? '#2563eb' : '#9ca3af'};">+${breakdown.delegation_bonus.toFixed(2)}x</span>
                            </div>
                        </div>
                        
                        <div style="height: 2px; background: linear-gradient(90deg, transparent, #d1d5db, transparent); margin: 20px 0;"></div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 16px; color: #1f2937; font-weight: 700;">Total Multiplier</span>
                            <span style="font-weight: 800; font-size: 24px; color: #6366f1;">${breakdown.final_multiplier.toFixed(2)}x</span>
                        </div>
                    </div>
                    
                    ${!breakdown.is_capped ? `
                        <div style="padding: 20px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 16px; border: 2px solid #fbbf24;">
                            <div style="font-size: 14px; color: #92400e; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                <span>💡</span>
                                <span>HOW TO BOOST YOUR MULTIPLIER</span>
                            </div>
                            ${breakdown.witness_bonus === 0 ? '<div style="font-size: 13px; color: #78350f; margin-bottom: 8px; padding-left: 28px;">• Vote for <strong>cur8.witness</strong> to get <strong>+0.5x</strong></div>' : ''}
                            ${breakdown.delegation_amount < 1000 ? '<div style="font-size: 13px; color: #78350f; margin-bottom: 8px; padding-left: 28px;">• Delegate STEEM to <strong>@cur8</strong>: <strong>+0.1x per 1000 SP</strong></div>' : ''}
                            <div style="font-size: 13px; color: #92400e; font-weight: 700; margin-top: 12px; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px; text-align: center;">
                                Maximum Multiplier: ${breakdown.max_multiplier.toFixed(1)}x
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
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