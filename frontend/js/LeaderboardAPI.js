/**
 * Leaderboard API Service
 * Handles API calls for weekly and all-time leaderboards
 */

const API_URL = window.ENV?.API_URL || window.config?.API_URL || 'http://localhost:8000';

class LeaderboardAPI {
    /**
     * Get current week information with countdown
     */
    static async getWeekInfo() {
        try {
            const response = await fetch(`${API_URL}/api/leaderboard/week-info`);
            if (!response.ok) throw new Error('Failed to fetch week info');
            return await response.json();
        } catch (error) {
            console.error('Error fetching week info:', error);
            throw error;
        }
    }

    /**
     * Get weekly leaderboard (current week)
     * @param {string|null} gameId - Game ID or null for global
     * @param {number} limit - Max entries
     */
    static async getWeeklyLeaderboard(gameId = null, limit = 50) {
        try {
            const params = new URLSearchParams({ limit: limit.toString() });
            if (gameId) params.append('game_id', gameId);
            
            const response = await fetch(`${API_URL}/api/leaderboard/weekly?${params}`);
            if (!response.ok) throw new Error('Failed to fetch weekly leaderboard');
            return await response.json();
        } catch (error) {
            console.error('Error fetching weekly leaderboard:', error);
            throw error;
        }
    }

    /**
     * Get all-time leaderboard (best scores ever)
     * @param {string|null} gameId - Game ID or null for global
     * @param {number} limit - Max entries
     */
    static async getAllTimeLeaderboard(gameId = null, limit = 50) {
        try {
            const params = new URLSearchParams({ limit: limit.toString() });
            if (gameId) params.append('game_id', gameId);
            
            const response = await fetch(`${API_URL}/api/leaderboard/all-time?${params}`);
            if (!response.ok) throw new Error('Failed to fetch all-time leaderboard');
            return await response.json();
        } catch (error) {
            console.error('Error fetching all-time leaderboard:', error);
            throw error;
        }
    }

    /**
     * Update user score (updates both weekly and all-time)
     * @param {string} userId - User ID
     * @param {string} gameId - Game ID
     * @param {number} score - Score value
     */
    static async updateScore(userId, gameId, score) {
        try {
            const response = await fetch(`${API_URL}/api/leaderboard/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, game_id: gameId, score })
            });
            
            if (!response.ok) throw new Error('Failed to update score');
            return await response.json();
        } catch (error) {
            console.error('Error updating score:', error);
            throw error;
        }
    }

    /**
     * Get weekly winners history
     * @param {number} limit - Max entries
     * @param {string|null} gameId - Filter by game
     */
    static async getWinnersHistory(limit = 50, gameId = null) {
        try {
            const params = new URLSearchParams({ limit: limit.toString() });
            if (gameId) params.append('game_id', gameId);
            
            const response = await fetch(`${API_URL}/api/leaderboard/winners?${params}`);
            if (!response.ok) throw new Error('Failed to fetch winners history');
            return await response.json();
        } catch (error) {
            console.error('Error fetching winners history:', error);
            throw error;
        }
    }

    /**
     * Get rewards configuration
     * @param {string|null} gameId - Filter by game
     */
    static async getRewardsConfig(gameId = null) {
        try {
            const params = new URLSearchParams();
            if (gameId) params.append('game_id', gameId);
            
            const url = params.toString() 
                ? `${API_URL}/api/leaderboard/rewards-config?${params}`
                : `${API_URL}/api/leaderboard/rewards-config`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch rewards config');
            return await response.json();
        } catch (error) {
            console.error('Error fetching rewards config:', error);
            throw error;
        }
    }
}

// Global export
window.LeaderboardAPI = LeaderboardAPI;
