import { fetchGames, fetchGameMetadata, getGameResourceUrl, getGamePreviewUrl, trackGamePlay } from './api.js';
import { SteemProfileService } from './SteemProfileService.js';
import { steemAvatarService } from './SteemAvatarService.js';
import { QuestRenderer } from './quest.js';
import { navigateTo, initRouter } from './router.js';
import RuntimeShell from './runtimeShell.obf.js';
import { pushManager } from './PushNotificationManager.js';


// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication - use window.AuthManager defined in auth.js
    if (window.AuthManager && !window.AuthManager.isLoggedIn()) {
        // Redirect to auth page if not on auth page
        if (!window.location.pathname.includes('auth.html')) {

            window.location.href = '/auth.html';
            return;
        }
    }

    // Track daily access for login quests (only if authenticated)
    if (window.AuthManager && window.AuthManager.isLoggedIn()) {
        window.AuthManager.trackDailyAccess();
        
        // Initialize push notifications (non-blocking)
        initPushNotifications();
    }

    initRouter();

    // Populate navbar user info if authenticated
    try {
        const userInfoEl = document.getElementById('userInfo');
        if (window.AuthManager && window.AuthManager.currentUser && userInfoEl) {
            const user = window.AuthManager.currentUser;
            const userNameEl = document.getElementById('userName');
            const navAvatar = document.getElementById('navAvatar');
            const navMultiplier = document.getElementById('navMultiplier');
            const levelCardContainer = document.getElementById('levelCardContainer');
            if (userNameEl) userNameEl.textContent = user.username || user.steemUsername || 'Player';

            if (navAvatar) {
                navAvatar.src = './icons/icon-72x72.png';
                // if user has a steem username, fetch the Steem profile for the avatar
                try {
                    const steemService = new SteemProfileService();
                    const steemUsername = user.steemUsername || user.steem_username || user.username;
                    if (steemUsername) {
                        steemService.fetchProfile(steemUsername).then(sp => {
                            if (sp && sp.profileImage) {
                                navAvatar.src = sp.profileImage;
                            }
                        }).catch(e => {

                        });
                    }
                } catch (e) {

                }
            }
            if (navMultiplier) navMultiplier.textContent = `${(user.cur8_multiplier || 1).toFixed(2)}x`;

            // show container
            userInfoEl.style.display = 'flex';

            // Multiplier is rendered in its own navbar card (`#multiplierCard`).

            // Level card click-to-profile disabled per UI requirement

            // Wire logout button if present
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) logoutBtn.addEventListener('click', () => {
                try { window.AuthManager.logout(); } catch (e) { console.warn('Logout failed', e); }
                window.location.href = '/auth.html';
            });
        }
    } catch (e) { console.warn('Navbar init failed', e); }

    // Listen for multiplier updates dispatched by ProfileRenderer and other components
    window.addEventListener('multiplierUpdated', (ev) => {
        try {
            const updated = ev?.detail || ev;
            const navMultiplierEl = document.getElementById('navMultiplier');

            // Prefer explicit cur8_multiplier on user object
            if (updated && (updated.cur8_multiplier !== undefined && updated.cur8_multiplier !== null)) {
                if (navMultiplierEl) navMultiplierEl.textContent = `${Number(updated.cur8_multiplier).toFixed(2)}x`;
                return;
            }

            // If a breakdown payload was provided, prefer its final_multiplier
            if (updated && updated.breakdown && updated.breakdown.final_multiplier !== undefined) {
                if (navMultiplierEl) navMultiplierEl.textContent = `${Number(updated.breakdown.final_multiplier).toFixed(2)}x`;
                return;
            }

            // Fallback: try to fetch fresh breakdown for the currently logged user
            (async () => {
                try {
                    const user = window.AuthManager && window.AuthManager.getUser && window.AuthManager.getUser();
                    if (!user || !user.user_id) return;
                    const API_URL = window.ENV?.API_URL || window.location.origin;
                    const resp = await fetch(`${API_URL}/users/multiplier-breakdown/${user.user_id}`);
                    if (!resp.ok) return;
                    const json = await resp.json();
                    const finalMult = json && json.breakdown && json.breakdown.final_multiplier;
                    if (navMultiplierEl && finalMult !== undefined) navMultiplierEl.textContent = `${Number(finalMult).toFixed(2)}x`;
                } catch (e) {

                }
            })();
        } catch (err) {

        }
    });

    // Keep navbar multiplier in sync on login/logout
    window.addEventListener('userLogin', (e) => {
        try {
            const user = window.AuthManager?.getUser?.();
            const navMultiplierEl = document.getElementById('navMultiplier');
            if (navMultiplierEl && user) {
                const val = Number(user.cur8_multiplier || 1).toFixed(2);
                navMultiplierEl.textContent = `${val}x`;
            }
        } catch (err) { console.warn('Failed to update nav multiplier on login', err); }
    });

    window.addEventListener('userLogout', () => {
        const navMultiplierEl = document.getElementById('navMultiplier');
        if (navMultiplierEl) navMultiplierEl.textContent = `1.00x`;

        // Hide daily login trigger button on logout
        const trigger = document.getElementById('daily-login-trigger');
        if (trigger) trigger.style.display = 'none';
    });

    // Cleanup game session on page unload (browser close/refresh)
    window.addEventListener('beforeunload', () => {
        if (window.currentGameRuntime) {
            // Use sendBeacon for reliable cleanup on page unload
            window.currentGameRuntime.cleanup(true);
        }
    });
});

// Current game mode filter state
let currentGameMode = 'ranked';

// Helper: unified play count accessor (prefer metadata.playCount, then session_count)
function getPlayCount(game) {
    const metaCount = game?.metadata?.playCount;
    if (typeof metaCount === 'number' && !isNaN(metaCount)) return metaCount;
    if (typeof game?.session_count === 'number') return game.session_count;
    if (typeof game?.play_count === 'number') return game.play_count;
    return 0;
}

/**
 * Render the game catalog page
 */
export async function renderCatalog(filters = {}) {
    const appContainer = document.getElementById('app');
    const template = document.getElementById('catalog-template');
    const catalogContent = template.content.cloneNode(true);

    appContainer.innerHTML = '';
    appContainer.appendChild(catalogContent);

    // Restore tab state from memory
    restoreTabState();

    // Set up filter event listeners
    setupFilters();
    
    // Set up game mode tabs
    setupGameModeTabs();

    // Load and display games with current mode filter
    await loadGames({ ...filters, mode: currentGameMode });
}

/**
 * Restore tab visual state from currentGameMode
 */
function restoreTabState() {
    const tabsContainer = document.querySelector('.game-mode-tabs');
    const tabs = document.querySelectorAll('.game-mode-tab');
    
    if (tabsContainer) {
        // Set the mode-fun class if Fun is selected
        tabsContainer.classList.toggle('mode-fun', currentGameMode === 'fun');
    }
    
    // Update active state on tabs
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === currentGameMode);
    });
}

/**
 * Set up event listeners for filters
 */
function setupFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const featuredFilter = document.getElementById('featured-filter');

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            const filters = { category: e.target.value, mode: currentGameMode };
            loadGames(filters);
        });
    }

    if (featuredFilter) {
        let isFeaturedOnly = false;
        featuredFilter.addEventListener('click', () => {
            isFeaturedOnly = !isFeaturedOnly;
            featuredFilter.classList.toggle('active', isFeaturedOnly);
            const filters = isFeaturedOnly ? { featured: true, mode: currentGameMode } : { mode: currentGameMode };
            loadGames(filters);
        });
    }
}

/**
 * Set up game mode tab event listeners
 */
function setupGameModeTabs() {
    const tabs = document.querySelectorAll('.game-mode-tab');
    const tabsContainer = document.querySelector('.game-mode-tabs');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            const newMode = tab.dataset.mode;
            const oldMode = currentGameMode;
            
            // Skip if same mode
            if (newMode === oldMode) return;
            
            // Determine swipe direction
            const isSwipingLeft = newMode === 'fun';
            const swipeOutClass = isSwipingLeft ? 'swipe-left' : 'swipe-right';
            const swipeInClass = isSwipingLeft ? 'swipe-in-left' : 'swipe-in-right';
            
            // PRE-FETCH: Load new games data BEFORE any animation
            let newContent = null;
            try {
                newContent = await prepareGamesContent(newMode);
            } catch (error) {
                console.error('Error pre-loading games:', error);
                return;
            }
            
            // Update tabs container class for sliding indicator + shine animation
            if (tabsContainer) {
                // Trigger shine animation
                tabsContainer.classList.add('transitioning');
                tabsContainer.classList.toggle('mode-fun', newMode === 'fun');
                
                // Remove transitioning class after animation
                setTimeout(() => {
                    tabsContainer.classList.remove('transitioning');
                }, 600);
            }
            
            // Update active state on tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Now animate with pre-loaded content
            const gameGrid = document.getElementById('game-grid');
            if (gameGrid && newContent) {
                // Start exit animation
                gameGrid.classList.add(swipeOutClass);
                
                // Wait for exit, then swap and enter
                setTimeout(() => {
                    currentGameMode = newMode;
                    gameGrid.classList.remove(swipeOutClass);
                    
                    // Instant content swap
                    gameGrid.innerHTML = '';
                    gameGrid.appendChild(newContent);
                    
                    // Enter animation
                    gameGrid.classList.add(swipeInClass);
                    setTimeout(() => {
                        gameGrid.classList.remove(swipeInClass);
                    }, 300);
                }, 200);
            } else {
                currentGameMode = newMode;
                loadGames({ mode: currentGameMode });
            }
        });
    });
}

/**
 * Pre-fetch and prepare games content without rendering
 */
async function prepareGamesContent(mode) {
    const games = await fetchGames({ mode });
    
    // Filter games by mode
    const filteredGames = games.filter(game => {
        const statusCode = game.status?.status_code || '';
        return statusCode === mode;
    });
    
    // Sort games: primary by play count (most played first), then STEEM, then display order
    filteredGames.sort((a, b) => {
        const aCount = getPlayCount(a);
        const bCount = getPlayCount(b);
        if (aCount !== bCount) return bCount - aCount;

        const aSteemRewards = a.steem_rewards_enabled ? 1 : 0;
        const bSteemRewards = b.steem_rewards_enabled ? 1 : 0;
        if (aSteemRewards !== bSteemRewards) return bSteemRewards - aSteemRewards;

        const aOrder = a.status?.display_order ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.status?.display_order ?? Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
    });
    
    // Build content fragment
    const fragment = document.createDocumentFragment();
    
    if (filteredGames.length === 0) {
        const modeLabel = mode === 'ranked' ? 'Ranked' : 'Fun';
        const noGamesMsg = document.createElement('p');
        noGamesMsg.className = 'text-center no-games-message';
        noGamesMsg.textContent = `No ${modeLabel} games available yet.`;
        fragment.appendChild(noGamesMsg);
    } else {
        filteredGames.forEach(game => {
            const gameCard = createGameCard(game);
            fragment.appendChild(gameCard);
        });
    }
    
    return fragment;
}

/**
 * Load and display games (wrapper for backward compatibility)
 */
async function loadGames(filters = {}) {
    await loadGamesContent(filters);
}

/**
 * Load and display games content
 */
async function loadGamesContent(filters = {}) {
    const gameGrid = document.getElementById('game-grid');

    if (!gameGrid) return;

    gameGrid.innerHTML = '<div class="loading">Loading games...</div>';

    try {
        const games = await fetchGames(filters);

        // Filter games by mode (status_code)
        const modeFilter = filters.mode || 'ranked';
        const filteredGames = games.filter(game => {
            const statusCode = game.status?.status_code || '';
            return statusCode === modeFilter;
        });

        gameGrid.innerHTML = '';

        if (filteredGames.length === 0) {
            const modeLabel = modeFilter === 'ranked' ? 'Ranked' : 'Fun';
            gameGrid.innerHTML = `<p class="text-center no-games-message">No ${modeLabel} games available yet.</p>`;
            return;
        }

        // Sort games primarily by play count (most played first), then STEEM, then display order
        filteredGames.sort((a, b) => {
            const aCount = getPlayCount(a);
            const bCount = getPlayCount(b);
            if (aCount !== bCount) return bCount - aCount;

            const aSteemRewards = a.steem_rewards_enabled ? 1 : 0;
            const bSteemRewards = b.steem_rewards_enabled ? 1 : 0;
            if (aSteemRewards !== bSteemRewards) return bSteemRewards - aSteemRewards;

            const aOrder = a.status?.display_order ?? Number.MAX_SAFE_INTEGER;
            const bOrder = b.status?.display_order ?? Number.MAX_SAFE_INTEGER;
            return aOrder - bOrder;
        });

        filteredGames.forEach(game => {
            const gameCard = createGameCard(game);
            gameGrid.appendChild(gameCard);
        });
    } catch (error) {
        gameGrid.innerHTML = '<div class="error-message">Failed to load games. Please try again later.</div>';
        console.error('Error loading games:', error);
    }
}

/**
 * Create a game card element
 */
function createGameCard(game) {
    const template = document.getElementById('game-card-template');
    const card = template.content.cloneNode(true);

    const cardElement = card.querySelector('.game-card');
    cardElement.dataset.gameId = game.game_id;

    // Set thumbnail (use lightweight preview for card grid)
    const img = card.querySelector('.game-thumbnail img');
    const thumbnailUrl = getGamePreviewUrl(game.game_id, game.thumbnail);
    img.src = thumbnailUrl;
    img.alt = game.title;

    // Add STEEM rewards badge if enabled
    if (game.steem_rewards_enabled) {
        const badgesContainer = card.querySelector('.game-badges');
        const steemBadge = document.createElement('span');
        steemBadge.className = 'steem-rewards-badge';
        steemBadge.title = 'This game offers STEEM rewards';
        const steemImg = document.createElement('img');
        steemImg.src = './icons/steem.png';
        steemImg.alt = 'STEEM';
        steemImg.className = 'steem-rewards-icon';
        steemBadge.appendChild(steemImg);
        steemBadge.appendChild(document.createTextNode(' STEEM'));
        if (badgesContainer) badgesContainer.appendChild(steemBadge);
    }

    // Add COIN badge for casino-category games
    try {
        if (game.category && String(game.category).toLowerCase() === 'casino') {
            const badgesContainer = card.querySelector('.game-badges');
            const coinBadge = document.createElement('span');
            coinBadge.className = 'coin-rewards-badge';
            coinBadge.title = 'This game offers COIN rewards';

            // Use emoji for coin icon (large) — simpler and consistent across platforms
            const coinIcon = document.createElement('span');
            coinIcon.className = 'coin-rewards-icon';
            coinIcon.textContent = '🪙';
            coinBadge.appendChild(coinIcon);
            coinBadge.appendChild(document.createTextNode(' COIN'));
            if (badgesContainer) badgesContainer.appendChild(coinBadge);
        }
    } catch (e) {
    }

    // Set game info
    card.querySelector('.game-title').textContent = game.title;
    card.querySelector('.game-description').textContent = game.description || 'No description available.';
    card.querySelector('.game-author').textContent = `By ${game.author || 'Unknown'}`;
    card.querySelector('.game-category').textContent = game.category || 'Uncategorized';

    // Set tags
    const tagsContainer = card.querySelector('.game-tags');
    if (game.tags && game.tags.length > 0) {
        game.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
        });
    }

    // Add click event to navigate to game detail
    cardElement.addEventListener('click', () => {
        navigateTo(`/game/${game.game_id}`);
    });

    // Add click event to play button
    const playBtn = card.querySelector('.play-btn');
    playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateTo(`/play/${game.game_id}`);
    });

    return card;
}

/**
 * Render the game detail page
 */
export async function renderGameDetail(params) {
    const gameId = params.id || params;

    const appContainer = document.getElementById('app');
    const template = document.getElementById('detail-template');
    const detailContent = template.content.cloneNode(true);

    appContainer.innerHTML = '';
    appContainer.appendChild(detailContent);

    // Set up back button
    const backBtn = document.querySelector('.back-btn');
    backBtn.addEventListener('click', () => {
        navigateTo('/');
    });

    // Load game metadata
    try {
        const game = await fetchGameMetadata(gameId);

        // Populate detail page
        const thumbnailUrl = game.thumbnail
            ? (game.thumbnail.startsWith('http') ? game.thumbnail : getGameResourceUrl(gameId, game.thumbnail))
            : 'https://via.placeholder.com/400x300?text=No+Image';
        document.querySelector('.detail-thumbnail').src = thumbnailUrl;
        document.querySelector('.detail-title').textContent = game.title;
        document.querySelector('.detail-author').textContent = `By ${game.author || 'Unknown'}`;
        document.querySelector('.detail-version').textContent = `Version ${game.version || '1.0.0'}`;
        document.querySelector('.detail-category').textContent = game.category || 'Uncategorized';
        document.querySelector('.detail-description').textContent = game.description || 'No description available.';

        // Rating
        const rating = game.metadata?.rating || 0;
        document.querySelector('.detail-rating').textContent = `★ ${rating.toFixed(1)}`;

        // Tags
        const tagsContainer = document.querySelector('.detail-tags');
        if (game.tags && game.tags.length > 0) {
            game.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
        }

        // Stats
        const stats = document.querySelectorAll('.stat-value');
        stats[0].textContent = game.metadata?.playCount || 0;
        stats[1].textContent = `${game.metadata?.minPlayers || 1}-${game.metadata?.maxPlayers || 1}`;
        stats[2].textContent = game.metadata?.difficulty || 'N/A';

        // Play button
        const playBtn = document.querySelector('.play-game-btn');
        playBtn.addEventListener('click', () => {
            navigateTo(`/play/${gameId}`);
        });

        // Load weekly leaderboard for ranked games
        const isRanked = game.status?.status_code === 'ranked';
        if (isRanked) {
            loadGameDetailLeaderboard(gameId);
        }

    } catch (error) {
        appContainer.innerHTML = '<div class="error-message">Failed to load game details.</div>';
        console.error('Error loading game detail:', error);
    }
}

/**
 * Load and render weekly leaderboard for a game in the detail page
 * Shows a podium for top 3 and a list for the rest
 */
async function loadGameDetailLeaderboard(gameId) {
    const container = document.getElementById('game-detail-leaderboard');
    if (!container) return;

    container.style.display = 'block';
    container.innerHTML = `
        <div class="gdl-section">
            <h3 class="gdl-title">🏆 Weekly Leaderboard</h3>
            <div class="gdl-loading">Loading leaderboard...</div>
        </div>
    `;

    try {
        const LeaderboardAPI = window.LeaderboardAPI;
        if (!LeaderboardAPI) {
            container.style.display = 'none';
            return;
        }

        const [data, weekInfo, rewardsData] = await Promise.all([
            LeaderboardAPI.getWeeklyLeaderboard(gameId, 20),
            LeaderboardAPI.getWeekInfo(),
            LeaderboardAPI.getRewardsConfig(gameId).catch(() => ({ rewards: [], steem_rewards_enabled: false }))
        ]);

        const rewards = rewardsData.rewards || [];
        const steemEnabled = rewardsData.steem_rewards_enabled || false;

        // Helper: find reward for a given rank
        const getRewardForRank = (rank) => {
            return rewards.find(r => rank >= r.rank_start && rank <= r.rank_end) || null;
        };

        // Helper: render reward badges HTML
        const renderRewardBadges = (reward) => {
            if (!reward) return '';
            const parts = [];
            if (steemEnabled && reward.steem_reward > 0) {
                parts.push(`<span class="gdl-reward-steem"><img src="./icons/steem.png" alt="STEEM" class="gdl-reward-icon"> ${reward.steem_reward}</span>`);
            }
            if (reward.coin_reward > 0) {
                parts.push(`<span class="gdl-reward-coin">🪙 ${reward.coin_reward}</span>`);
            }
            return parts.length > 0 ? `<div class="gdl-reward-badges">${parts.join('')}</div>` : '';
        };

        if (!data.success || !data.leaderboard || data.leaderboard.length === 0) {
            container.innerHTML = `
                <div class="gdl-section">
                    <h3 class="gdl-title">🏆 Weekly Leaderboard</h3>
                    <div class="gdl-empty">
                        <p>No scores this week yet. Be the first to play!</p>
                    </div>
                </div>
            `;
            return;
        }

        const entries = data.leaderboard;
        const top3 = entries.slice(0, 3);
        const rest = entries.slice(3);

        // Format week range
        let weekRangeText = '';
        if (weekInfo) {
            const start = new Date(weekInfo.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const end = new Date(weekInfo.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            weekRangeText = `${start} – ${end}`;
        }

        // Build podium HTML (reorder: 2nd, 1st, 3rd)
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
                width: entry.podiumPos === 1 ? 72 : 56,
                height: entry.podiumPos === 1 ? 72 : 56
            });
            const userId = entry.user_id || '';
            const reward = getRewardForRank(entry.rank);
            const rewardHTML = renderRewardBadges(reward);

            return `
                <div class="gdl-podium-player gdl-podium-${entry.podiumPos}" data-user-id="${userId}">
                    <div class="gdl-podium-medal">${medal}</div>
                    <div class="gdl-podium-avatar-wrap">${avatarHTML}</div>
                    <div class="gdl-podium-name">${username}</div>
                    <div class="gdl-podium-score">${(entry.score || entry.total_score || 0).toLocaleString()}</div>
                    ${rewardHTML}
                    <div class="gdl-podium-bar"></div>
                </div>
            `;
        }).join('');

        // Build rest of list
        const hasAnyListReward = rest.some(e => getRewardForRank(e.rank));
        const restHTML = rest.map(entry => {
            const username = entry.username || 'Anonymous';
            const steemUsername = entry.steem_username || null;
            const avatarHTML = steemAvatarService.renderAvatarImg(steemUsername, {
                size: 'small',
                cssClass: 'gdl-list-avatar',
                width: 36,
                height: 36
            });
            const userId = entry.user_id || '';
            const reward = getRewardForRank(entry.rank);
            const rewardHTML = renderRewardBadges(reward);

            return `
                <div class="gdl-list-row ${hasAnyListReward ? 'has-rewards' : ''}" data-user-id="${userId}">
                    <span class="gdl-list-rank">#${entry.rank}</span>
                    <div class="gdl-list-player">${avatarHTML}<span class="gdl-list-name">${username}</span></div>
                    <span class="gdl-list-score">${(entry.score || entry.total_score || 0).toLocaleString()}</span>
                    ${hasAnyListReward ? `<div class="gdl-list-reward">${rewardHTML}</div>` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="gdl-section">
                <div class="gdl-header">
                    <h3 class="gdl-title">🏆 Weekly Leaderboard</h3>
                    ${weekRangeText ? `<span class="gdl-week-range">${weekRangeText}</span>` : ''}
                </div>
                <div class="gdl-podium">${podiumHTML}</div>
                ${rest.length > 0 ? `<div class="gdl-list">${restHTML}</div>` : ''}
                <div class="gdl-footer">
                    <a href="#/leaderboard" class="gdl-see-all">View Full Leaderboard →</a>
                </div>
            </div>
        `;

        // Add click handlers for navigating to user profiles
        container.querySelectorAll('[data-user-id]').forEach(el => {
            const userId = el.dataset.userId;
            if (userId) {
                el.style.cursor = 'pointer';
                el.addEventListener('click', () => {
                    window.location.hash = `#/user/${userId}`;
                });
            }
        });

    } catch (error) {
        console.error('Error loading game detail leaderboard:', error);
        container.innerHTML = `
            <div class="gdl-section">
                <h3 class="gdl-title">🏆 Weekly Leaderboard</h3>
                <div class="gdl-empty"><p>Failed to load leaderboard.</p></div>
            </div>
        `;
    }
}

/**
 * Render the game player page
 */
export async function renderGamePlayer(params) {
    const gameId = params.id || params;

    // Cleanup previous game runtime if exists
    if (window.currentGameRuntime) {
        // Skip session end when loading new game - no XP awarded for previous game
        window.currentGameRuntime.cleanup(false, true);
        window.currentGameRuntime = null;
    }

    const appContainer = document.getElementById('app');
    const template = document.getElementById('player-template');
    const playerContent = template.content.cloneNode(true);

    appContainer.innerHTML = '';
    appContainer.appendChild(playerContent);

    try {
        const game = await fetchGameMetadata(gameId);

        // Track game play (increment play count)
        trackGamePlay(gameId);

        // Load game in iframe
        const iframe = document.getElementById('game-iframe');
        const gameUrl = getGameResourceUrl(gameId, game.entry_point);
        iframe.src = gameUrl;

        // Set up control buttons
        setupPlayerControls(gameId, iframe);

    } catch (error) {
        appContainer.innerHTML = '<div class="error-message">Failed to load game.</div>';
        console.error('Error loading game player:', error);
    }
}

/**
 * Set up player control buttons with RuntimeShell integration
 */
function setupPlayerControls(gameId, iframe) {
   

    // Initialize RuntimeShell
    const runtime = new RuntimeShell(iframe, gameId, { debug: true });
    runtime.init();

    // Listen for game events
    runtime.on('scoreUpdate', (data) => {

    });

    runtime.on('gameOver', (data) => {

        // Optionally navigate back to game detail or show a summary
        
    });

    runtime.on('levelCompleted', (data) => {

    });

    // Handle fullscreen exit (ESC key or native exit)
    const handleFullscreenChange = () => {
        const playerContainer = document.querySelector('.player-container');
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            // User exited fullscreen, ensure iOS class is removed
            if (playerContainer && playerContainer.classList.contains('ios-fullscreen')) {
                playerContainer.classList.remove('ios-fullscreen');
                document.body.style.overflow = '';
            }
        }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Store runtime instance for cleanup
    window.currentGameRuntime = runtime;
}

/**
 * Render the about page
 */
export async function renderAbout() {
    const appContainer = document.getElementById('app');
    const template = document.getElementById('about-template');
    const aboutContent = template.content.cloneNode(true);

    appContainer.innerHTML = '';
    appContainer.appendChild(aboutContent);
    
    // Load and display version information
    try {
        const response = await fetch('/version.json');
        if (response.ok) {
            const versionData = await response.json();
            const versionEl = document.getElementById('app-version');
            const buildInfoEl = document.getElementById('app-build-info');
            
            if (versionEl) {
                versionEl.textContent = `v${versionData.version}`;
            }
            
            if (buildInfoEl && versionData.timestamp) {
                const date = new Date(versionData.timestamp);
                const formattedDate = date.toLocaleDateString('it-IT', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                buildInfoEl.textContent = `Build #${versionData.buildNumber || 'N/A'} • ${formattedDate}`;
            }
        }
    } catch (error) {

        const versionEl = document.getElementById('app-version');
        if (versionEl) {
            versionEl.textContent = 'v1.0.0';
        }
    }
}

/**
 * Render the quests page
 */
export async function renderQuests() {

    const questRenderer = new QuestRenderer();
    await questRenderer.render();
}


/**
 * Render wallet page
 */
export async function renderWallet() {
    const appContainer = document.getElementById('app');
    
    // Check if user is logged in
    if (!window.AuthManager || !window.AuthManager.isLoggedIn()) {
        appContainer.innerHTML = `
            <div class="error text-center">
                <h2>Please Log In</h2>
                <p>You need to be logged in to view your wallet.</p>
                <button class="play-game-btn" onclick="window.location.href='/auth.html'">Go to Login</button>
            </div>
        `;
        return;
    }

    appContainer.innerHTML = '<div class="loading">Loading wallet...</div>';

    try {
        const user = window.AuthManager.getUser();
        if (!user || !user.user_id) {
            throw new Error('User not found');
        }
        
        const userId = user.user_id;
        
        // Initialize CoinAPI and WalletRenderer if not already done
        if (!window.coinAPI) {
            window.coinAPI = new window.CoinAPI();
        }
        if (!window.walletRenderer) {
            window.walletRenderer = new window.WalletRenderer(window.coinAPI);
        }

        const walletHTML = await window.walletRenderer.render(userId);
        appContainer.innerHTML = walletHTML;
        
        // Initialize animations and infinite scroll after DOM is ready
        requestAnimationFrame(() => {
            if (window.walletRenderer.initAfterRender) {
                window.walletRenderer.initAfterRender();
            }
        });
    } catch (error) {
        console.error('Error rendering wallet:', error);
        appContainer.innerHTML = `
            <div class="error text-center">
                <h2>Error Loading Wallet</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render a 404 not found page
 */
export function render404() {
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `
        <div class="about text-center">
            <h2>404 - Page Not Found</h2>
            <p>The page you're looking for doesn't exist.</p>
            <button class="play-game-btn" onclick="window.location.hash = '/'">Go Home</button>
        </div>
    `;
}

/**
 * Render community page
 */
export async function renderCommunity() {
    const appContainer = document.getElementById('app');
    
    // Check if user is logged in
    if (!window.AuthManager || !window.AuthManager.isLoggedIn()) {
        appContainer.innerHTML = `
            <div class="error text-center">
                <h2>Please Log In</h2>
                <p>You need to be logged in to access the community.</p>
                <button class="play-game-btn" onclick="window.location.href='/auth.html'">Go to Login</button>
            </div>
        `;
        return;
    }

    // Load community template
    const template = document.getElementById('community-template');
    if (!template) {
        appContainer.innerHTML = `
            <div class="error text-center">
                <h2>Error</h2>
                <p>Community template not found.</p>
            </div>
        `;
        return;
    }

    // Clone and insert template
    const communityContent = template.content.cloneNode(true);
    appContainer.innerHTML = '';
    appContainer.appendChild(communityContent);

    // Initialize CommunityManager
    try {
        // Cleanup previous instance if exists
        if (window.currentCommunityManager) {
            window.currentCommunityManager.destroy();
        }
        
        window.currentCommunityManager = new window.CommunityManager({
            container: appContainer.querySelector('.community'),
            authManager: window.AuthManager
        });
        
        await window.currentCommunityManager.init();
    } catch (error) {
        console.error('Error initializing community:', error);
    }
}

/**
 * Initialize push notifications for the current user.
 * Non-blocking - runs in background without affecting page load.
 */
async function initPushNotifications() {
    try {
        // Inizializza push manager
        const initialized = await pushManager.init();
        if (!initialized) {
            console.log('Push non supportate');
            return;
        }

        // Recupera utente
        const user = window.AuthManager?.currentUser || window.AuthManager?.getUser?.();
        if (!user?.user_id) {
            console.log('Nessun utente loggato');
            return;
        }

        // Se già iscritto → aggiorna comunque la subscription sul backend
        const isSubscribed = await pushManager.isSubscribed();
        if (isSubscribed) {
            await pushManager.subscribe(user.user_id);
            console.log('Già iscritto, subscription aggiornata');
            return;
        }

        // Chiede SUBITO il permesso e registra
        const result = await pushManager.promptForSubscription(user.user_id);
        console.log('Risultato subscription:', result);

    } catch (err) {
        console.error('Errore push:', err);
    }
}
// Expose pushManager globally for settings/profile page usage
window.pushManager = pushManager;
