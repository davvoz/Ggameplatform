import { fetchGames, fetchGameMetadata, getGameResourceUrl, getGamePreviewUrl, trackGamePlay } from './api.js';
import { SteemProfileService } from './SteemProfileService.js';
import { steemAvatarService } from './SteemAvatarService.js';
import { QuestRenderer } from './quest.js';
import { navigateTo, initRouter } from './router.js';
import RuntimeShell from './runtimeShell.obf.js';
import { pushManager } from './PushNotificationManager.js';
import CommunityManager from './CommunityManager.js';
import {
    getCurrentGameRuntime, setCurrentGameRuntime,
    getCurrentCommunityManager, setCurrentCommunityManager,
    getCoinAPI, setCoinAPI,
    getWalletRenderer, setWalletRenderer,
    setDailyLoginBanner
} from './state.js';

// Import all converted modules
import AuthManager from './auth.js';
import CoinAPI from './coinAPI.js';
import LeaderboardAPI from './LeaderboardAPI.js';
import DailyLoginBanner from './daily-login-banner.js';
import CampaignCountdown from './CampaignCountdown.js';
import { initNavMultiplier } from './nav-multiplier.js';
import WalletRenderer from './WalletRenderer.js';

// Import nav.js for side effects (registers community notification handlers)
import './nav.js';

// Initialize daily login banner and store in state
const dailyLoginBannerInstance = new DailyLoginBanner();
setDailyLoginBanner(dailyLoginBannerInstance);

// Initialize AuthManager
AuthManager.init();

// Listen for login event and update UI
globalThis.addEventListener('userLogin', () => {
    AuthManager.updateUI();
});


/**
 * Initialize UI and event listeners after authentication check
 */
function initializeAuthenticatedUI() {
    const userInfoEl = document.getElementById('userInfo');
    if (!AuthManager.currentUser || !userInfoEl) return;

    const user = AuthManager.currentUser;
    populateUserInfo(user, userInfoEl);
    setupLogoutButton();
}

/**
 * Populate navbar user information
 */
function populateUserInfo(user, userInfoEl) {
    const userNameEl = document.getElementById('userName');
    const navAvatar = document.getElementById('navAvatar');
    const navMultiplier = document.getElementById('navMultiplier');

    if (userNameEl) userNameEl.textContent = user.username || user.steemUsername || 'Player';

    if (navAvatar) {
        navAvatar.src = './icons/icon-72x72.png';
        fetchSteemAvatar(user, navAvatar);
    }

    if (navMultiplier) navMultiplier.textContent = `${(user.cur8_multiplier || 1).toFixed(2)}x`;
    userInfoEl.style.display = 'flex';
}

/**
 * Fetch and set Steem avatar if available
 */
function fetchSteemAvatar(user, navAvatar) {
    const steemService = new SteemProfileService();
    const steemUsername = user.steemUsername || user.steem_username || user.username;
    if (steemUsername) {
        steemService.fetchProfile(steemUsername)
            .then(sp => {
                if (sp?.profileImage) navAvatar.src = sp.profileImage;
            })
            .catch(() => { });
    }
}

/**
 * Set up logout button handler
 */
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AuthManager.logout();
            globalThis.location.href = '/auth.html';
        });
    }
}

/**
 * Set up daily login banner event listeners
 */
function setupDailyLoginBanner() {
    document.getElementById('daily-login-trigger')
        ?.addEventListener('click', () => dailyLoginBannerInstance.show());
    document.getElementById('daily-login-overlay')
        ?.addEventListener('click', () => dailyLoginBannerInstance.hide());

    if (AuthManager.isLoggedIn()) {
        const _dlUser = AuthManager.getUser();
        if (_dlUser?.user_id && !_dlUser.is_anonymous) {
            dailyLoginBannerInstance.init(_dlUser).catch(() => { });
        }
    }
}

/**
 * Update navbar multiplier display
 */
function updateNavMultiplier(multiplier) {
    const navMultiplierEl = document.getElementById('navMultiplier');
    if (navMultiplierEl) {
        navMultiplierEl.textContent = `${Number(multiplier).toFixed(2)}x`;
    }
}

/**
 * Handle multiplier update event
 */
function handleMultiplierUpdated(ev) {
    const updated = ev?.detail || ev;
    const navMultiplierEl = document.getElementById('navMultiplier');

    if (updated?.cur8_multiplier != null) {
        updateNavMultiplier(updated.cur8_multiplier);
        return;
    }

    if (updated?.breakdown?.final_multiplier !== undefined) {
        updateNavMultiplier(updated.breakdown.final_multiplier);
        return;
    }

    fetchMultiplierBreakdown(navMultiplierEl);
}

/**
 * Fetch multiplier breakdown from API
 */
async function fetchMultiplierBreakdown(navMultiplierEl) {
    const user = AuthManager.getUser();
    if (!user?.user_id) return;

    const API_URL = globalThis.ENV?.API_URL || globalThis.location.origin;
    
        const resp = await fetch(`${API_URL}/users/multiplier-breakdown/${user.user_id}`);
        if (!resp.ok) return;
        const json = await resp.json();
        const finalMult = json?.breakdown?.final_multiplier;
        if (navMultiplierEl && finalMult !== undefined) {
            updateNavMultiplier(finalMult);
        }
    
}

/**
 * Handle user logout event
 */
function handleUserLogout() {
    updateNavMultiplier(1);
    const trigger = document.getElementById('daily-login-trigger');
    if (trigger) trigger.style.display = 'none';
    dailyLoginBannerInstance.currentUser = null;
}

/**
 * Handle user login event
 */
function handleUserLogin() {
    const user = AuthManager.getUser();
    if (user) {
        updateNavMultiplier(user.cur8_multiplier || 1);
    }

    const _dlUser = AuthManager.getUser();
    if (!_dlUser || _dlUser.is_anonymous) {
        const trigger = document.getElementById('daily-login-trigger');
        if (trigger) trigger.style.display = 'none';
        dailyLoginBannerInstance.currentUser = null;
    } else if (_dlUser.user_id) {
        dailyLoginBannerInstance.init(_dlUser).catch(() => { });
    }
}

/**
 * Initialize all event listeners for the application
 */
function setupEventListeners() {
    globalThis.addEventListener('multiplierUpdated', handleMultiplierUpdated);
    globalThis.addEventListener('userLogin', handleUserLogin);
    globalThis.addEventListener('userLogout', handleUserLogout);

    window.addEventListener('beforeunload', () => {
        if (getCurrentGameRuntime()) {
            getCurrentGameRuntime().cleanup(true);
        }
    });
}

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initNavMultiplier();

    if (AuthManager.isLoggedIn()) {
        AuthManager.trackDailyAccess();
        initPushNotifications();
    } else if (!globalThis.location.pathname.includes('auth.html')) {
        globalThis.location.href = '/auth.html';
        return;
    }

    initRouter();
    setupDailyLoginBanner();
    initializeAuthenticatedUI();
    setupEventListeners();
});

// Current game mode filter state
let currentGameMode = 'ranked';

// Helper: unified play count accessor (prefer metadata.playCount, then session_count)
function getPlayCount(game) {
    const metaCount = game?.metadata?.playCount;
    if (typeof metaCount === 'number' && !Number.isNaN(metaCount)) return metaCount;
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

    // Load version into footer
    loadCatalogFooterVersion();
}

/**
 * Load version info into the catalog footer
 */
function loadCatalogFooterVersion() {
    const el = document.getElementById('catalogVersion');
    if (!el) return;
    fetch('/version.json')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (data?.version) {
                el.textContent = `v${data.version}`;
            }
        })
        .catch(() => { });
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
 * Handle game mode tab animation
 */
function handleGameModeTabAnimation(newMode, swipeOutClass, swipeInClass, newContent, tabsContainer) {
    const gameGrid = document.getElementById('game-grid');
    
    if (!gameGrid || !newContent) {
        currentGameMode = newMode;
        loadGames({ mode: currentGameMode });
        return;
    }

    // Start exit animation
    gameGrid.classList.add(swipeOutClass);

    // Wait for exit, then swap and enter
    setTimeout(() => {
        completeGameModeTabSwitch(newMode, swipeOutClass, swipeInClass, gameGrid, newContent);
    }, 200);
}

/**
 * Complete the game mode tab switch animation
 */
function completeGameModeTabSwitch(newMode, swipeOutClass, swipeInClass, gameGrid, newContent) {
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
            const newContent = await prepareGamesContent(newMode);

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

            // Animate with pre-loaded content
            handleGameModeTabAnimation(newMode, swipeOutClass, swipeInClass, newContent, tabsContainer);
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
        console.error('Error loading games:', error);
        gameGrid.innerHTML = '<div class="error-message">Failed to load games. Please try again later.</div>';
    }
}

/**
 * Add STEEM badge to badges container
 */
function addSteemBadge(badgesContainer) {
    if (!badgesContainer) return;
    const steemBadge = document.createElement('span');
    steemBadge.className = 'steem-rewards-badge';
    steemBadge.title = 'This game offers STEEM rewards';
    const steemImg = document.createElement('img');
    steemImg.src = './icons/steem.png';
    steemImg.alt = 'STEEM';
    steemImg.className = 'steem-rewards-icon';
    steemBadge.appendChild(steemImg);
    steemBadge.appendChild(document.createTextNode(' STEEM'));
    badgesContainer.appendChild(steemBadge);
}

/**
 * Add COIN badge for casino games to badges container
 */
function addCoinBadge(badgesContainer) {
    if (!badgesContainer) return;
    const coinBadge = document.createElement('span');
    coinBadge.className = 'coin-rewards-badge';
    coinBadge.title = 'This game offers COIN rewards';
    const coinIcon = document.createElement('span');
    coinIcon.className = 'coin-rewards-icon';
    coinIcon.textContent = '🪙';
    coinBadge.appendChild(coinIcon);
    coinBadge.appendChild(document.createTextNode(' COIN'));
    badgesContainer.appendChild(coinBadge);
}

/**
 * Add campaign badge, ribbon, banner, and styling to card
 */
function addCampaignElements(card, cardElement, game) {
    if (!game.active_campaign) return;
    
    const campaignColor = game.active_campaign.badge_color || '#ff6b00';
    
    // Badge in top-right corner
    const badgesContainer = card.querySelector('.game-badges');
    if (badgesContainer) {
        const campaignBadge = document.createElement('span');
        campaignBadge.className = 'campaign-badge';
        campaignBadge.title = `${game.active_campaign.name} — ${game.active_campaign.xp_multiplier}x XP`;
        campaignBadge.style.setProperty('--campaign-color', campaignColor);
        campaignBadge.innerHTML = `🎯 ${game.active_campaign.badge_label || 'CAMPAIGN'}`;
        badgesContainer.appendChild(campaignBadge);
    }

    // XP multiplier ribbon on thumbnail
    const thumbnailContainer = card.querySelector('.game-thumbnail');
    if (thumbnailContainer) {
        const xpRibbon = document.createElement('div');
        xpRibbon.className = 'campaign-xp-ribbon';
        xpRibbon.style.setProperty('--campaign-color', campaignColor);
        xpRibbon.innerHTML = `<span class="campaign-xp-value">×${game.active_campaign.xp_multiplier} XP</span>`;
        thumbnailContainer.appendChild(xpRibbon);
    }

    // Campaign banner: description + countdown
    const gameInfo = card.querySelector('.game-info');
    if (gameInfo) {
        const banner = document.createElement('div');
        banner.className = 'campaign-banner';
        banner.style.setProperty('--campaign-color', campaignColor);
        const description = game.active_campaign.description;
        banner.innerHTML = `<span class="campaign-banner-icon">🎯</span><span class="campaign-banner-desc">${description}</span><span class="campaign-banner-countdown" data-end="${game.active_campaign.end_date}">⏳</span>`;
        gameInfo.appendChild(banner);
        const countdownEl = banner.querySelector('.campaign-banner-countdown');
        if (countdownEl && game.active_campaign.end_date) {
            CampaignCountdown.register(countdownEl, game.active_campaign.end_date);
        }
    }

    // Add glow effect to the card
    cardElement.classList.add('campaign-active');
    cardElement.style.setProperty('--campaign-color', campaignColor);
}

/**
 * Add game tags to tags container
 */
function addGameTags(card, game) {
    if (!game.tags || game.tags.length === 0) return;
    const tagsContainer = card.querySelector('.game-tags');
    game.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
    });
}

/**
 * Set up game info text (title, description, author, category)
 */
function setGameInfo(card, game) {
    const gameTitleEl = card.querySelector('.game-title');
    gameTitleEl.textContent = game.title;
    gameTitleEl.removeAttribute('aria-label');
    card.querySelector('.game-description').textContent = game.description || 'No description available.';
    card.querySelector('.game-author').textContent = `By ${game.author || 'Unknown'}`;
    card.querySelector('.game-category').textContent = game.category || 'Uncategorized';
}

/**
 * Create a game card element
 */
function createGameCard(game) {
    const template = document.getElementById('game-card-template');
    const card = template.content.cloneNode(true);

    const cardElement = card.querySelector('.game-card');
    cardElement.dataset.gameId = game.game_id;

    // Set thumbnail
    const img = card.querySelector('.game-thumbnail img');
    const thumbnailUrl = getGamePreviewUrl(game.game_id, game.thumbnail);
    img.src = thumbnailUrl;
    img.alt = game.title;

    // Add badges
    const badgesContainer = card.querySelector('.game-badges');
    if (game.steem_rewards_enabled) {
        addSteemBadge(badgesContainer);
    }
    if (game.category && String(game.category).toLowerCase() === 'casino') {
        addCoinBadge(badgesContainer);
    }

    // Add campaign elements
    addCampaignElements(card, cardElement, game);

    // Set game info
    setGameInfo(card, game);

    // Add tags
    addGameTags(card, game);

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
        let thumbnailUrl = 'https://via.placeholder.com/400x300?text=No+Image';
        if (game.thumbnail) {
            thumbnailUrl = game.thumbnail.startsWith('http') 
                ? game.thumbnail 
                : getGameResourceUrl(gameId, game.thumbnail);
        }
        document.querySelector('.detail-thumbnail').src = thumbnailUrl;
        const detailTitleEl = document.querySelector('.detail-title');
        detailTitleEl.textContent = game.title;
        detailTitleEl.removeAttribute('aria-label');
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
        console.error('Error loading game details:', error);
        appContainer.innerHTML = '<div class="error-message">Failed to load game details.</div>';
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
        const LeaderboardAPI_instance = LeaderboardAPI;
        if (!LeaderboardAPI_instance) {
            container.style.display = 'none';
            return;
        }

        const [data, weekInfo, rewardsData] = await Promise.all([
            LeaderboardAPI_instance.getWeeklyLeaderboard(gameId, 20),
            LeaderboardAPI_instance.getWeekInfo(),
            LeaderboardAPI_instance.getRewardsConfig(gameId).catch(() => ({ rewards: [], steem_rewards_enabled: false }))
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
            let medal;
            if (entry.podiumPos === 1) {
                medal = '🥇';
            } else if (entry.podiumPos === 2) {
                medal = '🥈';
            } else {
                medal = '🥉';
            }
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
                width: 40,
                height: 40
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
                    globalThis.location.hash = `#/user/${userId}`;
                });
            }
        });

    } catch (error) {
        console.error('Error loading leaderboard:', error);
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
    if (getCurrentGameRuntime()) {
        // Skip session end when loading new game - no XP awarded for previous game
        getCurrentGameRuntime().cleanup(false, true);
        setCurrentGameRuntime(null);
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
        console.error('Error loading game:', error);
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
            if (playerContainer?.classList.contains('ios-fullscreen')) {
                playerContainer.classList.remove('ios-fullscreen');
                document.body.style.overflow = '';
            }
        }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Store runtime instance for cleanup
    setCurrentGameRuntime(runtime);
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
        console.error('Error loading version information:', error);
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
    if (!AuthManager.isLoggedIn()) {
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
        const user = AuthManager.getUser();
        if (!user?.user_id) {
            throw new Error('User not found');
        }

        const userId = user.user_id;

        // Initialize CoinAPI and WalletRenderer if not already done
        if (!getCoinAPI()) {
            setCoinAPI(new CoinAPI());
        }
        if (!getWalletRenderer()) {
            setWalletRenderer(new WalletRenderer(getCoinAPI()));
        }

        const walletHTML = await getWalletRenderer().render(userId);
        appContainer.innerHTML = walletHTML;

        // Initialize animations and infinite scroll after DOM is ready
        requestAnimationFrame(() => {
            if (getWalletRenderer().initAfterRender) {
                getWalletRenderer().initAfterRender();
            }
        });
    } catch (error) {
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
    if (!AuthManager.isLoggedIn()) {
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
  
        // Cleanup previous instance if exists
        if (getCurrentCommunityManager()) {
            getCurrentCommunityManager().destroy();
        }

        setCurrentCommunityManager(new CommunityManager({
            container: appContainer.querySelector('.community'),
            authManager: AuthManager
        }));

        await getCurrentCommunityManager().init();
    
}

/**
 * Initialize push notifications for the current user.
 * Non-blocking - runs in background without affecting page load.
 */
async function initPushNotifications() {
   
        // Inizializza push manager
        const initialized = await pushManager.init();
        if (!initialized) {
            return;
        }

        // Recupera utente
        const user = AuthManager.currentUser || AuthManager.getUser();
        if (!user?.user_id) {
            return;
        }

        // Se già iscritto → aggiorna comunque la subscription sul backend
        const isSubscribed = await pushManager.isSubscribed();
        if (isSubscribed) {
            await pushManager.subscribe(user.user_id);
            return;
        }

        // Chiede SUBITO il permesso e registra
        await pushManager.promptForSubscription(user.user_id);


}
