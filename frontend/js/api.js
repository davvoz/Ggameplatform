// API configuration
const API_BASE_URL = 'http://localhost:8000';

/**
 * Fetch all games from the API
 * @param {Object} filters - Optional filters (category, tag, featured)
 * @returns {Promise<Array>} Array of game objects
 */
export async function fetchGames(filters = {}) {
    try {
        const params = new URLSearchParams();
        
        if (filters.category) params.append('category', filters.category);
        if (filters.tag) params.append('tag', filters.tag);
        if (filters.featured !== undefined) params.append('featured', filters.featured);
        
        const url = `${API_BASE_URL}/games/list${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.games || [];
    } catch (error) {
        console.error('Error fetching games:', error);
        throw error;
    }
}

/**
 * Fetch metadata for a specific game
 * @param {string} gameId - The game ID
 * @returns {Promise<Object>} Game metadata object
 */
export async function fetchGameMetadata(gameId) {
    try {
        const response = await fetch(`${API_BASE_URL}/games/${gameId}/metadata`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching game metadata for ${gameId}:`, error);
        throw error;
    }
}

/**
 * Register a new game
 * @param {Object} gameData - Game registration data
 * @returns {Promise<Object>} Registration response
 */
export async function registerGame(gameData) {
    try {
        const response = await fetch(`${API_BASE_URL}/games/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(gameData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error registering game:', error);
        throw error;
    }
}

/**
 * Get the full URL for a game resource
 * @param {string} gameId - The game ID
 * @param {string} path - Resource path relative to game directory
 * @returns {string} Full URL to the resource
 */
export function getGameResourceUrl(gameId, path) {
    return `${API_BASE_URL}/games/${gameId}/${path}`;
}

/**
 * Get the full URL for a static resource
 * @param {string} path - Resource path relative to static directory
 * @returns {string} Full URL to the resource
 */
export function getStaticResourceUrl(path) {
    return `${API_BASE_URL}/static/${path}`;
}

/**
 * Health check
 * @returns {Promise<Object>} Health status
 */
export async function healthCheck() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Health check failed:', error);
        throw error;
    }
}

/**
 * Track game play (increment play count)
 * @param {string} gameId - The game ID
 * @returns {Promise<Object>} Response
 */
export async function trackGamePlay(gameId) {
    try {
        const response = await fetch(`${API_BASE_URL}/games/${gameId}/play`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error tracking game play:', error);
        // Non bloccare il gioco se il tracking fallisce
        return null;
    }
}

/**
 * Get user game sessions and statistics
 * @param {string} userId - The user ID
 * @param {number} limit - Number of sessions to retrieve
 * @returns {Promise<Object>} User sessions data
 */
export async function getUserSessions(userId, limit = 50) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/sessions?limit=${limit}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching user sessions:', error);
        return { count: 0, sessions: [] };
    }
}

/**
 * Get global leaderboard
 * @param {number} limit - Number of entries to retrieve
 * @returns {Promise<Object>} Leaderboard data
 */
export async function fetchLeaderboard(limit = 50) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/leaderboard?limit=${limit}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}

export default {
    fetchGames,
    fetchGameMetadata,
    registerGame,
    getGameResourceUrl,
    getStaticResourceUrl,
    healthCheck,
    trackGamePlay,
    getUserSessions,
    fetchLeaderboard
};
