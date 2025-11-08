import { fetchGames, fetchGameMetadata, getGameResourceUrl, trackGamePlay, getUserSessions } from './api.js';
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
        
        // Set player title
        document.querySelector('.player-title').textContent = game.title;
        
        // Load game in iframe
        const iframe = document.getElementById('game-iframe');
        const gameUrl = getGameResourceUrl(gameId, game.entry_point);
        iframe.src = gameUrl;
        
        // Set up control buttons
        setupPlayerControls(gameId, iframe);
        
        // Exit button
        const exitBtn = document.querySelector('.exit-btn');
        exitBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to exit this game?')) {
                // Cleanup game runtime before navigation
                if (window.currentGameRuntime) {
                    window.currentGameRuntime.cleanup();
                    window.currentGameRuntime = null;
                }
                navigateTo(`/game/${gameId}`);
            }
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
        
        // Optionally show a "Play Again" dialog after a delay
        setTimeout(() => {
            if (confirm('Game Over! Play again?')) {
                // Reload the game
                window.location.reload();
            } else {
                // Go back to game details
                navigateTo(`/game/${gameId}`);
            }
        }, 2000);
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
 * Render the profile page
 */
export async function renderProfile() {
    const appContainer = document.getElementById('app');
    
    // Check if user is logged in
    if (!window.AuthManager || !window.AuthManager.isLoggedIn()) {
        appContainer.innerHTML = `
            <div class="about text-center">
                <h2>🔒 Login Required</h2>
                <p>You need to be logged in to view your profile.</p>
                <button class="play-game-btn" onclick="window.location.hash = '/'">Go to Games</button>
            </div>
        `;
        return;
    }
    
    // Get user data
    const user = window.AuthManager.getUser();
    console.log('Profile: dati utente completi:', user);
    
    // Carica le sessioni di gioco per calcolare le statistiche
    const sessionsData = await getUserSessions(user.user_id);
    console.log('Profile: sessioni caricate:', sessionsData);
    
    // Calcola statistiche dalle sessioni
    const sessions = sessionsData.sessions || [];
    const gamesPlayed = sessions.length;
    
    // Calcola tempo totale di gioco (in secondi, poi converti in ore)
    let totalPlayTimeSeconds = 0;
    let highScore = 0;
    const recentActivity = [];
    
    sessions.forEach(session => {
        // Calcola durata della sessione
        if (session.ended_at && session.started_at) {
            const start = new Date(session.started_at);
            const end = new Date(session.ended_at);
            const durationSeconds = (end - start) / 1000;
            totalPlayTimeSeconds += durationSeconds;
        }
        
        // Trova il punteggio più alto
        const sessionScore = session.final_score || session.score || 0;
        if (sessionScore > highScore) {
            highScore = sessionScore;
        }
        
        // Aggiungi alle attività recenti (max 10)
        if (recentActivity.length < 10) {
            recentActivity.push({
                game_name: session.game_id || 'Unknown Game',
                score: sessionScore,
                cur8_earned: session.cur8_earned || 0,
                timestamp: session.ended_at || session.started_at
            });
        }
    });
    
    // Converti secondi in ore e minuti
    const totalHours = Math.floor(totalPlayTimeSeconds / 3600);
    const totalMinutes = Math.floor((totalPlayTimeSeconds % 3600) / 60);
    const totalPlayTime = totalHours > 0 
        ? `${totalHours}h ${totalMinutes}m` 
        : `${totalMinutes}m`;
    
    console.log('Profile: statistiche calcolate -', {
        gamesPlayed,
        totalPlayTime,
        highScore,
        recentActivityCount: recentActivity.length
    });
    
    const template = document.getElementById('profile-template');
    const profileContent = template.content.cloneNode(true);
    
    // IMPORTANTE: Popola i dati NEL clone PRIMA di aggiungerlo al DOM
    
    // Set avatar icon based on user type
    let avatarEmoji = '🎮';
    if (user.is_anonymous) {
        avatarEmoji = '👤';
    } else if (user.steemUsername) {
        avatarEmoji = '⚡';
    }
    profileContent.querySelector('.avatar-icon').textContent = avatarEmoji;
    
    // Set username
    let displayName = '';
    if (user.is_anonymous) {
        displayName = `Guest #${user.user_id.slice(-6)}`;
    } else if (user.steemUsername) {
        displayName = user.steemUsername;
    } else {
        displayName = user.username || 'User';
    }
    profileContent.querySelector('.profile-username').textContent = displayName;
    console.log('Profile: username impostato a:', displayName);
    
    // Set user type
    let userTypeText = '🎮 Registered Player';
    if (user.is_anonymous) {
        userTypeText = '👤 Anonymous Player';
    } else if (user.steemUsername) {
        userTypeText = '⚡ Steem Verified Player';
    }
    profileContent.querySelector('.profile-type').textContent = userTypeText;
    
    // Set multiplier and total CUR8
    const multiplier = user.cur8_multiplier || 1.0;
    const totalCur8 = user.total_cur8_earned || 0;
    profileContent.querySelector('.stat-value.multiplier').textContent = `${multiplier}x`;
    profileContent.querySelector('.stat-value.total-cur8').textContent = `💰 ${totalCur8.toFixed(2)} CUR8`;
    console.log('Profile: multiplier e CUR8 impostati:', multiplier, totalCur8);
    
    // Usa le statistiche calcolate dalle sessioni
    profileContent.querySelector('#gamesPlayed').textContent = gamesPlayed;
    profileContent.querySelector('#totalPlayTime').textContent = totalPlayTime;
    profileContent.querySelector('#highScore').textContent = highScore;
    profileContent.querySelector('#cur8Earned').textContent = `${totalCur8.toFixed(2)}`;
    
    // Set account settings
    profileContent.querySelector('#userId').textContent = `#${user.user_id.slice(-8)}`;
    
    let accountTypeText = 'Standard Account';
    if (user.is_anonymous) {
        accountTypeText = 'Anonymous (Guest)';
    } else if (user.steemUsername) {
        accountTypeText = 'Steem Keychain';
    }
    profileContent.querySelector('#accountType').textContent = accountTypeText;
    
    // Member since
    const createdDate = user.created_at ? new Date(user.created_at) : new Date();
    profileContent.querySelector('#memberSince').textContent = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // ORA aggiungi il contenuto popolato al DOM
    appContainer.innerHTML = '';
    appContainer.appendChild(profileContent);
    
    // Popola le attività recenti (questo va fatto DOPO aver aggiunto al DOM)
    if (recentActivity && recentActivity.length > 0) {
        const activityList = document.getElementById('recentActivity');
        activityList.innerHTML = '';
        
        recentActivity.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            const activityDate = new Date(activity.timestamp);
            activityItem.innerHTML = `
                <div>
                    <div class="activity-game">${activity.game_name}</div>
                    <div class="activity-details">Score: ${activity.score} • CUR8: +${activity.cur8_earned.toFixed(2)}</div>
                </div>
                <div class="activity-time">${activityDate.toLocaleDateString()} ${activityDate.toLocaleTimeString()}</div>
            `;
            activityList.appendChild(activityItem);
        });
    }
    
    console.log('Profile: pagina renderizzata completamente');
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
