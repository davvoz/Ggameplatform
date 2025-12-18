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

            // Wait for both user and sessions (sessionsPromise now returns an object {count, sessions})
            const [user, sessionsData] = await Promise.all([userPromise, sessionsPromise]);
            const sessions = (sessionsData && sessionsData.sessions) ? sessionsData.sessions : [];

            // Calculate stats immediately after sessions arrive
            const stats = this.calculateStats(sessions);

            // If API provided a total count, prefer that for gamesPlayed (avoids client-side limit effects)
            if (sessionsData && typeof sessionsData.count === 'number') {
                stats.gamesPlayed = sessionsData.count;
            }
            
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
            console.log('✅ Sessions loaded:', sessionsData?.sessions?.length || 0, 'total:', sessionsData?.count);
            // Return the full response so caller can access total count if API provides it
            return sessionsData || { count: 0, sessions: [] };
        } catch (error) {
            console.error('❌ Error loading sessions:', error);
            return { count: 0, sessions: [] };
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
                        
                        // Set permanent indigo background
                        parentBadge.style.background = 'rgba(99, 102, 241, 0.15)';
                        parentBadge.style.border = '1px solid rgba(99, 102, 241, 0.3)';
                        
                        // Update the value
                        multiplierEl.textContent = `${breakdown.final_multiplier.toFixed(2)}x`;
                        multiplierEl.style.color = '#818cf8';
                        multiplierEl.style.fontWeight = '700';
                        
                        // Add click handler
                        parentBadge.onclick = () => {
                            this.showMultiplierModal(breakdown);
                        };
                        
                        // Add hover effect
                        parentBadge.onmouseenter = () => {
                            parentBadge.style.transform = 'scale(1.05)';
                            parentBadge.style.background = 'rgba(99, 102, 241, 0.25)';
                        };
                        parentBadge.onmouseleave = () => {
                            parentBadge.style.transform = 'scale(1)';
                            parentBadge.style.background = 'rgba(99, 102, 241, 0.15)';
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
                    // Compute XP per-level values with fallbacks (ensure variables exist in this scope)
                    const xp_in_level = levelInfo?.xp_in_level ?? (levelInfo?.current_xp - levelInfo?.xp_current_level || 0);
                    const xp_required_for_next = levelInfo?.xp_required_for_next_level ?? levelInfo?.xp_needed_for_next ?? (levelInfo?.xp_next_level - levelInfo?.xp_current_level);
                    const xp_to_next = levelInfo?.xp_to_next_level ?? Math.max(0, (xp_required_for_next || 0) - xp_in_level);

                    // Build right column HTML separately to avoid nested template literal ambiguity
                    const rightColumnHtml = xp_to_next > 0 ? `
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span style="font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🎯 Next lvl</span>
                            <span style="font-size: 18px; font-weight: 800; color: ${levelInfo.color || '#6366f1'}; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${xp_to_next.toFixed(0)}</span>
                        </div>
                    ` : `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 8px; background: linear-gradient(135deg, #FFD70033, #FFA50033); border-radius: 6px; border: 1px solid #FFD70044;">
                            <span style="font-weight: 800; font-size: 14px; color: #FFD700; text-shadow: 0 1px 3px rgba(0,0,0,0.4); letter-spacing: 0.5px;">🏆 MAX LEVEL</span>
                        </div>
                    `;

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
                                    <span style="font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">💰 Total XP</span>
                                    <span style="font-size: 18px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${totalXP.toFixed(0)}</span>
                                </div>
                                ${rightColumnHtml}
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
        
        // Copia struttura modale multiplier
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
            <div style="background: var(--background-light); border-radius: 16px; max-width: 450px; width: 90%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid var(--border); animation: slideUp 0.3s ease-out; position: relative;">
                <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: var(--text-primary);">🪙 Wallet</h2>
                        <button class="close-btn" style="background: none; border: none; font-size: 28px; color: var(--text-muted); cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">×</button>
                    </div>
                </div>
                <div id="walletModalContainer" style="padding: 18px 16px 24px 16px;"></div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        // Close on X click
        modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());

        // Load wallet widget
        const container = modal.querySelector('#walletModalContainer');
        if (!window.WalletProfileWidget) {
            container.innerHTML = '<p class="wallet-error">⚠️ Wallet widget not loaded</p>';
            return;
        }
        const walletWidget = new window.WalletProfileWidget(container, userId);
        walletWidget.render().then(() => {
            console.log('✅ Wallet modal rendered');
            // Add click handler to "View Full Wallet" link to close modal
            const walletLink = container.querySelector('a[href="#/wallet"]');
            if (walletLink) {
                walletLink.addEventListener('click', () => {
                    modal.remove();
                });
            }
        }).catch(error => {
            console.error('❌ Error rendering wallet modal:', error);
            container.innerHTML = '<p class="wallet-error">⚠️ Failed to load wallet</p>';
        });

        // Note: close handlers already attached above; nothing more to do here
    }

    /**
     * Broadcast a witness vote for @cur8.witness using Steem Keychain
     */
    async voteCur8Witness() {
        const user = this.authManager.getUser();
        const steemUsername = this.extractSteemUsername(user);
        if (!steemUsername) throw new Error('No Steem username available');

        if (!window.steem_keychain) {
            throw new Error('Steem Keychain not found');
        }

        return new Promise((resolve, reject) => {
            try {
                // Preferred: requestWitnessVote (simpler witness API supported by Keychain)
                if (typeof window.steem_keychain.requestWitnessVote === 'function') {
                    try {
                        window.steem_keychain.requestWitnessVote(steemUsername, 'cur8.witness', true, (response) => {
                            console.log('Keychain.requestWitnessVote callback:', response);

                            // Handle common response shapes
                            if (response && (response.success === true || response.success === 'true')) return resolve(response);
                            if (response && response.result) return resolve(response);
                            if (typeof response === 'string' && response.length > 0) return resolve({ tx: response });

                            let errMsg = 'Keychain requestWitnessVote failed';
                            try {
                                if (response && response.error) errMsg = response.error.message || JSON.stringify(response.error);
                                else if (response && response.message) errMsg = response.message;
                                else if (!response) errMsg = 'No response from Keychain requestWitnessVote';
                                else errMsg = JSON.stringify(response);
                            } catch (e) {
                                errMsg = 'Unknown Keychain response format';
                            }
                            return reject(new Error(errMsg));
                        });
                        return; // exit; callback will resolve/reject
                    } catch (e) {
                        console.warn('requestWitnessVote threw, falling back to requestBroadcast', e);
                        // fall through to broadcast
                    }
                }

                // Fallback: construct an account_witness_vote operation and broadcast
                const ops = [[
                    'account_witness_vote',
                    { voter: steemUsername, witness: 'cur8.witness', approve: true }
                ]];

                window.steem_keychain.requestBroadcast(steemUsername, ops, 'active', (result) => {
                    console.log('Keychain.requestBroadcast callback result:', result);

                    if (result && (result.success === true || result.success === 'true')) return resolve(result);
                    if (result && result.result) return resolve(result);
                    if (typeof result === 'string' && result.length > 0) return resolve({ tx: result });

                    let errMsg = 'Keychain broadcast failed';
                    try {
                        if (result && result.error) errMsg = result.error.message || JSON.stringify(result.error);
                        else if (result && result.message) errMsg = result.message;
                        else if (!result) errMsg = 'No response from Keychain';
                        else errMsg = JSON.stringify(result);
                    } catch (e) {
                        errMsg = 'Unknown Keychain response format';
                    }
                    return reject(new Error(errMsg));
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Refresh multiplier information for the current user by re-fetching Steem profile
     * and invoking backend update endpoint used elsewhere in the renderer.
     */
    async refreshMultiplierForCurrentUser() {
        const user = this.authManager.getUser();
        if (!user || !user.user_id) throw new Error('No user logged in');

        const steemUsername = this.extractSteemUsername(user);
        if (!steemUsername) throw new Error('No Steem username available');

        try {
            const steemProfile = await steemProfileService.fetchProfile(steemUsername);
            const API_URL = window.ENV?.API_URL || config.API_URL || window.location.origin;

            const response = await fetch(`${API_URL}/users/update-steem-data/${user.user_id}?votes_witness=${steemProfile.votesCur8Witness}&delegation_amount=${steemProfile.delegationAmount || 0}`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to update user multiplier on backend');

            const result = await response.json();

            // Update local user object and UI
            const updatedUser = Object.assign({}, user, {
                cur8_multiplier: result.cur8_multiplier,
                votes_cur8_witness: result.votes_cur8_witness,
                delegation_amount: result.delegation_amount
            });

            this.authManager.setUser(updatedUser);

            // Immediately update visible multiplier badge on the profile page so user doesn't need extra refresh
            try {
                const newMult = Number(result.cur8_multiplier) || updatedUser.cur8_multiplier || 1.0;
                const multEl = document.querySelector('.stat-value.multiplier');
                if (multEl) {
                    multEl.textContent = `${newMult.toFixed(2)}x`;
                    multEl.style.color = '#818cf8';
                    multEl.style.fontWeight = '700';
                }

                // Dispatch event in case other components listen for multiplier updates
                window.dispatchEvent(new CustomEvent('multiplierUpdated', { detail: updatedUser }));
            } catch (e) {
                console.warn('Failed to update multiplier badge DOM:', e);
            }

            return result;
        } catch (err) {
            console.error('Error refreshing multiplier:', err);
            throw err;
        }
    }

    /**
     * Directly call backend update endpoint with explicit votes_witness and delegation_amount values.
     * Use this after a user-initiated vote to ensure the backend records the change immediately.
     */
    async updateMultiplierBackend(votesWitness = false, delegationAmount = 0) {
        const user = this.authManager.getUser();
        if (!user || !user.user_id) throw new Error('No user logged in');
        try {
            const API_URL = window.ENV?.API_URL || config.API_URL || window.location.origin;
            const url = `${API_URL}/users/update-steem-data/${user.user_id}?votes_witness=${votesWitness}&delegation_amount=${delegationAmount}`;
            const response = await fetch(url, { method: 'POST' });
            if (!response.ok) throw new Error('Backend update failed');
            const result = await response.json();

            // Update local user object and UI immediately
            const updatedUser = Object.assign({}, user, {
                cur8_multiplier: result.cur8_multiplier,
                votes_cur8_witness: result.votes_cur8_witness,
                delegation_amount: result.delegation_amount
            });
            this.authManager.setUser(updatedUser);

            // Also update multiplier badge
            try {
                const newMult = Number(result.cur8_multiplier) || updatedUser.cur8_multiplier || 1.0;
                const multEl = document.querySelector('.stat-value.multiplier');
                if (multEl) multEl.textContent = `${newMult.toFixed(2)}x`;
            } catch (e) {
                console.warn('Failed to update multiplier badge DOM:', e);
            }

            return result;
        } catch (err) {
            console.error('updateMultiplierBackend error:', err);
            throw err;
        }
    }

    /**
     * Delegate a given amount of STEEM Power to @cur8 using Keychain.
     * amountSp: number (STEEM Power)
     */
    async delegateToCur8(amountSp) {
        const user = this.authManager.getUser();
        const steemUsername = this.extractSteemUsername(user);
        if (!user || !user.user_id) throw new Error('No user logged in');
        if (!steemUsername) throw new Error('No Steem username available');

        if (!window.steem_keychain) {
            throw new Error('Steem Keychain not found');
        }

        if (!amountSp || Number(amountSp) <= 0) throw new Error('Invalid delegation amount');

        // Convert SP to VESTS using SteemProfileService helper
        let vestsPerSteem = 2000.0;
        try {
            vestsPerSteem = await steemProfileService._getVestsToSpRatio();
        } catch (e) {
            console.warn('Could not get vests ratio, using fallback', e);
        }

        const vests = Number(amountSp) * Number(vestsPerSteem);
        const vesting_shares = `${vests.toFixed(6)} VESTS`;

        return new Promise((resolve, reject) => {
            try {
                const ops = [[
                    'delegate_vesting_shares',
                    { delegator: steemUsername, delegatee: 'cur8', vesting_shares }
                ]];

                // Prefer a explicit Keychain delegation method if available
                if (typeof window.steem_keychain.requestDelegateVestingShares === 'function') {
                    try {
                        window.steem_keychain.requestDelegateVestingShares(steemUsername, 'cur8', vesting_shares, (resp) => {
                            console.log('Keychain.requestDelegateVestingShares callback:', resp);
                            if (resp && (resp.success === true || resp.result)) return resolve(resp);
                            return reject(new Error((resp && resp.error && resp.error.message) || 'Delegation failed'));
                        });
                        return;
                    } catch (e) {
                        console.warn('requestDelegateVestingShares threw, falling back to requestBroadcast', e);
                    }
                }

                window.steem_keychain.requestBroadcast(steemUsername, ops, 'active', (result) => {
                    console.log('Keychain.requestBroadcast delegation result:', result);
                    if (result && (result.success === true || result.result)) return resolve(result);
                    if (typeof result === 'string' && result.length > 0) return resolve({ tx: result });
                    return reject(new Error((result && result.error && result.error.message) || 'Delegation broadcast failed'));
                });
            } catch (err) {
                reject(err);
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
            <div style="background: var(--background-light); border-radius: 16px; max-width: 450px; width: 90%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid var(--border); animation: slideUp 0.3s ease-out;">
                <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: var(--text-primary);">⚡ CUR8 Multiplier</h2>
                        <button onclick="this.closest('[style*=fixed]').remove()" style="background: none; border: none; font-size: 28px; color: var(--text-muted); cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">×</button>
                    </div>
                </div>
                
                <div style="padding: 16px;">
                    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="font-size: 14px; color: var(--text-secondary); font-weight: 500;">Base Multiplier</span>
                            <span style="font-weight: 700; font-size: 18px; color: var(--text-primary);">+${breakdown.base.toFixed(1)}x</span>
                        </div>
                        
                        <div style="padding: 12px; background: ${breakdown.witness_bonus > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; border-radius: 10px; border: 2px solid ${breakdown.witness_bonus > 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 28px;">${breakdown.witness_bonus > 0 ? '✅' : '⬜'}</span>
                                    <div>
                                        <div style="font-size: 15px; color: var(--text-primary); font-weight: 600;">Witness Vote</div>
                                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${breakdown.witness_bonus > 0 ? 'Voting for cur8.witness' : 'Not voting yet'}</div>
                                    </div>
                                    ${breakdown.witness_bonus === 0 ? `<button id="voteCur8Btn" style="margin-left:12px; background: linear-gradient(90deg,#16a34a,#059669); color: white; border: none; padding: 6px 10px; border-radius: 8px; font-weight:700; cursor: pointer;">Vote</button>` : ''}
                                </div>
                                <span style="font-weight: 800; font-size: 20px; color: ${breakdown.witness_bonus > 0 ? '#22c55e' : 'var(--text-muted)'};">+${breakdown.witness_bonus.toFixed(1)}x</span>
                            </div>
                        </div>
                        
                        <div style="padding: 12px; background: ${breakdown.delegation_bonus > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; border-radius: 10px; border: 2px solid ${breakdown.delegation_bonus > 0 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'};">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:8px;">
                                <div>
                                    <div style="font-size: 15px; color: var(--text-primary); font-weight: 600;">Steem Delegation</div>
                                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${breakdown.delegation_amount.toFixed(0)} STEEM delegated</div>
                                </div>
                                <span id="delegationBonusValue" style="font-weight: 800; font-size: 20px; color: ${breakdown.delegation_bonus > 0 ? '#3b82f6' : 'var(--text-muted)'};">+${breakdown.delegation_bonus.toFixed(2)}x</span>
                            </div>
                            <div style="display:flex; gap:8px; width:100%; align-items:center;">
                                <input id="delegateAmountSlider" list="delegateTicks" type="range" min="0" max="10000" step="1" value="${breakdown.delegation_amount.toFixed(0)}" style="flex:1;">
                                <datalist id="delegateTicks"></datalist>
                                <button id="delegateCur8Btn" style="background: linear-gradient(90deg,#3b82f6,#2563eb); color: white; border: none; padding: 8px 10px; border-radius: 8px; font-weight:700; cursor: pointer;">Delegate</button>
                            </div>
                        </div>
                        
                        <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); margin: 12px 0;"></div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 16px; color: var(--text-primary); font-weight: 700;">Total Multiplier <span style="font-size:12px; color:var(--text-secondary); font-weight:600; margin-left:8px;">(max 4x)</span></span>
                            <span id="finalMultiplierValue" style="font-weight: 800; font-size: 24px; color: #818cf8;">${breakdown.final_multiplier.toFixed(2)}x</span>
                        </div>
                    </div>
                    
                    ${!breakdown.is_capped ? `
                        <div style="padding: 14px; background: rgba(251, 191, 36, 0.15); border-radius: 12px; border: 2px solid rgba(251, 191, 36, 0.4);">
                            <div style="font-size: 14px; color: #fbbf24; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <span>💡</span>
                                <span>HOW TO BOOST</span>
                            </div>
                            ${breakdown.witness_bonus === 0 ? '<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; padding-left: 22px;">• Vote <strong>@cur8.witness</strong> → <strong>+0.5x</strong></div>' : ''}
                            ${breakdown.delegation_amount < 1000 ? '<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; padding-left: 22px;">• Delegate to <strong>@cur8</strong> → <strong>+0.1x /1000 SP</strong></div>' : ''}
                            <!-- Max indicator moved next to Total Multiplier -->
                            <div id="multiplierStatus" style="margin-top:8px; font-size:13px; color:var(--text-secondary);"></div>
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

        // Wire up vote button inside modal (if present)
        const voteBtn = modal.querySelector('#voteCur8Btn');
        const statusEl = modal.querySelector('#multiplierStatus');
        const delegateBtn = modal.querySelector('#delegateCur8Btn');
        // Slider and numeric input for delegation
        const delegateInput = modal.querySelector('#delegateAmountSlider');
        const delegateStatusId = 'delegateStatus';
        let delegateStatusEl = modal.querySelector('#' + delegateStatusId);
        if (!delegateStatusEl) {
            // append a small status line under delegation input if present
            const delegNode = modal.querySelector('#delegateAmountSlider')?.parentElement?.parentElement;
            if (delegNode) {
                delegateStatusEl = document.createElement('div');
                delegateStatusEl.id = delegateStatusId;
                delegateStatusEl.style.cssText = 'margin-top:6px; font-size:13px; color:var(--text-secondary);';
                delegNode.appendChild(delegateStatusEl);
            }
        }

        if (voteBtn) {
            voteBtn.addEventListener('click', async () => {
                voteBtn.disabled = true;
                const prev = voteBtn.textContent;
                voteBtn.textContent = '🔄 Voting...';
                try {
                    await this.voteCur8Witness();
                    voteBtn.textContent = '✅ Voted';
                    if (statusEl) statusEl.textContent = '✅ Vote broadcasted. Updating multiplier...';

                    // Update backend multiplier explicitly (force votes_witness=true)
                    // Preserve current delegation amount instead of sending 0 which would clear delegations
                    try {
                        const currentDelegation = Number(breakdown && breakdown.delegation_amount ? breakdown.delegation_amount : (this.authManager.getUser && this.authManager.getUser().delegation_amount) || 0) || 0;
                        await this.updateMultiplierBackend(true, currentDelegation);
                    } catch (e) {
                        // fallback: try a safe refresh without overwriting delegation
                        console.warn('Failed to update with preserved delegation, falling back to refresh:', e);
                        await this.refreshMultiplierForCurrentUser();
                    }
                    if (statusEl) statusEl.textContent = '✅ Vote applied. Updating UI...';

                    // Fetch updated breakdown and re-open modal with fresh data
                    try {
                        const API_URL = window.ENV?.API_URL || config.API_URL || window.location.origin;
                        const userId = this.authManager.getUser().user_id;
                        const br = await fetch(`${API_URL}/users/multiplier-breakdown/${userId}`);
                        if (br.ok) {
                            const json = await br.json();
                            modal.remove();
                            this.showMultiplierModal(json.breakdown);
                        }
                    } catch (e) {
                        console.warn('Could not reload multiplier breakdown:', e);
                    }

                    // Refresh header/profile visuals using updated Steem profile data
                    try {
                        const updatedUser = this.authManager.getUser();
                        const steemUsername = this.extractSteemUsername(updatedUser);
                        if (steemUsername) {
                            const steemProfile = await steemProfileService.fetchProfile(steemUsername);
                            if (steemProfile) {
                                this.updateProfileWithSteemData(updatedUser, steemProfile);
                            }
                        }
                        // Notify other parts of the app
                        window.dispatchEvent(new CustomEvent('multiplierUpdated', { detail: this.authManager.getUser() }));
                    } catch (e) {
                        console.warn('Error updating profile visuals after vote:', e);
                    }
                } catch (err) {
                    console.error('Vote error:', err);
                    voteBtn.textContent = '❌ Failed';
                    // Do not show error messages inside the modal; log only and show brief button state
                } finally {
                    voteBtn.disabled = false;
                    setTimeout(() => { try { voteBtn.textContent = prev } catch(e){} }, 3000);
                }
            });
        }

        if (delegateBtn && delegateInput) {
            // Prefill input and wire live preview
            try {
                if (delegateInput) delegateInput.value = Number(breakdown.delegation_amount || 0).toFixed(0);
            } catch (e) { /* ignore */ }


            const slider = modal.querySelector('#delegateAmountSlider');
            const delegationBonusEl = modal.querySelector('#delegationBonusValue');
            const finalMultEl = modal.querySelector('#finalMultiplierValue');

            // set slider max based on available SP on account (fallback to 10000)
            try {
                const user = this.authManager.getUser && this.authManager.getUser();
                let availableSp = 10000;
                if (breakdown.available_sp !== undefined) availableSp = Number(breakdown.available_sp);
                else if (breakdown.available_steem !== undefined) availableSp = Number(breakdown.available_steem);
                else if (user && (user.steem_power !== undefined)) availableSp = Number(user.steem_power);
                // ensure sensible max
                if (slider) slider.max = Math.max(1, Math.floor(availableSp));
            } catch (e) {
                // ignore
            }

            const computePreview = () => {
                try {
                    // use slider value for preview
                    const val = Math.max(0, Number((slider && slider.value) || 0));
                    // per SP bonus fallback: +0.1x per 1000 SP => 0.0001 per SP
                    let perSp = 0.0001;
                    if (breakdown.delegation_amount && breakdown.delegation_amount > 0 && breakdown.delegation_bonus !== undefined) {
                        perSp = Number(breakdown.delegation_bonus) / Number(breakdown.delegation_amount);
                    }
                    const rawDelegationBonus = val * perSp;
                    // per-delegation cap (default 2.5x) can be provided by backend in breakdown.max_delegation_bonus
                    const perDelegationCap = (breakdown.max_delegation_bonus !== undefined) ? Number(breakdown.max_delegation_bonus) : 2.5;
                    const cappedBySingleDelegation = Math.min(rawDelegationBonus, perDelegationCap);

                    const baseWithoutDelegation = (Number(breakdown.final_multiplier) || 1) - (Number(breakdown.delegation_bonus) || 0);
                    // tentative total using single-delegation-capped bonus
                    let newTotal = baseWithoutDelegation + cappedBySingleDelegation;
                    // enforce absolute total cap (4x)
                    const cappedTotal = Math.min(newTotal, 4.0);
                    // effective delegation bonus after global cap applied
                    const effectiveDelegationBonus = Math.max(0, cappedTotal - baseWithoutDelegation);
                    if (delegationBonusEl) delegationBonusEl.textContent = `+${effectiveDelegationBonus.toFixed(2)}x`;
                    if (finalMultEl) finalMultEl.textContent = `${cappedTotal.toFixed(2)}x`;
                    // update delegate button text to show selected amount when not disabled
                    try {
                        if (delegateBtn && !delegateBtn.disabled) delegateBtn.textContent = `Delegate ${val.toFixed(0)} SP`;
                    } catch (e) { /* ignore */ }
                    const labelEl = modal.querySelector('#delegateAmountLabel');
                    try {
                        let available = breakdown.available_sp !== undefined ? Number(breakdown.available_sp) : (breakdown.available_steem !== undefined ? Number(breakdown.available_steem) : null);
                        if (available === null) {
                            const user = this.authManager.getUser && this.authManager.getUser();
                            if (user && user.steem_power !== undefined) available = Number(user.steem_power);
                        }
                        if (labelEl) labelEl.textContent = `Selected: ${val.toFixed(0)} SP — Available: ${available !== null ? Math.floor(available) : '—'}`;
                    } catch (e) {
                        if (labelEl) labelEl.textContent = `Selected: ${val.toFixed(0)} SP`;
                    }
                } catch (e) {
                    // ignore
                }
            };

            
                    if (slider) {
                        slider.addEventListener('input', () => {
                            computePreview();
                        });
                    }
            computePreview();

            // Fetch Steem profile to determine available SP and populate tick marks on the slider
            (async () => {
                try {
                    const user = this.authManager.getUser && this.authManager.getUser();
                    const steemUsername = this.extractSteemUsername(user);
                    if (!steemUsername) return;

                    const spProfile = await steemProfileService.fetchProfile(steemUsername);
                    if (!spProfile || !spProfile.account) return;

                    const vestsPerSteem = await steemProfileService._getVestsToSpRatio();
                    const vesting_shares = parseFloat((spProfile.account.vesting_shares || '0 VESTS').split(' ')[0] || '0');
                    const delegated_vesting_shares = parseFloat((spProfile.account.delegated_vesting_shares || '0 VESTS').split(' ')[0] || '0');

                    // Fetch outgoing delegations to compute amount delegated to others excluding @cur8
                    let delegatedToCur8Vests = 0;
                    try {
                        const outgoing = await steemProfileService.getOutgoingVestingDelegations(spProfile.account.name);
                        if (Array.isArray(outgoing) && outgoing.length > 0) {
                            for (const d of outgoing) {
                                try {
                                    if (d.delegatee === 'cur8') {
                                        delegatedToCur8Vests += parseFloat((d.vesting_shares || '0 VESTS').split(' ')[0] || '0');
                                    }
                                } catch (e) { /* ignore */ }
                            }
                        }
                    } catch (e) {
                        console.warn('Could not fetch outgoing delegations to compute cur8 portion:', e);
                    }

                    // available vests should not subtract delegations made to @cur8
                    const delegatedToOthers = Math.max(0, delegated_vesting_shares - delegatedToCur8Vests);
                    const availableVests = Math.max(0, vesting_shares - delegatedToOthers);
                    const availableSp = Math.floor(availableVests / (vestsPerSteem || 1));

                    // update slider max and ensure value is within bounds
                    if (slider) {
                        slider.max = Math.max(1, availableSp);
                        if (Number(slider.value) > Number(slider.max)) slider.value = slider.max;
                    }

                    // populate datalist ticks (0, 10%, 25%, 50%, max)
                    const dl = modal.querySelector('#delegateTicks');
                    if (dl) {
                        dl.innerHTML = '';
                        const ticks = [0, Math.floor(availableSp * 0.1), Math.floor(availableSp * 0.25), Math.floor(availableSp * 0.5), availableSp];
                        const uniq = Array.from(new Set(ticks)).filter(n => Number.isFinite(n));
                        uniq.forEach(v => {
                            const opt = document.createElement('option');
                            opt.value = v;
                            dl.appendChild(opt);
                        });
                    }

                    // expose available_sp to breakdown for computePreview logic
                    try { breakdown.available_sp = availableSp; } catch (e) {}
                    computePreview();
                } catch (e) {
                    console.warn('Could not load Steem profile for slider ticks:', e);
                }
            })();

            delegateBtn.addEventListener('click', async () => {
                delegateBtn.disabled = true;
                const amount = Number((delegateInput && delegateInput.value) || 0);
                const prevText = delegateBtn.textContent;
                delegateBtn.textContent = '🔄 Delegating...';
                if (delegateStatusEl) delegateStatusEl.textContent = '';
                try {
                    if (!amount || amount <= 0) throw new Error('Inserisci un importo valido');

                    await this.delegateToCur8(amount);
                    if (delegateStatusEl) delegateStatusEl.textContent = '✅ Delegation broadcasted. Updating multiplier...';

                    // Notify backend of delegation amount and update UI
                    // Preserve current witness vote instead of sending false which would clear it
                    try {
                        const votesWitness = (breakdown && typeof breakdown.witness_bonus !== 'undefined') ? (Number(breakdown.witness_bonus) > 0) : Boolean(this.authManager.getUser && this.authManager.getUser().votes_cur8_witness);
                        await this.updateMultiplierBackend(votesWitness, amount);
                    } catch (e) {
                        console.warn('Failed to update backend with preserved vote flag, falling back to refresh:', e);
                        await this.refreshMultiplierForCurrentUser();
                    }

                    // Refresh breakdown and profile visuals
                    try {
                        const API_URL = window.ENV?.API_URL || config.API_URL || window.location.origin;
                        const userId = this.authManager.getUser().user_id;
                        const br = await fetch(`${API_URL}/users/multiplier-breakdown/${userId}`);
                        if (br.ok) {
                            const json = await br.json();
                            modal.remove();
                            this.showMultiplierModal(json.breakdown);
                        }
                    } catch (e) {
                        console.warn('Failed to refresh breakdown after delegation:', e);
                    }
                } catch (err) {
                    console.error('Delegation error:', err);
                    delegateBtn.textContent = '❌ Failed';
                } finally {
                    delegateBtn.disabled = false;
                    setTimeout(() => { try { delegateBtn.textContent = prevText } catch(e){} }, 3000);
                }
            });
        }
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