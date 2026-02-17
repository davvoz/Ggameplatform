/**
 * CommunityStatsAPI
 * REST client for community analytics endpoints.
 * Single Responsibility: Handles HTTP transport for community stats data.
 * Follows LeaderboardAPI pattern (static methods, same base URL logic).
 */

const STATS_API_URL = window.ENV?.API_URL || window.config?.API_URL || 'http://localhost:8000';

class CommunityStatsAPI {

    /**
     * Get daily game activity (sessions, players, scores per day per game).
     * @param {number} days - Number of past days (1-365, default 30)
     * @param {string|null} gameId - Optional game filter
     * @returns {Promise<Object>}
     */
    static async getGamesDailyActivity(days = 30, gameId = null) {
        try {
            const params = new URLSearchParams({ days: days.toString() });
            if (gameId) params.append('game_id', gameId);

            const response = await fetch(`${STATS_API_URL}/api/community/stats/games/daily?${params}`);
            if (!response.ok) throw new Error('Failed to fetch daily game activity');
            return await response.json();
        } catch (error) {
            console.error('[CommunityStatsAPI] Error fetching games daily:', error);
            throw error;
        }
    }

    /**
     * Get registered users ranked by XP.
     * @param {number} limit - Max users (1-200)
     * @param {number} offset - Pagination offset
     * @returns {Promise<Object>}
     */
    static async getUsersRanked(limit = 50, offset = 0) {
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });

            const response = await fetch(`${STATS_API_URL}/api/community/stats/users/ranked?${params}`);
            if (!response.ok) throw new Error('Failed to fetch ranked users');
            return await response.json();
        } catch (error) {
            console.error('[CommunityStatsAPI] Error fetching ranked users:', error);
            throw error;
        }
    }

    /**
     * Get XP and coins distributed per day.
     * @param {number} days - Number of past days
     * @param {string|null} gameId - Optional game filter
     * @returns {Promise<Object>}
     */
    static async getEconomyDaily(days = 30, gameId = null) {
        try {
            const params = new URLSearchParams({ days: days.toString() });
            if (gameId) params.append('game_id', gameId);

            const response = await fetch(`${STATS_API_URL}/api/community/stats/economy/daily?${params}`);
            if (!response.ok) throw new Error('Failed to fetch daily economy');
            return await response.json();
        } catch (error) {
            console.error('[CommunityStatsAPI] Error fetching economy daily:', error);
            throw error;
        }
    }

    /**
     * Get XP and coins distributed per week.
     * @param {number} weeks - Number of past weeks
     * @param {string|null} gameId - Optional game filter
     * @returns {Promise<Object>}
     */
    static async getEconomyWeekly(weeks = 12, gameId = null) {
        try {
            const params = new URLSearchParams({ weeks: weeks.toString() });
            if (gameId) params.append('game_id', gameId);

            const response = await fetch(`${STATS_API_URL}/api/community/stats/economy/weekly?${params}`);
            if (!response.ok) throw new Error('Failed to fetch weekly economy');
            return await response.json();
        } catch (error) {
            console.error('[CommunityStatsAPI] Error fetching economy weekly:', error);
            throw error;
        }
    }

    /**
     * Get all-time totals and per-game breakdown.
     * @param {string|null} gameId - Optional game filter
     * @returns {Promise<Object>}
     */
    static async getEconomyHistorical(gameId = null) {
        try {
            const params = new URLSearchParams();
            if (gameId) params.append('game_id', gameId);

            const url = `${STATS_API_URL}/api/community/stats/economy/historical${params.toString() ? '?' + params : ''}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch historical economy');
            return await response.json();
        } catch (error) {
            console.error('[CommunityStatsAPI] Error fetching economy historical:', error);
            throw error;
        }
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.CommunityStatsAPI = CommunityStatsAPI;
}
