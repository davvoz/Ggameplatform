/**
 * Wallet Renderer
 * Displays user's coin balance and transaction history
 */

class WalletRenderer {
    constructor(coinAPI) {
        this.coinAPI = coinAPI;
    }

    /**
     * Render wallet page
     */
    async render(userId) {
        if (!userId) {
            return '<div class="error">Please log in to view your wallet</div>';
        }

        try {
            // Fetch data
            const [balance, transactions] = await Promise.all([
                this.coinAPI.getUserBalance(userId),
                this.coinAPI.getUserTransactions(userId, 50)
            ]);

            return `
                <div class="wallet-container">
                    <h1>💰 My Wallet</h1>
                    
                    <!-- Balance Card -->
                    <div class="balance-card">
                        <div class="balance-header">
                            <span class="coin-icon-large">🪙</span>
                            <h2>Your Balance</h2>
                        </div>
                        <div class="balance-amount">
                            ${balance.balance.toLocaleString()} <span class="coin-label">coins</span>
                        </div>
                        <div class="balance-stats">
                            <div class="stat">
                                <span class="stat-label">Total Earned</span>
                                <span class="stat-value">+${balance.total_earned.toLocaleString()}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Total Spent</span>
                                <span class="stat-value">-${balance.total_spent.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    

                    <!-- How to Earn Coins -->
                    <div class="earn-coins-section">
                        <h2>💡 How to Earn Coins</h2>
                        <div class="earn-methods">
                            <div class="earn-method">
                                <span class="earn-icon">🎯</span>
                                <h3>Complete Quests</h3>
                                <p>Earn coins by completing daily and weekly quests</p>
                            </div>
                            <div class="earn-method">
                                <span class="earn-icon">🏆</span>
                                <h3>Leaderboard Rankings</h3>
                                <p>Climb the leaderboard to earn rewards</p>
                            </div>
                            <div class="earn-method">
                                <span class="earn-icon">📈</span>
                                <h3>Level Up</h3>
                                <p>Gain coins as you level up your profile</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Transaction History -->
                    <div class="transaction-section">
                        <h2>📜 Transaction History</h2>
                        ${this.renderTransactions(transactions)}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering wallet:', error);
            return `<div class="error">Failed to load wallet data: ${error.message}</div>`;
        }
    }

    /**
     * Render transaction list
     */
    renderTransactions(transactions) {
        if (!transactions || transactions.length === 0) {
            return '<div class="no-transactions">No transactions yet. Start playing to earn coins!</div>';
        }

        return `
            <div class="transaction-list">
                ${transactions.map(tx => this.renderTransaction(tx)).join('')}
            </div>
        `;
    }

    /**
     * Render single transaction
     */
    renderTransaction(tx) {
        const isPositive = tx.amount > 0;
        const icon = this.getTransactionIcon(tx.transaction_type);
        const typeLabel = this.getTransactionTypeLabel(tx.transaction_type);
        const date = new Date(tx.created_at).toLocaleString();

        return `
            <div class="transaction-item ${isPositive ? 'positive' : 'negative'}">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <div class="transaction-type">${typeLabel}</div>
                    <div class="transaction-description">${tx.description || 'No description'}</div>
                    <div class="transaction-date">${date}</div>
                </div>
                <div class="transaction-amount ${isPositive ? 'gain' : 'loss'}">
                    ${isPositive ? '+' : ''}${tx.amount.toLocaleString()}
                    <span class="coin-icon-small">🪙</span>
                </div>
            </div>
        `;
    }

    /**
     * Get icon for transaction type
     */
    getTransactionIcon(type) {
        const icons = {
            'quest_reward': '🎯',
            'leaderboard_reward': '🏆',
            'daily_login': '📅',
            'high_score': '⭐',
            'level_up': '📈',
            'streak_bonus': '🔥',
            'shop_purchase': '🛒',
            'welcome_bonus': '🎁'
        };
        return icons[type] || '💰';
    }

    /**
     * Get label for transaction type
     */
    getTransactionTypeLabel(type) {
        const labels = {
            'quest_reward': 'Quest Reward',
            'leaderboard_reward': 'Leaderboard Reward',
            'daily_login': 'Daily Login Bonus',
            'high_score': 'High Score Bonus',
            'level_up': 'Level Up',
            'streak_bonus': 'Streak Bonus',
            'shop_purchase': 'Shop Purchase',
            'welcome_bonus': 'Welcome Bonus'
        };
        return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletRenderer;
}

// Global export for non-module scripts
if (typeof window !== 'undefined') {
    window.WalletRenderer = WalletRenderer;
    console.log('✅ WalletRenderer loaded and exported to window');
}
