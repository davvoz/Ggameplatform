import { fetchGames, fetchGameMetadata, getGameResourceUrl, trackGamePlay } from './api.js';
import { QuestRenderer } from './quest.js';
import { navigateTo, initRouter } from './router.js';
import RuntimeShell from './runtimeShell.js';


// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication - use window.AuthManager defined in auth.js
    if (window.AuthManager && !window.AuthManager.isLoggedIn()) {
        // Redirect to auth page if not on auth page
        if (!window.location.pathname.includes('auth.html')) {
            console.log('No user logged in, redirecting to auth.html');
            window.location.href = '/auth.html';
            return;
        }
    }

    initRouter();

    // Cleanup game session on page unload (browser close/refresh)
    window.addEventListener('beforeunload', () => {
        if (window.currentGameRuntime) {
            // Use sendBeacon for reliable cleanup on page unload
            window.currentGameRuntime.cleanup(true);
        }
    });
});

/**
 * Render the game catalog page
 */
export async function renderCatalog(filters = {}) {
    const appContainer = document.getElementById('app');
    const template = document.getElementById('catalog-template');
    const catalogContent = template.content.cloneNode(true);

    appContainer.innerHTML = '';
    appContainer.appendChild(catalogContent);

    // Set up filter event listeners
    setupFilters();

    // Load and display games
    await loadGames(filters);
}

/**
 * Set up event listeners for filters
 */
function setupFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const featuredFilter = document.getElementById('featured-filter');

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            const filters = { category: e.target.value };
            loadGames(filters);
        });
    }

    if (featuredFilter) {
        let isFeaturedOnly = false;
        featuredFilter.addEventListener('click', () => {
            isFeaturedOnly = !isFeaturedOnly;
            featuredFilter.classList.toggle('active', isFeaturedOnly);
            const filters = isFeaturedOnly ? { featured: true } : {};
            loadGames(filters);
        });
    }
}

/**
 * Load and display games
 */
async function loadGames(filters = {}) {
    const gameGrid = document.getElementById('game-grid');

    if (!gameGrid) return;

    gameGrid.innerHTML = '<div class="loading">Loading games...</div>';

    try {
        const games = await fetchGames(filters);

        gameGrid.innerHTML = '';

        if (games.length === 0) {
            gameGrid.innerHTML = '<p class="text-center">No games found.</p>';
            return;
        }

        games.forEach(game => {
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

    // Set thumbnail
    const img = card.querySelector('.game-thumbnail img');
    const thumbnailUrl = game.thumbnail
        ? (game.thumbnail.startsWith('http') ? game.thumbnail : getGameResourceUrl(game.game_id, game.thumbnail))
        : 'https://via.placeholder.com/400x300?text=No+Image';
    img.src = thumbnailUrl;
    img.alt = game.title;

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

    } catch (error) {
        appContainer.innerHTML = '<div class="error-message">Failed to load game details.</div>';
        console.error('Error loading game detail:', error);
    }
}

/**
 * Render the game player page
 */
export async function renderGamePlayer(params) {
    const gameId = params.id || params;

    // Cleanup previous game runtime if exists
    if (window.currentGameRuntime) {
        window.currentGameRuntime.cleanup();
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

        // Exit button
        const exitBtn = document.querySelector('.exit-btn');
        exitBtn.addEventListener('click', () => {
            if (window.currentGameRuntime) {
                window.currentGameRuntime.cleanup();
                window.currentGameRuntime = null;
            }
            navigateTo(`/game/${gameId}`);
        });

    } catch (error) {
        appContainer.innerHTML = '<div class="error-message">Failed to load game.</div>';
        console.error('Error loading game player:', error);
    }
}

/**
 * Set up player control buttons with RuntimeShell integration
 */
function setupPlayerControls(gameId, iframe) {
    const pauseBtn = document.querySelector('.pause-btn');
    const resumeBtn = document.querySelector('.resume-btn');
    const fullscreenBtn = document.querySelector('.fullscreen-btn');

    // Initialize RuntimeShell
    const runtime = new RuntimeShell(iframe, gameId, { debug: true });
    runtime.init();

    // Listen for game events
    runtime.on('scoreUpdate', (data) => {
        console.log('Score updated:', data);
    });

    runtime.on('gameOver', (data) => {
        console.log('Game over:', data);
        // Session will be automatically ended by RuntimeShell
        // The game's own UI will handle the restart
    });

    runtime.on('levelCompleted', (data) => {
        console.log('Level completed:', data);
    });

    // Pause button
    pauseBtn.addEventListener('click', () => {
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'inline-block';
        runtime.pause();
    });

    // Resume button
    resumeBtn.addEventListener('click', () => {
        resumeBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';
        runtime.resume();
    });

    // Fullscreen button
    fullscreenBtn.addEventListener('click', () => {
        const playerContainer = document.querySelector('.player-container');
        if (playerContainer.requestFullscreen) {
            playerContainer.requestFullscreen();
        } else if (playerContainer.webkitRequestFullscreen) {
            playerContainer.webkitRequestFullscreen();
        } else if (playerContainer.msRequestFullscreen) {
            playerContainer.msRequestFullscreen();
        }
    });

    // Store runtime instance for cleanup
    window.currentGameRuntime = runtime;
}

/**
 * Render the about page
 */
export function renderAbout() {
    const appContainer = document.getElementById('app');
    const template = document.getElementById('about-template');
    const aboutContent = template.content.cloneNode(true);

    appContainer.innerHTML = '';
    appContainer.appendChild(aboutContent);
}

/**
 * Render the quests page
 */
let isRenderingQuests = false;

export async function renderQuests() {
    // Prevent multiple simultaneous renders
    if (isRenderingQuests) {
        console.log('renderQuests already in progress, skipping...');
        return;
    }

    isRenderingQuests = true;

    try {
        const questRenderer = new QuestRenderer();
        await questRenderer.render();
    } finally {
        isRenderingQuests = false;
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
