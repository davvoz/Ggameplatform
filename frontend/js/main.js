import { fetchGames, fetchGameMetadata, getGameResourceUrl, trackGamePlay, getUserSessions, fetchLeaderboard, fetchGameLeaderboard } from './api.js';
import { navigateTo, initRouter } from './router.js';
import RuntimeShell from './runtimeShell.js';

/**
 * Fetch Steem user profile data
 */
async function fetchSteemProfile(username) {
    console.log('Fetching Steem profile for:', username);
    try {
        const response = await fetch('https://api.steemit.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'condenser_api.get_accounts',
                params: [[username]],
                id: 1
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Steem API response:', data);
            
            if (data.result && data.result.length > 0) {
                const account = data.result[0];
                console.log('Account data:', account);
                
                let metadata = {};
                try {
                    // Try posting_json_metadata first (newer format)
                    if (account.posting_json_metadata) {
                        metadata = JSON.parse(account.posting_json_metadata);
                    } else if (account.json_metadata) {
                        metadata = JSON.parse(account.json_metadata);
                    }
                    console.log('Parsed metadata:', metadata);
                } catch (e) {
                    console.warn('Failed to parse Steem metadata:', e);
                }
                
                const profile = {
                    profileImage: metadata.profile?.profile_image || '',
                    coverImage: metadata.profile?.cover_image || '',
                    about: metadata.profile?.about || '',
                    location: metadata.profile?.location || '',
                    website: metadata.profile?.website || ''
                };
                
                console.log('Extracted profile:', profile);
                return profile;
            }
        } else {
            console.error('Steem API error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error fetching Steem profile:', error);
    }
    return null;
}

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
    
    // Get user data from localStorage
    const cachedUser = window.AuthManager.getUser();
    
    // Fetch fresh user data from server to get game_scores_enriched
    let user = cachedUser;
    try {
        const response = await fetch(`http://localhost:8000/users/users/${cachedUser.user_id}`);
        if (response.ok) {
            const userData = await response.json();
            user = userData.user;
            console.log('Profile: dati utente aggiornati dal server:', user);
        } else {
            console.error('Failed to fetch user data:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error fetching fresh user data:', error);
    }
    
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
                xp_earned: session.xp_earned || 0,
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
    
    // Fetch Steem profile data if user has Steem account
    let steemProfile = null;
    let steemUsername = user.steemUsername || user.steem_username;
    
    // Se non c'è il campo steem, ma l'email finisce con @steem.local, estrai lo username
    if (!steemUsername && user.email && user.email.endsWith('@steem.local')) {
        steemUsername = user.email.replace('@steem.local', '');
    }
    
    // Oppure usa direttamente lo username se sembra un account Steem
    if (!steemUsername && user.username && !user.is_anonymous) {
        steemUsername = user.username;
    }
    
    if (steemUsername) {
        console.log('User has Steem account:', steemUsername);
        steemProfile = await fetchSteemProfile(steemUsername);
        console.log('Profile: Steem data fetched:', steemProfile);
    } else {
        console.log('User does not have Steem account. User object:', user);
    }
    
    // Set avatar and background
    const profileHeader = profileContent.querySelector('.profile-header');
    const avatarCircle = profileContent.querySelector('.avatar-circle');
    const avatarIcon = profileContent.querySelector('.avatar-icon');
    
    if (steemProfile && steemProfile.profileImage) {
        // Use Steem profile image
        avatarIcon.style.backgroundImage = `url(${steemProfile.profileImage})`;
        avatarIcon.style.backgroundSize = 'cover';
        avatarIcon.style.backgroundPosition = 'center';
        avatarIcon.style.width = '100%';
        avatarIcon.style.height = '100%';
        avatarIcon.textContent = ''; // Remove emoji
        avatarCircle.style.background = 'transparent';
        avatarCircle.style.border = '4px solid rgba(255, 255, 255, 0.8)';
    } else {
        // Use emoji based on user type
        let avatarEmoji = '🎮';
        if (user.is_anonymous) {
            avatarEmoji = '👤';
        } else if (steemUsername) {
            avatarEmoji = '⚡';
        }
        avatarIcon.textContent = avatarEmoji;
    }
    
    // Set header background
    if (steemProfile && steemProfile.coverImage) {
        profileHeader.style.backgroundImage = `url(${steemProfile.coverImage})`;
        profileHeader.style.backgroundSize = 'cover';
        profileHeader.style.backgroundPosition = 'center';
    }
    
    // Set username
    let displayName = '';
    if (user.is_anonymous) {
        displayName = `Guest #${user.user_id.slice(-6)}`;
    } else if (steemUsername) {
        displayName = steemUsername;
    } else {
        displayName = user.username || 'User';
    }
    profileContent.querySelector('.profile-username').textContent = displayName;
    console.log('Profile: username impostato a:', displayName);
    
    // Set user type
    let userTypeText = '🎮 Registered Player';
    if (user.is_anonymous) {
        userTypeText = '👤 Anonymous Player';
    } else if (steemUsername) {
        userTypeText = '⚡ Steem Verified Player';
    }
    profileContent.querySelector('.profile-type').textContent = userTypeText;
    
    // Set multiplier and total XP
    const multiplier = user.cur8_multiplier || 1.0;
    const totalCur8 = user.total_xp_earned || 0;
    profileContent.querySelector('.stat-value.multiplier').textContent = `${multiplier}x`;
    profileContent.querySelector('.stat-value.total-cur8').textContent = `💰 ${totalCur8.toFixed(2)} XP`;
    console.log('Profile: multiplier e XP impostati:', multiplier, totalCur8);
    
    // Usa le statistiche calcolate dalle sessioni
    profileContent.querySelector('#gamesPlayed').textContent = gamesPlayed;
    profileContent.querySelector('#totalPlayTime').textContent = totalPlayTime;
    profileContent.querySelector('#cur8Earned').textContent = `${totalCur8.toFixed(2)}`;
    
    // Set account settings
    profileContent.querySelector('#userId').textContent = `#${user.user_id.slice(-8)}`;
    
    let accountTypeText = 'Standard Account';
    if (user.is_anonymous) {
        accountTypeText = 'Anonymous (Guest)';
    } else if (steemUsername) {
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
                    <div class="activity-details">Score: ${activity.score} • XP: +${activity.xp_earned.toFixed(2)}</div>
                </div>
                <div class="activity-time">${activityDate.toLocaleDateString()} ${activityDate.toLocaleTimeString()}</div>
            `;
            activityList.appendChild(activityItem);
        });
    }
    
    // Popola i punteggi alti per gioco (questo va fatto DOPO aver aggiunto al DOM)
    console.log('Profile: checking game_scores_enriched:', user.game_scores_enriched);
    if (user.game_scores_enriched && user.game_scores_enriched.length > 0) {
        const highScoresList = document.getElementById('highScoresList');
        console.log('Profile: highScoresList element found:', highScoresList);
        highScoresList.innerHTML = '';
        
        user.game_scores_enriched.forEach(gameScore => {
            console.log('Profile: rendering game score:', gameScore);
            const highScoreItem = document.createElement('div');
            highScoreItem.className = 'high-score-item';
            
            const thumbnailHTML = gameScore.thumbnail 
                ? `<img src="${gameScore.thumbnail}" alt="${gameScore.game_title}">` 
                : '🎮';
            
            highScoreItem.innerHTML = `
                <div class="high-score-game">
                    <div class="high-score-thumbnail">${thumbnailHTML}</div>
                    <div class="high-score-game-name">${gameScore.game_title}</div>
                </div>
                <div class="high-score-value">🏆 ${gameScore.high_score.toLocaleString()}</div>
            `;
            highScoresList.appendChild(highScoreItem);
        });
    }
    
    console.log('Profile: pagina renderizzata completamente');
}

/**
 * Render the leaderboard page
 */
export async function renderLeaderboard() {
    const appContainer = document.getElementById('app');
    
    appContainer.innerHTML = `
        <div class="leaderboard">
            <div class="leaderboard-header">
                <h2>🏆 Game Leaderboards</h2>
                <p class="leaderboard-subtitle">Top players for each game</p>
            </div>
            <div class="loading">Loading leaderboards...</div>
        </div>
    `;
    
    try {
        // Fetch all games first
        const games = await fetchGames();
        console.log('Games:', games);
        
        if (!games || games.length === 0) {
            appContainer.innerHTML = `
                <div class="leaderboard">
                    <div class="leaderboard-header">
                        <h2>🏆 Game Leaderboards</h2>
                    </div>
                    <div class="leaderboard-empty">
                        <p>No games available.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Fetch leaderboard for each game
        const gameLeaderboards = await Promise.all(
            games.map(async (game) => {
                try {
                    const leaderboard = await fetchGameLeaderboard(game.game_id, 10);
                    return {
                        game: game,
                        leaderboard: leaderboard.leaderboard || []
                    };
                } catch (error) {
                    console.error(`Error fetching leaderboard for ${game.game_id}:`, error);
                    return {
                        game: game,
                        leaderboard: []
                    };
                }
            })
        );
        
        // Create leaderboard HTML
        let leaderboardHTML = `
            <div class="leaderboard">
                <div class="leaderboard-header">
                    <h2>🏆 Game Leaderboards</h2>
                    <p class="leaderboard-subtitle">Top players for each game</p>
                </div>
                <div class="game-leaderboards">
        `;
        
        gameLeaderboards.forEach(({ game, leaderboard }) => {
            const thumbnailUrl = game.thumbnail 
                ? (game.thumbnail.startsWith('http') ? game.thumbnail : getGameResourceUrl(game.game_id, game.thumbnail))
                : 'https://via.placeholder.com/100x100?text=No+Image';
            
            leaderboardHTML += `
                <div class="game-leaderboard-section">
                    <div class="game-leaderboard-header">
                        <img src="${thumbnailUrl}" alt="${game.title}" class="game-leaderboard-thumbnail">
                        <div class="game-leaderboard-info">
                            <h3>${game.title}</h3>
                            <p>${game.category || 'Uncategorized'}</p>
                        </div>
                    </div>
                    <div class="game-leaderboard-list">
            `;
            
            if (leaderboard && leaderboard.length > 0) {
                leaderboard.forEach((entry, index) => {
                    leaderboardHTML += `
                        <div class="game-leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}">
                            <div class="leaderboard-rank-small">
                                ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </div>
                            <div class="leaderboard-player-name">
                                ${entry.username || 'Anonymous'}
                            </div>
                            <div class="leaderboard-score">
                                ${(entry.score || 0).toLocaleString()}
                            </div>
                        </div>
                    `;
                });
            } else {
                leaderboardHTML += `
                    <div class="game-leaderboard-empty">
                        <p>No scores yet. Be the first to play!</p>
                    </div>
                `;
            }
            
            leaderboardHTML += `
                    </div>
                </div>
            `;
        });
        
        leaderboardHTML += `
                </div>
            </div>
        `;
        
        appContainer.innerHTML = leaderboardHTML;
        
    } catch (error) {
        console.error('Error loading leaderboards:', error);
        appContainer.innerHTML = `
            <div class="leaderboard">
                <div class="leaderboard-header">
                    <h2>🏆 Game Leaderboards</h2>
                </div>
                <div class="error-message">
                    Failed to load leaderboards. Please try again later.
                </div>
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
