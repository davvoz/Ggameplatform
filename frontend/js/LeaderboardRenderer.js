import { fetchGames, fetchGameLeaderboard, getGameResourceUrl } from './api.js';

/**
 * Handles leaderboard rendering and management
 */
class LeaderboardRenderer {
    constructor() {
        this.appContainer = document.getElementById('app');
    }

    /**
     * Render the leaderboard page
     */
    async render() {
        this.showLoadingState();

        try {
            const games = await fetchGames();

            if (!games || games.length === 0) {
                this.showEmptyState();
                return;
            }

            const gameLeaderboards = await this.fetchAllLeaderboards(games);
            this.renderLeaderboards(gameLeaderboards);

        } catch (error) {
            console.error('Error loading leaderboards:', error);
            this.showErrorState();
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        this.appContainer.innerHTML = `
            <div class="leaderboard">
                <div class="leaderboard-header">
                    <h2>🏆 Game Leaderboards</h2>
                    <p class="leaderboard-subtitle">Top players for each game</p>
                </div>
                <div class="loading">Loading leaderboards...</div>
            </div>
        `;
    }

    /**
     * Show empty state when no games available
     */
    showEmptyState() {
        this.appContainer.innerHTML = `
            <div class="leaderboard">
                <div class="leaderboard-header">
                    <h2>🏆 Game Leaderboards</h2>
                </div>
                <div class="leaderboard-empty">
                    <p>No games available.</p>
                </div>
            </div>
        `;
    }

    /**
     * Show error state
     */
    showErrorState() {
        this.appContainer.innerHTML = `
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

    /**
     * Fetch leaderboards for all games
     * @param {Array} games - Array of game objects
     * @returns {Promise<Array>} Array of game leaderboard data
     */
    async fetchAllLeaderboards(games) {
        return Promise.all(
            games.map(game => this.fetchGameLeaderboardData(game))
        );
    }

    /**
     * Fetch leaderboard data for a single game
     * @param {Object} game - Game object
     * @returns {Promise<Object>} Game leaderboard data
     */
    async fetchGameLeaderboardData(game) {
        try {
            const leaderboard = await fetchGameLeaderboard(game.game_id, 10);
            return {
                game,
                leaderboard: leaderboard.leaderboard || []
            };
        } catch (error) {
            console.error(`Error fetching leaderboard for ${game.game_id}:`, error);
            return {
                game,
                leaderboard: []
            };
        }
    }

    /**
     * Render all leaderboards
     * @param {Array} gameLeaderboards - Array of game leaderboard data
     */
    renderLeaderboards(gameLeaderboards) {
        const sections = gameLeaderboards
            .map(data => this.createGameLeaderboardSection(data))
            .join('');

        this.appContainer.innerHTML = `
            <div class="leaderboard">
                <div class="leaderboard-header">
                    <h2>🏆 Game Leaderboards</h2>
                    <p class="leaderboard-subtitle">Top players for each game</p>
                </div>
                <div class="game-leaderboards">
                    ${sections}
                </div>
            </div>
        `;
    }

    /**
     * Create HTML for a game leaderboard section
     * @param {Object} data - Game leaderboard data
     * @returns {string} HTML string
     */
    createGameLeaderboardSection({ game, leaderboard }) {
        const header = this.createGameHeader(game);
        const list = this.createLeaderboardList(leaderboard);

        return `
            <div class="game-leaderboard-section">
                ${header}
                ${list}
            </div>
        `;
    }

    /**
     * Create game header HTML
     * @param {Object} game - Game object
     * @returns {string} HTML string
     */
    createGameHeader(game) {
        const thumbnailUrl = this.getGameThumbnailUrl(game);

        return `
            <div class="game-leaderboard-header">
                <img src="${thumbnailUrl}" alt="${game.title}" class="game-leaderboard-thumbnail">
                <div class="game-leaderboard-info">
                    <h3>${game.title}</h3>
                    <p>${game.category || 'Uncategorized'}</p>
                </div>
            </div>
        `;
    }

    /**
     * Get game thumbnail URL
     * @param {Object} game - Game object
     * @returns {string} Thumbnail URL
     */
    getGameThumbnailUrl(game) {
        if (!game.thumbnail) {
            return 'https://via.placeholder.com/100x100?text=No+Image';
        }

        return game.thumbnail.startsWith('http')
            ? game.thumbnail
            : getGameResourceUrl(game.game_id, game.thumbnail);
    }

    /**
     * Create leaderboard list HTML
     * @param {Array} leaderboard - Leaderboard entries
     * @returns {string} HTML string
     */
    createLeaderboardList(leaderboard) {
        const content = leaderboard && leaderboard.length > 0
            ? leaderboard.map((entry, index) => this.createLeaderboardEntry(entry, index)).join('')
            : this.createEmptyLeaderboard();

        return `
            <div class="game-leaderboard-list">
                ${content}
            </div>
        `;
    }

    /**
     * Create a single leaderboard entry HTML
     * @param {Object} entry - Leaderboard entry
     * @param {number} index - Entry position
     * @returns {string} HTML string
     */
    createLeaderboardEntry(entry, index) {
        const rankClass = index < 3 ? `top-${index + 1}` : '';
        const rankDisplay = this.getRankDisplay(index);

        return `
            <div class="game-leaderboard-item ${rankClass}">
                <div class="leaderboard-rank-small">
                    ${rankDisplay}
                </div>
                <div class="leaderboard-player-name">
                    ${entry.username || 'Anonymous'}
                </div>
                <div class="leaderboard-score">
                    ${(entry.score || 0).toLocaleString()}
                </div>
            </div>
        `;
    }

    /**
     * Get rank display (medal or number)
     * @param {number} index - Position index
     * @returns {string} Rank display
     */
    getRankDisplay(index) {
        const medals = ['🥇', '🥈', '🥉'];
        return medals[index] || `#${index + 1}`;
    }

    /**
     * Create empty leaderboard message
     * @returns {string} HTML string
     */
    createEmptyLeaderboard() {
        return `
            <div class="game-leaderboard-empty">
                <p>No scores yet. Be the first to play!</p>
            </div>
        `;
    }
}
/**
 * Render the leaderboard page
 */

export async function renderLeaderboard() {
    const renderer = new LeaderboardRenderer();
    await renderer.render();
}
