/**
 * Coin API Module
 * Handles all coin-related API calls
 */

class CoinAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || window.API_BASE_URL || 'http://localhost:8000';
    }

    /**
     * Get user's coin balance
     */
    async getUserBalance(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/coins/${userId}/balance`);
            if (!response.ok) throw new Error('Failed to fetch balance');
            return await response.json();
        } catch (error) {
            console.error('Error fetching user balance:', error);
            throw error;
        }
    }

    /**
     * Get user's transaction history
     */
    async getUserTransactions(userId, limit = 100) {
        try {
            const response = await fetch(`${this.baseUrl}/api/coins/${userId}/transactions?limit=${limit}`);
            if (!response.ok) throw new Error('Failed to fetch transactions');
            return await response.json();
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
        }
    }

    /**
     * Get all coin reward configurations
     */
    async getAllRewards() {
        try {
            const response = await fetch(`${this.baseUrl}/api/coins/rewards`);
            if (!response.ok) throw new Error('Failed to fetch rewards');
            return await response.json();
        } catch (error) {
            console.error('Error fetching rewards:', error);
            throw error;
        }
    }

    /**
     * Get rewards by type
     */
    async getRewardsByType(rewardType) {
        try {
            const response = await fetch(`${this.baseUrl}/api/coins/rewards/${rewardType}`);
            if (!response.ok) throw new Error('Failed to fetch rewards');
            return await response.json();
        } catch (error) {
            console.error('Error fetching rewards by type:', error);
            throw error;
        }
    }

    /**
     * Award coins to user (admin function)
     */
    async awardCoins(userId, amount, transactionType, sourceId = null, description = null) {
        try {
            const response = await fetch(`${this.baseUrl}/api/coins/${userId}/award`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount,
                    transaction_type: transactionType,
                    source_id: sourceId,
                    description,
                })
            });
            if (!response.ok) throw new Error('Failed to award coins');
            return await response.json();
        } catch (error) {
            console.error('Error awarding coins:', error);
            throw error;
        }
    }

    /**
     * Spend coins (shop purchases)
     */
    async spendCoins(userId, amount, transactionType, sourceId = null, description = null) {
        try {
            const response = await fetch(`${this.baseUrl}/api/coins/${userId}/spend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount,
                    transaction_type: transactionType,
                    source_id: sourceId,
                    description,
                })
            });
            
            if (response.status === 400) {
                const error = await response.json();
                throw new Error(error.detail || 'Insufficient balance');
            }
            
            if (!response.ok) throw new Error('Failed to spend coins');
            return await response.json();
        } catch (error) {
            console.error('Error spending coins:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoinAPI;
}

// Global export for non-module scripts
if (typeof window !== 'undefined') {
    window.CoinAPI = CoinAPI;
    console.log('✅ CoinAPI loaded and exported to window');
}
