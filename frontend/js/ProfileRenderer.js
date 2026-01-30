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

        // Load multiplier breakdown in background (non-blocking)
        const API_URL = window.ENV?.API_URL || config.API_URL || window.location.origin;
        if (cachedUser && cachedUser.user_id) {
            fetch(`${API_URL}/users/multiplier-breakdown/${cachedUser.user_id}`)
                .then(resp => resp.ok ? resp.json() : null)
                .then(json => {
                    if (json && json.breakdown && json.breakdown.final_multiplier !== undefined) {
                        const breakdown = json.breakdown;
                        const updatedUser = Object.assign({}, cachedUser, {
                            cur8_multiplier: Number(breakdown.final_multiplier),
                            delegation_amount: Number(breakdown.delegation_amount || cachedUser.delegation_amount || 0)
                        });
                        try {
                            if (this.authManager.setUser) this.authManager.setUser(updatedUser);
                        } catch (e) {

                        }
                        try {
                            window.dispatchEvent(new CustomEvent('multiplierUpdated', { detail: updatedUser }));
                        } catch (e) { }
                    }
                })
                .catch(e => console.warn('Could not fetch multiplier breakdown:', e));
        }

        // Load all other data in background (non-blocking)
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


        try {
            const API_URL = window.ENV?.API_URL || config.API_URL;
            const url = `${API_URL}/users/${cachedUser.user_id}`;

            const response = await fetch(url);
            if (response.ok) {
                const userData = await response.json();

                return userData.user;
            }
            console.error('❌ Failed to fetch user data:', response.status, response.statusText);
        } catch (error) {
            console.error('❌ Error fetching fresh user data:', error);
        }


        return cachedUser;
    }

    /**
     * Load user sessions
     */
    async loadUserSessions(userId) {

        try {
            const sessionsData = await getUserSessions(userId);

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


                    // Update user object with new multiplier
                    user.cur8_multiplier = result.cur8_multiplier;
                    user.votes_cur8_witness = result.votes_cur8_witness;
                    user.delegation_amount = result.delegation_amount;
                } else {

                }
            } catch (error) {

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
        this.populateAccountSettings(profileContent, user);

        // Steem loading indicator (avatar, multiplier, etc.)
        const steemElements = profileContent.querySelectorAll('.steem-dependent');
        steemElements.forEach(el => {
            el.innerHTML = '<span class="loading-placeholder">⏳ Loading Steem data...</span>';
        });

        this.appContainer.innerHTML = '';
        this.appContainer.appendChild(profileContent);

        // Load stats asynchronously after rendering
        this.populateProfileStats(document, user, loadingStats);

        // Initialize Steem post button
        this.initializeSteemPostButton(user);

        // Initialize sticky hero navbar
        this._initStickyHero(user);

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
     * Initialize sticky hero behavior
     * The profile header collapses into a compact navbar when scrolling
     * @private
     */
    _initStickyHero(user) {
        const profileHeader = document.querySelector('.profile-header');
        if (!profileHeader) {
            return;
        }

        const stickyNavbar = this._createStickyNavbar(user);
        this._copyAvatarToStickyNavbar(stickyNavbar);
        this._setupStickyNavbarClickHandlers(stickyNavbar, user);
        this._insertStickyNavbar(stickyNavbar);
        this._setupScrollBehavior(profileHeader, stickyNavbar);
        this._setupStickyNavbarObservers(stickyNavbar);
    }

    /**
     * Create sticky navbar element
     * @private
     */
    _createStickyNavbar(user) {
        const displayName = this.getDisplayName(user);
        const multiplierValue = (user?.cur8_multiplier || 1).toFixed(2);

        const stickyNavbar = document.createElement('div');
        stickyNavbar.className = 'profile-sticky-navbar';
        stickyNavbar.innerHTML = `
            <div class="sticky-navbar-content">
                <div class="sticky-profile-info">
                    <span class="sticky-avatar"></span>
                    <span class="sticky-username">${displayName}</span>
                </div>
                <div class="sticky-stats">
                    <span class="sticky-stat multiplier" id="stickyMultiplierValue">${multiplierValue}x</span>
                    <span class="sticky-stat coins" id="stickyCoinsValue">🪙 --</span>
                </div>
            </div>
        `;

        return stickyNavbar;
    }

    /**
     * Copy avatar from main profile to sticky navbar
     * @private
     */
    _copyAvatarToStickyNavbar(stickyNavbar) {
        const avatarIcon = document.querySelector('.avatar-icon');
        const stickyAvatar = stickyNavbar.querySelector('.sticky-avatar');

        if (!avatarIcon || !stickyAvatar) {
            return;
        }

        if (avatarIcon.style.backgroundImage) {
            stickyAvatar.style.backgroundImage = avatarIcon.style.backgroundImage;
            stickyAvatar.style.backgroundSize = 'cover';
            stickyAvatar.style.backgroundPosition = 'center';
        } else {
            stickyAvatar.textContent = avatarIcon.textContent;
        }
    }

    /**
     * Setup click handlers for sticky navbar elements
     * @private
     */
    _setupStickyNavbarClickHandlers(stickyNavbar, user) {
        const stickyMultiplier = stickyNavbar.querySelector('.sticky-stat.multiplier');
        const stickyCoins = stickyNavbar.querySelector('.sticky-stat.coins');

        if (stickyMultiplier) {
            this._setupStickyMultiplierHandler(stickyMultiplier, user);
        }

        if (stickyCoins) {
            this._setupStickyCoinsHandler(stickyCoins);
        }
    }

    /**
     * Setup multiplier click handler in sticky navbar
     * @private
     */
    _setupStickyMultiplierHandler(element, user) {
        element.style.cursor = 'pointer';

        element.addEventListener('click', async () => {
            await this._handleStickyMultiplierClick(user);
        });

        this._addHoverEffect(element, 'rgba(99, 102, 241, 0.25)');
    }

    /**
     * Handle sticky multiplier click
     * @private
     */
    async _handleStickyMultiplierClick(user) {
        try {
            const API_URL = window.ENV?.API_URL || config.API_URL || window.location.origin;
            const response = await fetch(`${API_URL}/users/multiplier-breakdown/${user.user_id}`);

            if (response.ok) {
                const data = await response.json();
                this.showMultiplierModal(data.breakdown);
            }
        } catch (error) {

        }
    }

    /**
     * Setup coins click handler in sticky navbar
     * @private
     */
    _setupStickyCoinsHandler(element) {
        element.style.cursor = 'pointer';

        element.addEventListener('click', () => {
            window.location.hash = '#/wallet';
        });

        this._addHoverEffect(element, 'rgba(234, 179, 8, 0.25)');
    }

    /**
     * Add hover effect to an element
     * @private
     */
    _addHoverEffect(element, hoverBackground) {
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'scale(1.05)';
            element.style.background = hoverBackground;
        });

        element.addEventListener('mouseleave', () => {
            element.style.transform = '';
            element.style.background = '';
        });
    }

    /**
     * Insert sticky navbar into the DOM
     * @private
     */
    _insertStickyNavbar(stickyNavbar) {
        const profileContainer = document.querySelector('.profile');

        if (profileContainer) {
            profileContainer.insertBefore(stickyNavbar, profileContainer.firstChild);
        }
    }

    /**
     * Setup scroll behavior for sticky navbar
     * @private
     */
    _setupScrollBehavior(profileHeader, stickyNavbar) {
        const scrollState = this._createScrollState(profileHeader);

        window.addEventListener('resize', () => {
            this._updateScrollState(scrollState, profileHeader);
        }, { passive: true });

        const handleScroll = () => {
            this._handleStickyScroll(profileHeader, stickyNavbar, scrollState);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    }

    /**
     * Create scroll state object
     * @private
     */
    _createScrollState(profileHeader) {
        const headerRect = profileHeader.getBoundingClientRect();

        return {
            headerTop: headerRect.top + window.scrollY,
            headerHeight: headerRect.height
        };
    }

    /**
     * Update scroll state on resize
     * @private
     */
    _updateScrollState(scrollState, profileHeader) {
        const headerRect = profileHeader.getBoundingClientRect();
        scrollState.headerTop = headerRect.top + window.scrollY;
        scrollState.headerHeight = headerRect.height;
    }

    /**
     * Handle sticky scroll behavior
     * @private
     */
    _handleStickyScroll(profileHeader, stickyNavbar, scrollState) {
        const scrollY = window.scrollY;
        const triggerPoint = scrollState.headerTop + scrollState.headerHeight * 0.5;
        const fullCompressPoint = scrollState.headerTop + scrollState.headerHeight;

        if (scrollY < triggerPoint) {
            this._setNormalScrollState(profileHeader, stickyNavbar);
        } else if (scrollY < fullCompressPoint) {
            this._setCompressingScrollState(profileHeader, stickyNavbar, scrollY, triggerPoint, fullCompressPoint);
        } else {
            this._setCompressedScrollState(profileHeader, stickyNavbar);
        }
    }

    /**
     * Set normal scroll state (header fully visible)
     * @private
     */
    _setNormalScrollState(profileHeader, stickyNavbar) {
        profileHeader.classList.remove('header-compressing', 'header-compressed');
        stickyNavbar.classList.remove('visible');
    }

    /**
     * Set compressing scroll state
     * @private
     */
    _setCompressingScrollState(profileHeader, stickyNavbar, scrollY, triggerPoint, fullCompressPoint) {
        const progress = (scrollY - triggerPoint) / (fullCompressPoint - triggerPoint);
        profileHeader.classList.add('header-compressing');
        profileHeader.classList.remove('header-compressed');
        profileHeader.style.setProperty('--compress-progress', progress);
        stickyNavbar.classList.remove('visible');
    }

    /**
     * Set compressed scroll state (show sticky navbar)
     * @private
     */
    _setCompressedScrollState(profileHeader, stickyNavbar) {
        profileHeader.classList.remove('header-compressing');
        profileHeader.classList.add('header-compressed');
        stickyNavbar.classList.add('visible');
    }

    /**
     * Setup mutation observers for sticky navbar updates
     * @private
     */
    _setupStickyNavbarObservers(stickyNavbar) {
        this._setupCoinBalanceObserver();
        this._setupAvatarObserver(stickyNavbar);
    }

    /**
     * Setup observer for coin balance updates
     * @private
     */
    _setupCoinBalanceObserver() {
        const coinBalanceHeader = document.getElementById('coinBalanceHeader');

        if (!coinBalanceHeader) {
            return;
        }

        const observer = new MutationObserver(() => {
            const stickyCoinsEl = document.getElementById('stickyCoinsValue');

            if (stickyCoinsEl) {
                stickyCoinsEl.textContent = `🪙 ${coinBalanceHeader.textContent}`;
            }
        });

        observer.observe(coinBalanceHeader, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    /**
     * Setup observer for avatar updates
     * @private
     */
    _setupAvatarObserver(stickyNavbar) {
        const mainAvatarIcon = document.querySelector('.avatar-icon');

        if (!mainAvatarIcon) {
            return;
        }

        const avatarObserver = new MutationObserver(() => {
            this._syncStickyAvatar(stickyNavbar, mainAvatarIcon);
        });

        avatarObserver.observe(mainAvatarIcon, {
            attributes: true,
            attributeFilter: ['style']
        });
    }

    /**
     * Sync sticky avatar with main avatar
     * @private
     */
    _syncStickyAvatar(stickyNavbar, mainAvatarIcon) {
        const stickyAvatarEl = stickyNavbar.querySelector('.sticky-avatar');

        if (!stickyAvatarEl || !mainAvatarIcon.style.backgroundImage) {
            return;
        }

        stickyAvatarEl.style.backgroundImage = mainAvatarIcon.style.backgroundImage;
        stickyAvatarEl.style.backgroundSize = 'cover';
        stickyAvatarEl.style.backgroundPosition = 'center';
        stickyAvatarEl.textContent = '';
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



        const multiplier = user.cur8_multiplier || 1.0;
        const totalXP = user.total_xp_earned || 0;
        const API_URL = window.ENV?.API_URL || window.location.origin;

        this._setupMultiplierBadge(content, user, multiplier, API_URL);
        this._populateBasicStats(content, stats);
        this._loadLevelInfo(user, totalXP, API_URL);
        this._loadQuestsCount(content, user, API_URL);
        this._loadGamesTried(content, user, API_URL);
        this._calculateDaysMember(content, user);
    }

    /**
     * Setup multiplier badge with click handler
     * @private
     */
    _setupMultiplierBadge(content, user, fallbackMultiplier, apiUrl) {
        const multiplierEl = content.querySelector('.stat-value.multiplier');
        if (!multiplierEl) {
            return;
        }

        fetch(`${apiUrl}/users/multiplier-breakdown/${user.user_id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch breakdown');
                }
                return response.json();
            })
            .then(data => {
                this._configureMultiplierBadge(multiplierEl, data.breakdown, user);
            })
            .catch(error => {
                console.error('Failed to load multiplier breakdown:', error);
                multiplierEl.textContent = `${fallbackMultiplier}x`;
            });
    }

    /**
     * Configure multiplier badge appearance and behavior
     * @private
     */
    _configureMultiplierBadge(multiplierEl, breakdown, user) {
        const parentBadge = multiplierEl.closest('.stat-badge');
        if (!parentBadge) {
            return;
        }

        this._applyMultiplierBadgeStyles(parentBadge, multiplierEl, breakdown);
        this._attachMultiplierBadgeHandlers(parentBadge, breakdown);
        this._syncMultiplierToAuthManager(breakdown, user);


    }

    /**
     * Apply styles to multiplier badge
     * @private
     */
    _applyMultiplierBadgeStyles(parentBadge, multiplierEl, breakdown) {
        parentBadge.style.cursor = 'pointer';
        parentBadge.style.transition = 'all 0.3s';
        parentBadge.style.borderRadius = '10px';
        parentBadge.style.background = 'rgba(99, 102, 241, 0.15)';
        parentBadge.style.border = '2px solid rgba(99, 102, 241, 0.3)';

        multiplierEl.textContent = `${breakdown.final_multiplier.toFixed(2)}x`;
        multiplierEl.style.color = '#818cf8';
        multiplierEl.style.fontWeight = '700';
    }

    /**
     * Attach click and hover handlers to multiplier badge
     * @private
     */
    _attachMultiplierBadgeHandlers(parentBadge, breakdown) {
        parentBadge.onclick = () => {
            this.showMultiplierModal(breakdown);
        };

        parentBadge.onmouseenter = () => {
            parentBadge.style.transform = 'scale(1.05)';
            parentBadge.style.background = 'rgba(99, 102, 241, 0.25)';
        };

        parentBadge.onmouseleave = () => {
            parentBadge.style.transform = 'scale(1)';
            parentBadge.style.background = 'rgba(99, 102, 241, 0.15)';
        };
    }

    /**
     * Sync multiplier data to AuthManager and dispatch event
     * @private
     */
    _syncMultiplierToAuthManager(breakdown, user) {
        try {
            const currentUser = this.authManager?.getUser?.();
            if (!currentUser?.user_id) {
                return;
            }

            const updatedUser = {
                ...currentUser,
                cur8_multiplier: Number(breakdown.final_multiplier),
                votes_cur8_witness: (breakdown.witness_bonus && Number(breakdown.witness_bonus) > 0) || currentUser.votes_cur8_witness || false,
                delegation_amount: Number(breakdown.delegation_amount || currentUser.delegation_amount || 0)
            };

            this.authManager.setUser?.(updatedUser);
            window.dispatchEvent(new CustomEvent('multiplierUpdated', { detail: updatedUser }));
        } catch (error) {

        }
    }

    /**
     * Populate basic stats elements
     * @private
     */
    _populateBasicStats(content, stats) {
        const gamesPlayedEl = content.querySelector('#gamesPlayed');
        const questsDoneEl = content.querySelector('#questsDone');
        const gamesTriedEl = content.querySelector('#gamesTried');

        if (gamesPlayedEl) {
            gamesPlayedEl.textContent = stats.gamesPlayed;
        }

        if (questsDoneEl) {
            questsDoneEl.innerHTML = '<span style="opacity: 0.5;">⏳</span>';
        }

        if (gamesTriedEl) {
            gamesTriedEl.innerHTML = '<span style="opacity: 0.5;">⏳</span>';
        }
    }

    /**
     * Load and display level info
     * @private
     */
    _loadLevelInfo(user, totalXP, apiUrl) {
        fetch(`${apiUrl}/api/levels/${user.user_id}`)
            .then(response => response.ok ? response.json() : null)
            .then(levelInfo => {
                if (levelInfo) {
                    this._updateNavbarLevelBadge(levelInfo, totalXP);
                    this._updateProfileLevelCard(levelInfo, totalXP);
                }
            })
            .catch(error => console.error('Failed to load level info:', error));
    }

    /**
     * Update navbar level badge
     * @private
     */
    _updateNavbarLevelBadge(levelInfo, totalXP) {
        const levelBadgeContainer = document.querySelector('#levelBadgeContainer');
        if (!levelBadgeContainer) {
            return;
        }

        const color = levelInfo.color || '#6366f1';
        levelBadgeContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: linear-gradient(135deg, ${color}18, transparent); border-radius: 10px; border: 2px solid ${color}55;">
                <span style="font-size: 28px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));">${levelInfo.badge}</span>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-weight: 800; font-size: 16px; color: ${color}; text-shadow: 0 1px 3px rgba(0,0,0,0.3); letter-spacing: 0.5px;">Lv${levelInfo.current_level}</span>
                    <span style="font-size: 11px; opacity: 0.85; font-weight: 600;">${totalXP.toFixed(0)} XP</span>
                </div>
            </div>
        `;
    }

    /**
     * Update profile level card
     * @private
     */
    _updateProfileLevelCard(levelInfo, totalXP) {
        const levelCardContainer = document.querySelector('.profile .level-card-container#levelCardContainer');
        if (!levelCardContainer) {
            return;
        }

        const xpData = this._calculateXpData(levelInfo);
        const color = levelInfo.color || '#6366f1';
        const rightColumnHtml = this._generateLevelCardRightColumn(xpData, color);

        levelCardContainer.innerHTML = this._generateLevelCardHTML(levelInfo, totalXP, rightColumnHtml, color);
    }

    /**
     * Calculate XP data for level card
     * @private
     */
    _calculateXpData(levelInfo) {
        const xpInLevel = levelInfo?.xp_in_level ?? (levelInfo?.current_xp - levelInfo?.xp_current_level || 0);
        const xpRequiredForNext = levelInfo?.xp_required_for_next_level ?? levelInfo?.xp_needed_for_next ?? (levelInfo?.xp_next_level - levelInfo?.xp_current_level);
        const xpToNext = levelInfo?.xp_to_next_level ?? Math.max(0, (xpRequiredForNext || 0) - xpInLevel);

        return { xpInLevel, xpRequiredForNext, xpToNext };
    }

    /**
     * Generate right column HTML for level card
     * @private
     */
    _generateLevelCardRightColumn(xpData, color) {
        if (xpData.xpToNext > 0) {
            return `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🎯 Next lvl</span>
                    <span style="font-size: 18px; font-weight: 800; color: ${color}; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${xpData.xpToNext.toFixed(0)}</span>
                </div>
            `;
        }

        return `
            <div style="grid-column: 1 / -1; text-align: center; padding: 8px; background: linear-gradient(135deg, #FFD70033, #FFA50033); border-radius: 6px; border: 1px solid #FFD70044;">
                <span style="font-weight: 800; font-size: 14px; color: #FFD700; text-shadow: 0 1px 3px rgba(0,0,0,0.4); letter-spacing: 0.5px;">🏆 MAX LEVEL</span>
            </div>
        `;
    }

    /**
     * Generate level card HTML
     * @private
     */
    _generateLevelCardHTML(levelInfo, totalXP, rightColumnHtml, color) {
        return `
            <div style="width: 100%; padding: 16px; background: linear-gradient(135deg, ${color}20, ${color}08); border-radius: var(--radius-md); border: 2px solid ${color}55; box-shadow: 0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05); box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    <div style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, ${color}33, ${color}11); border-radius: 50%; border: 3px solid ${color}66; box-shadow: 0 4px 12px ${color}44;">
                        <span style="font-size: 38px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));">${levelInfo.badge}</span>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 24px; font-weight: 800; color: ${color}; text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 0.5px; margin-bottom: 4px;">
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
                        <span style="font-weight: 800; font-size: 14px; color: ${color}; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${levelInfo.progress_percent.toFixed(1)}%</span>
                    </div>
                    <div style="height: 12px; background: rgba(0,0,0,0.3); border-radius: 6px; overflow: hidden; box-shadow: inset 0 2px 6px rgba(0,0,0,0.4); position: relative;">
                        <div style="height: 100%; background: linear-gradient(90deg, ${color}, #8b5cf6, ${color}); width: ${levelInfo.progress_percent}%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 12px ${color}aa, inset 0 1px 0 rgba(255,255,255,0.2);"></div>
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

    /**
     * Load quests count from transactions
     * @private
     */
    async _loadQuestsCount(content, user, apiUrl) {
        const questsDoneEl = content.querySelector('#questsDone');
        if (!questsDoneEl) {
            return;
        }

        try {
            const totalQuestClaims = await this._fetchAllQuestClaims(user.user_id, apiUrl);
            questsDoneEl.textContent = totalQuestClaims;
        } catch (error) {
            console.error('Failed to load quests count:', error);
            questsDoneEl.textContent = '0';
        }
    }

    /**
     * Fetch all quest claims with pagination
     * @private
     */
    async _fetchAllQuestClaims(userId, apiUrl) {
        const BATCH_SIZE = 1000;
        let offset = 0;
        let totalQuestClaims = 0;
        let hasMoreData = true;

        while (hasMoreData) {
            const response = await fetch(`${apiUrl}/api/coins/${userId}/transactions?limit=${BATCH_SIZE}&offset=${offset}`);
            
            if (!response.ok) {
                break;
            }

            const transactions = await response.json();
            const questClaims = transactions.filter(tx => tx.transaction_type === 'quest_reward').length;
            totalQuestClaims += questClaims;

            hasMoreData = transactions.length >= BATCH_SIZE;
            offset += BATCH_SIZE;
        }

        return totalQuestClaims;
    }

    /**
     * Load games tried count
     * @private
     */
    async _loadGamesTried(content, user, apiUrl) {
        const gamesTriedEl = content.querySelector('#gamesTried');
        if (!gamesTriedEl) {
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/users/${user.user_id}/sessions?limit=1000`);
            
            if (response.ok) {
                const sessionsData = await response.json();
                const uniqueGames = new Set(sessionsData.sessions.map(session => session.game_id)).size;
                gamesTriedEl.textContent = uniqueGames;
            }
        } catch (error) {
            console.error('Failed to load games tried:', error);
            gamesTriedEl.textContent = '0';
        }
    }

    /**
     * Calculate and display days member
     * @private
     */
    _calculateDaysMember(content, user) {
        const daysMemberEl = content.querySelector('#daysMember');
        
        if (!daysMemberEl || !user.created_at) {
            return;
        }

        const createdDate = new Date(user.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
        daysMemberEl.textContent = daysDiff;
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
                        coinsBadge.style.cursor = 'pointer';
                    });

                    coinsBadge.addEventListener('mouseleave', () => {
                        coinsBadge.style.transform = '';
                        coinsBadge.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(234, 179, 8, 0.05))';
                        coinsBadge.style.border = '2px solid rgba(234, 179, 8, 0.3)';
                        coinsBadge.style.boxShadow = '';
                    });

                    coinsBadge.addEventListener('click', () => {
                        // Navigate directly to wallet page
                        window.location.hash = '#/wallet';
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

                        // fall through to broadcast
                    }
                }

                // Fallback: construct an account_witness_vote operation and broadcast
                const ops = [[
                    'account_witness_vote',
                    { voter: steemUsername, witness: 'cur8.witness', approve: true }
                ]];

                window.steem_keychain.requestBroadcast(steemUsername, ops, 'active', (result) => {


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

                            if (resp && (resp.success === true || resp.result)) return resolve(resp);
                            return reject(new Error((resp && resp.error && resp.error.message) || 'Delegation failed'));
                        });
                        return;
                    } catch (e) {

                    }
                }

                window.steem_keychain.requestBroadcast(steemUsername, ops, 'active', (result) => {

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
        const modal = this._createModalContainer();
        modal.innerHTML = this._generateModalContent(breakdown);
        document.body.appendChild(modal);

        this._setupModalEventListeners(modal, breakdown);
    }

    /**
     * Create modal container element
     * @private
     */
    _createModalContainer() {
        const modal = document.createElement('div');
        modal.className = 'multiplier-modal-overlay';
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
        return modal;
    }

    /**
     * Generate modal HTML content
     * @private
     */
    _generateModalContent(breakdown) {
        const witnessSection = this._generateWitnessSectionHTML(breakdown);
        const delegationSection = this._generateDelegationSectionHTML(breakdown);
        const boostTipsSection = this._generateBoostTipsHTML(breakdown);

        return `
            <div style="background: var(--background-light); border-radius: 16px; max-width: 450px; width: 90%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid var(--border); animation: slideUp 0.3s ease-out;">
                ${this._generateModalHeader()}
                <div style="padding: 16px;">
                    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px; margin-bottom: 12px;">
                        ${this._generateBaseMultiplierHTML(breakdown)}
                        ${witnessSection}
                        ${delegationSection}
                        ${this._generateDivider()}
                        ${this._generateTotalMultiplierHTML(breakdown)}
                    </div>
                    ${boostTipsSection}
                </div>
            </div>
        `;
    }

    /**
     * Generate modal header HTML
     * @private
     */
    _generateModalHeader() {
        return `
            <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: var(--text-primary);">⚡ CUR8 Multiplier</h2>
                    <button class="modal-close-btn" style="background: none; border: none; font-size: 28px; color: var(--text-muted); cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s;">×</button>
                </div>
            </div>
        `;
    }

    /**
     * Generate base multiplier HTML
     * @private
     */
    _generateBaseMultiplierHTML(breakdown) {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 14px; color: var(--text-secondary); font-weight: 500;">Base Multiplier</span>
                <span style="font-weight: 700; font-size: 18px; color: var(--text-primary);">+${breakdown.base.toFixed(1)}x</span>
            </div>
        `;
    }

    /**
     * Generate witness section HTML
     * @private
     */
    _generateWitnessSectionHTML(breakdown) {
        const hasWitnessBonus = breakdown.witness_bonus > 0;
        const bgColor = hasWitnessBonus ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        const borderColor = hasWitnessBonus ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)';
        const textColor = hasWitnessBonus ? '#22c55e' : 'var(--text-muted)';
        const icon = hasWitnessBonus ? '✅' : '⬜';
        const statusText = hasWitnessBonus ? 'Voting for cur8.witness' : 'Not voting yet';
        const voteButton = hasWitnessBonus ? '' : `<button id="voteCur8Btn" style="margin-left:12px; background: linear-gradient(90deg,#16a34a,#059669); color: white; border: none; padding: 6px 10px; border-radius: 8px; font-weight:700; cursor: pointer;">Vote</button>`;

        return `
            <div style="padding: 12px; background: ${bgColor}; border-radius: 10px; border: 2px solid ${borderColor}; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 28px;">${icon}</span>
                        <div>
                            <div style="font-size: 15px; color: var(--text-primary); font-weight: 600;">Witness Vote</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${statusText}</div>
                        </div>
                        ${voteButton}
                    </div>
                    <span style="font-weight: 800; font-size: 20px; color: ${textColor};">+${breakdown.witness_bonus.toFixed(1)}x</span>
                </div>
            </div>
        `;
    }

    /**
     * Generate delegation section HTML
     * @private
     */
    _generateDelegationSectionHTML(breakdown) {
        const hasDelegationBonus = breakdown.delegation_bonus > 0;
        const bgColor = hasDelegationBonus ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        const borderColor = hasDelegationBonus ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)';
        const textColor = hasDelegationBonus ? '#3b82f6' : 'var(--text-muted)';

        return `
            <div style="padding: 12px; background: ${bgColor}; border-radius: 10px; border: 2px solid ${borderColor};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom:8px;">
                    <div>
                        <div style="font-size: 15px; color: var(--text-primary); font-weight: 600;">Steem Delegation</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${breakdown.delegation_amount.toFixed(0)} STEEM delegated</div>
                    </div>
                    <span id="delegationBonusValue" style="font-weight: 800; font-size: 20px; color: ${textColor};">+${breakdown.delegation_bonus.toFixed(2)}x</span>
                </div>
                <div style="display:flex; gap:8px; width:100%; align-items:center;">
                    <input id="delegateAmountSlider" list="delegateTicks" type="range" min="0" max="10000" step="1" value="${breakdown.delegation_amount.toFixed(0)}" style="flex:1;">
                    <datalist id="delegateTicks"></datalist>
                    <button id="delegateCur8Btn" style="background: linear-gradient(90deg,#3b82f6,#2563eb); color: white; border: none; padding: 8px 10px; border-radius: 8px; font-weight:700; cursor: pointer;">Delegate</button>
                </div>
            </div>
        `;
    }

    /**
     * Generate divider HTML
     * @private
     */
    _generateDivider() {
        return `<div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); margin: 12px 0;"></div>`;
    }

    /**
     * Generate total multiplier HTML
     * @private
     */
    _generateTotalMultiplierHTML(breakdown) {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 16px; color: var(--text-primary); font-weight: 700;">Total Multiplier <span style="font-size:12px; color:var(--text-secondary); font-weight:600; margin-left:8px;">(max 4x)</span></span>
                <span id="finalMultiplierValue" style="font-weight: 800; font-size: 24px; color: #818cf8;">${breakdown.final_multiplier.toFixed(2)}x</span>
            </div>
        `;
    }

    /**
     * Generate boost tips HTML
     * @private
     */
    _generateBoostTipsHTML(breakdown) {
        if (breakdown.is_capped) {
            return '';
        }

        const witnessTip = breakdown.witness_bonus === 0
            ? '<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; padding-left: 22px;">• Vote <strong>@cur8.witness</strong> → <strong>+0.5x</strong></div>'
            : '';

        const delegationTip = breakdown.delegation_amount < 1000
            ? '<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; padding-left: 22px;">• Delegate to <strong>@cur8</strong> → <strong>+0.1x /1000 SP</strong></div>'
            : '';

        return `
            <div style="padding: 14px; background: rgba(251, 191, 36, 0.15); border-radius: 12px; border: 2px solid rgba(251, 191, 36, 0.4);">
                <div style="font-size: 14px; color: #fbbf24; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    <span>💡</span>
                    <span>HOW TO BOOST</span>
                </div>
                ${witnessTip}
                ${delegationTip}
                <div id="multiplierStatus" style="margin-top:8px; font-size:13px; color:var(--text-secondary);"></div>
            </div>
        `;
    }

    /**
     * Setup modal event listeners
     * @private
     */
    _setupModalEventListeners(modal, breakdown) {
        this._setupModalCloseListeners(modal);
        this._setupVoteButton(modal, breakdown);
        this._setupDelegationControls(modal, breakdown);
    }

    /**
     * Setup modal close listeners
     * @private
     */
    _setupModalCloseListeners(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        const closeBtn = modal.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
            closeBtn.addEventListener('mouseover', () => {
                closeBtn.style.background = 'rgba(255,255,255,0.1)';
            });
            closeBtn.addEventListener('mouseout', () => {
                closeBtn.style.background = 'none';
            });
        }
    }

    /**
     * Setup vote button functionality
     * @private
     */
    _setupVoteButton(modal, breakdown) {
        const voteBtn = modal.querySelector('#voteCur8Btn');
        if (!voteBtn) {
            return;
        }

        voteBtn.addEventListener('click', () => this._handleVoteClick(modal, voteBtn, breakdown));
    }

    /**
     * Handle vote button click
     * @private
     */
    async _handleVoteClick(modal, voteBtn, breakdown) {
        const statusEl = modal.querySelector('#multiplierStatus');
        voteBtn.disabled = true;
        const prevText = voteBtn.textContent;
        voteBtn.textContent = '🔄 Voting...';

        try {
            await this.voteCur8Witness();
            voteBtn.textContent = '✅ Voted';

            if (statusEl) {
                statusEl.textContent = '✅ Vote broadcasted. Updating multiplier...';
            }

            await this._updateMultiplierAfterVote(breakdown);

            if (statusEl) {
                statusEl.textContent = '✅ Vote applied. Updating UI...';
            }

            await this._refreshModalWithNewBreakdown(modal);
            await this._updateProfileVisualsAfterVote();

        } catch (err) {
            console.error('Vote error:', err);
            voteBtn.textContent = '❌ Failed';
        } finally {
            voteBtn.disabled = false;
            setTimeout(() => {
                try {
                    voteBtn.textContent = prevText;
                } catch (e) {
                    // Ignore if button no longer exists
                }
            }, 3000);
        }
    }

    /**
     * Update multiplier after vote
     * @private
     */
    async _updateMultiplierAfterVote(breakdown) {
        const currentDelegation = this._getCurrentDelegationAmount(breakdown);

        try {
            await this.updateMultiplierBackend(true, currentDelegation);
        } catch (e) {

            await this.refreshMultiplierForCurrentUser();
        }
    }

    /**
     * Get current delegation amount from breakdown or user
     * @private
     */
    _getCurrentDelegationAmount(breakdown) {
        if (breakdown?.delegation_amount) {
            return Number(breakdown.delegation_amount) || 0;
        }

        const user = this.authManager.getUser?.();
        return Number(user?.delegation_amount) || 0;
    }

    /**
     * Refresh modal with new breakdown data
     * @private
     */
    async _refreshModalWithNewBreakdown(modal) {
        try {
            const API_URL = window.ENV?.API_URL || config.API_URL || window.location.origin;
            const userId = this.authManager.getUser().user_id;
            const response = await fetch(`${API_URL}/users/multiplier-breakdown/${userId}`);

            if (response.ok) {
                const json = await response.json();
                modal.remove();
                this.showMultiplierModal(json.breakdown);
            }
        } catch (e) {

        }
    }

    /**
     * Update profile visuals after vote
     * @private
     */
    async _updateProfileVisualsAfterVote() {
        try {
            const updatedUser = this.authManager.getUser();
            const steemUsername = this.extractSteemUsername(updatedUser);

            if (steemUsername) {
                const steemProfile = await steemProfileService.fetchProfile(steemUsername);
                if (steemProfile) {
                    this.updateProfileWithSteemData(updatedUser, steemProfile);
                }
            }

            window.dispatchEvent(new CustomEvent('multiplierUpdated', { detail: this.authManager.getUser() }));
        } catch (e) {

        }
    }

    /**
     * Setup delegation controls
     * @private
     */
    _setupDelegationControls(modal, breakdown) {
        const delegateBtn = modal.querySelector('#delegateCur8Btn');
        const slider = modal.querySelector('#delegateAmountSlider');

        if (!delegateBtn || !slider) {
            return;
        }

        this._initializeDelegationSlider(modal, slider, breakdown);
        this._setupDelegationPreviewUpdater(modal, slider, breakdown);
        this._loadSteemProfileForSlider(modal, slider, breakdown);
        this._setupDelegateButton(modal, delegateBtn, slider, breakdown);
    }

    /**
     * Initialize delegation slider
     * @private
     */
    _initializeDelegationSlider(modal, slider, breakdown) {
        try {
            slider.value = Number(breakdown.delegation_amount || 0).toFixed(0);

            const availableSp = this._getAvailableSp(breakdown);
            const delegatedAmount = Number(breakdown.delegation_amount || 0);
            const inferredMax = Math.max(1, Math.floor(Math.max(availableSp, delegatedAmount)));

            slider.max = inferredMax;

            if (delegatedAmount > 0) {
                slider.value = Math.min(delegatedAmount, slider.max);
            }

            this._populateSliderTicks(modal, inferredMax, delegatedAmount);

            breakdown.available_sp = Math.max(availableSp, delegatedAmount);
        } catch (e) {

        }
    }

    /**
     * Get available SP from breakdown or user
     * @private
     */
    _getAvailableSp(breakdown) {
        if (breakdown.available_sp !== undefined) {
            return Number(breakdown.available_sp) || 0;
        }
        if (breakdown.available_steem !== undefined) {
            return Number(breakdown.available_steem) || 0;
        }

        const user = this.authManager.getUser?.();
        return Number(user?.steem_power) || 0;
    }

    /**
     * Populate slider tick marks
     * @private
     */
    _populateSliderTicks(modal, maxValue, currentDelegation) {
        const datalist = modal.querySelector('#delegateTicks');
        if (!datalist) {
            return;
        }

        datalist.innerHTML = '';

        const ticks = [
            0,
            Math.floor(maxValue * 0.1),
            Math.floor(maxValue * 0.25),
            Math.floor(maxValue * 0.5),
            maxValue
        ];

        if (currentDelegation > 0) {
            ticks.push(Math.floor(currentDelegation));
        }

        const uniqueTicks = [...new Set(ticks)].filter(n => Number.isFinite(n));

        uniqueTicks.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            datalist.appendChild(option);
        });
    }

    /**
     * Setup delegation preview updater
     * @private
     */
    _setupDelegationPreviewUpdater(modal, slider, breakdown) {
        const updatePreview = () => this._computeDelegationPreview(modal, slider, breakdown);

        slider.addEventListener('input', updatePreview);
        updatePreview();
    }

    /**
     * Compute and display delegation preview
     * @private
     */
    _computeDelegationPreview(modal, slider, breakdown) {
        try {
            const sliderValue = Math.max(0, Number(slider?.value || 0));
            const perSpBonus = this._calculatePerSpBonus(breakdown);
            const rawDelegationBonus = sliderValue * perSpBonus;

            const perDelegationCap = this._getDelegationCap(breakdown);
            const cappedBySingleDelegation = Math.min(rawDelegationBonus, perDelegationCap);

            const baseWithoutDelegation = this._calculateBaseWithoutDelegation(breakdown);
            const newTotal = baseWithoutDelegation + cappedBySingleDelegation;
            const cappedTotal = Math.min(newTotal, 4.0);
            const effectiveDelegationBonus = Math.max(0, cappedTotal - baseWithoutDelegation);

            this._updatePreviewDisplay(modal, effectiveDelegationBonus, cappedTotal, sliderValue, breakdown);
        } catch (e) {
            // Ignore preview calculation errors
        }
    }

    /**
     * Calculate per SP bonus rate
     * @private
     */
    _calculatePerSpBonus(breakdown) {
        if (breakdown.delegation_amount && breakdown.delegation_amount > 0 && breakdown.delegation_bonus !== undefined) {
            return Number(breakdown.delegation_bonus) / Number(breakdown.delegation_amount);
        }
        return 0.0001; // Default: +0.1x per 1000 SP
    }

    /**
     * Get delegation cap based on witness vote status
     * @private
     */
    _getDelegationCap(breakdown) {
        if (breakdown.max_delegation_bonus !== undefined) {
            return Number(breakdown.max_delegation_bonus);
        }

        const hasWitnessBonus = Number(breakdown.witness_bonus) > 0;
        return hasWitnessBonus ? 2.5 : 3.0;
    }

    /**
     * Calculate base multiplier without delegation
     * @private
     */
    _calculateBaseWithoutDelegation(breakdown) {
        let base = breakdown.base !== undefined
            ? Number(breakdown.base)
            : (Number(breakdown.final_multiplier) || 1) - (Number(breakdown.delegation_bonus) || 0);

        return base + (Number(breakdown.witness_bonus) || 0);
    }

    /**
     * Update preview display elements
     * @private
     */
    _updatePreviewDisplay(modal, effectiveDelegationBonus, cappedTotal, sliderValue, breakdown) {
        const delegationBonusEl = modal.querySelector('#delegationBonusValue');
        const finalMultEl = modal.querySelector('#finalMultiplierValue');
        const delegateBtn = modal.querySelector('#delegateCur8Btn');
        const labelEl = modal.querySelector('#delegateAmountLabel');

        if (delegationBonusEl) {
            delegationBonusEl.textContent = `+${effectiveDelegationBonus.toFixed(2)}x`;
        }

        if (finalMultEl) {
            finalMultEl.textContent = `${cappedTotal.toFixed(2)}x`;
        }

        if (delegateBtn && !delegateBtn.disabled) {
            delegateBtn.textContent = `Delegate ${sliderValue.toFixed(0)} SP`;
        }

        if (labelEl) {
            const available = this._getAvailableSp(breakdown);
            labelEl.textContent = `Selected: ${sliderValue.toFixed(0)} SP — Available: ${available ? Math.floor(available) : '—'}`;
        }
    }

    /**
     * Load Steem profile data for slider configuration
     * @private
     */
    async _loadSteemProfileForSlider(modal, slider, breakdown) {
        try {
            const user = this.authManager.getUser?.();
            const steemUsername = this.extractSteemUsername(user);

            if (!steemUsername) {
                return;
            }

            const spProfile = await steemProfileService.fetchProfile(steemUsername);
            if (!spProfile?.account) {
                return;
            }

            const availableSp = await this._calculateAvailableSp(spProfile);

            slider.max = Math.max(1, availableSp);
            if (Number(slider.value) > Number(slider.max)) {
                slider.value = slider.max;
            }

            this._populateSliderTicks(modal, availableSp, Number(breakdown.delegation_amount || 0));

            breakdown.available_sp = availableSp;
            this._computeDelegationPreview(modal, slider, breakdown);
        } catch (e) {

        }
    }

    /**
     * Calculate available SP from Steem profile
     * @private
     */
    async _calculateAvailableSp(spProfile) {
        const vestsPerSteem = await steemProfileService._getVestsToSpRatio();
        const vestingShares = parseFloat((spProfile.account.vesting_shares || '0 VESTS').split(' ')[0] || '0');
        const delegatedVestingShares = parseFloat((spProfile.account.delegated_vesting_shares || '0 VESTS').split(' ')[0] || '0');

        const delegatedToCur8Vests = await this._getDelegatedToCur8Vests(spProfile.account.name);
        const delegatedToOthers = Math.max(0, delegatedVestingShares - delegatedToCur8Vests);
        const availableVests = Math.max(0, vestingShares - delegatedToOthers);

        return Math.floor(availableVests / (vestsPerSteem || 1));
    }

    /**
     * Get amount delegated to cur8 in vests
     * @private
     */
    async _getDelegatedToCur8Vests(accountName) {
        try {
            const outgoing = await steemProfileService.getOutgoingVestingDelegations(accountName);

            if (!Array.isArray(outgoing)) {
                return 0;
            }

            return outgoing.reduce((total, delegation) => {
                if (delegation.delegatee === 'cur8') {
                    return total + parseFloat((delegation.vesting_shares || '0 VESTS').split(' ')[0] || '0');
                }
                return total;
            }, 0);
        } catch (e) {

            return 0;
        }
    }

    /**
     * Setup delegate button click handler
     * @private
     */
    _setupDelegateButton(modal, delegateBtn, slider, breakdown) {
        delegateBtn.addEventListener('click', () => {
            this._handleDelegateClick(modal, delegateBtn, slider, breakdown);
        });
    }

    /**
     * Handle delegate button click
     * @private
     */
    async _handleDelegateClick(modal, delegateBtn, slider, breakdown) {
        delegateBtn.disabled = true;
        const amount = Number(slider?.value || 0);
        const prevText = delegateBtn.textContent;
        delegateBtn.textContent = '🔄 Delegating...';

        const statusEl = this._getOrCreateDelegateStatusElement(modal);
        if (statusEl) {
            statusEl.textContent = '';
        }

        try {
            if (!amount || amount <= 0) {
                throw new Error('Please enter a valid amount');
            }

            await this.delegateToCur8(amount);

            if (statusEl) {
                statusEl.textContent = '✅ Delegation broadcasted. Updating multiplier...';
            }

            await this._updateMultiplierAfterDelegation(breakdown, amount);
            await this._refreshModalWithNewBreakdown(modal);

        } catch (err) {
            console.error('Delegation error:', err);
            delegateBtn.textContent = '❌ Failed';
        } finally {
            delegateBtn.disabled = false;
            setTimeout(() => {
                try {
                    delegateBtn.textContent = prevText;
                } catch (e) {
                    // Ignore if button no longer exists
                }
            }, 3000);
        }
    }

    /**
     * Get or create delegate status element
     * @private
     */
    _getOrCreateDelegateStatusElement(modal) {
        let statusEl = modal.querySelector('#delegateStatus');

        if (!statusEl) {
            const delegateContainer = modal.querySelector('#delegateAmountSlider')?.parentElement?.parentElement;
            if (delegateContainer) {
                statusEl = document.createElement('div');
                statusEl.id = 'delegateStatus';
                statusEl.style.cssText = 'margin-top:6px; font-size:13px; color:var(--text-secondary);';
                delegateContainer.appendChild(statusEl);
            }
        }

        return statusEl;
    }

    /**
     * Update multiplier after delegation
     * @private
     */
    async _updateMultiplierAfterDelegation(breakdown, amount) {
        const votesWitness = this._hasWitnessVote(breakdown);

        try {
            await this.updateMultiplierBackend(votesWitness, amount);
        } catch (e) {

            await this.refreshMultiplierForCurrentUser();
        }
    }

    /**
     * Check if user has witness vote
     * @private
     */
    _hasWitnessVote(breakdown) {
        if (breakdown && typeof breakdown.witness_bonus !== 'undefined') {
            return Number(breakdown.witness_bonus) > 0;
        }

        const user = this.authManager.getUser?.();
        return Boolean(user?.votes_cur8_witness);
    }

    /**
     * Initialize Steem post button
     */
    async initializeSteemPostButton(user) {
        const steemPostBanner = document.getElementById('steemPostBanner');
        const shareBtn = document.getElementById('shareOnSteemBtn');
        
        // Only show for Steem users
        const steemUsername = user?.steem_username || user?.username;
        if (!steemUsername || !steemPostBanner) {
            return;
        }

        steemPostBanner.style.display = 'block';
        this._initializeSteemPostAPI();

        if (shareBtn) {
            await this._setupShareButton(shareBtn, user);
        }
    }

    /**
     * Initialize Steem post API if needed
     * @private
     */
    _initializeSteemPostAPI() {
        if (!window.steemPostAPI) {
            const API_URL = window.ENV?.API_URL || window.location.origin;
            window.steemPostAPI = new SteemPostAPI(API_URL);
        }
    }

    /**
     * Setup share button with availability check and click handler
     * @private
     */
    async _setupShareButton(shareBtn, user) {
        try {
            const availability = await window.steemPostAPI.checkPostAvailability(user.user_id);

            if (!availability.can_post) {
                this._setupCooldownState(shareBtn, availability, user.user_id);
            }
        } catch (error) {
            console.error('Error checking post availability:', error);
        }

        this._attachShareButtonClickHandler(shareBtn);
    }

    /**
     * Format time remaining for display
     * @private
     */
    _formatTimeRemaining(hours, minutes, seconds) {
        if (hours >= 1) {
            return `${hours}h`;
        }
        if (minutes >= 1) {
            return `${minutes}m`;
        }
        return `${seconds}s`;
    }

    /**
     * Get update interval based on time remaining
     * @private
     */
    _getUpdateInterval(hoursRemaining) {
        return hoursRemaining >= 1 ? 60000 : 1000;
    }

    /**
     * Update button HTML for cooldown state
     * @private
     */
    _setButtonCooldownHTML(shareBtn, timeString) {
        shareBtn.innerHTML = `
            <span class="btn-icon">⏱️</span>
            <span class="btn-text">Available in ${timeString}</span>
            <span class="btn-cost">500 🪙</span>
        `;
    }

    /**
     * Update button HTML for enabled state
     * @private
     */
    _setButtonEnabledHTML(shareBtn) {
        shareBtn.innerHTML = `
            <span class="btn-icon">🚀</span>
            <span class="btn-text">Share on Steem</span>
            <span class="btn-cost">500 🪙</span>
        `;
    }

    /**
     * Setup cooldown state for share button
     * @private
     */
    _setupCooldownState(shareBtn, availability, userId) {
        shareBtn.disabled = true;
        shareBtn.classList.add('disabled');
        
        const timeString = this._formatTimeRemaining(
            availability.hours_remaining,
            availability.minutes_remaining,
            availability.seconds_remaining
        );
        this._setButtonCooldownHTML(shareBtn, timeString);

        this._startCooldownUpdater(shareBtn, userId, availability.hours_remaining);
    }

    /**
     * Start cooldown updater interval
     * @private
     */
    _startCooldownUpdater(shareBtn, userId, initialHoursRemaining) {
        let updateInterval = null;

        const updateCooldown = async () => {
            try {
                const newAvailability = await window.steemPostAPI.checkPostAvailability(userId);
                
                if (newAvailability.can_post) {
                    this._enableShareButton(shareBtn);
                    if (updateInterval) {
                        clearInterval(updateInterval);
                        updateInterval = null;
                    }
                } else {
                    this._updateCooldownDisplay(shareBtn, newAvailability);
                    this._adjustUpdateInterval(updateInterval, updateCooldown, newAvailability.hours_remaining);
                }
            } catch (error) {
                console.error('Error updating cooldown:', error);
            }
        };

        const initialInterval = this._getUpdateInterval(initialHoursRemaining);
        updateInterval = setInterval(updateCooldown, initialInterval);
    }

    /**
     * Enable share button after cooldown
     * @private
     */
    _enableShareButton(shareBtn) {
        shareBtn.disabled = false;
        shareBtn.classList.remove('disabled');
        this._setButtonEnabledHTML(shareBtn);
    }

    /**
     * Update cooldown display on button
     * @private
     */
    _updateCooldownDisplay(shareBtn, availability) {
        const timeString = this._formatTimeRemaining(
            availability.hours_remaining,
            availability.minutes_remaining,
            availability.seconds_remaining
        );
        this._setButtonCooldownHTML(shareBtn, timeString);
    }

    /**
     * Adjust update interval based on time remaining
     * @private
     */
    _adjustUpdateInterval(currentInterval, callback, hoursRemaining) {
        if (currentInterval) {
            clearInterval(currentInterval);
        }
        const newIntervalTime = this._getUpdateInterval(hoursRemaining);
        return setInterval(callback, newIntervalTime);
    }

    /**
     * Attach click handler to share button
     * @private
     */
    _attachShareButtonClickHandler(shareBtn) {
        shareBtn.addEventListener('click', async () => {
            if (shareBtn.disabled) {
                return;
            }

            try {
                this._initializeCoinAPI();
                await this._showSteemPostModal();
            } catch (error) {
                console.error('Error showing Steem post modal:', error);
            }
        });
    }

    /**
     * Initialize Coin API if needed
     * @private
     */
    _initializeCoinAPI() {
        if (!window.coinAPI) {
            const API_URL = window.ENV?.API_URL || window.location.origin;
            window.coinAPI = new CoinAPI(API_URL);
        }
    }

    /**
     * Show Steem post modal
     * @private
     */
    async _showSteemPostModal() {
        const modal = new SteemPostModal(
            window.steemPostAPI,
            window.coinAPI,
            this.authManager
        );
        await modal.show();
    }
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

/**
 * Exported render function for router
 */
export async function renderProfile() {
    const renderer = new ProfileRenderer();
    await renderer.render();
}

// Expose a helper to open the canonical CUR8 multiplier modal from other scripts
try {
    window.showCur8MultiplierModal = function (breakdown) {
        try {
            const renderer = new ProfileRenderer();
            renderer.showMultiplierModal(breakdown);
        } catch (e) {

        }
    };
} catch (e) {
    // ignore if window not writable
}